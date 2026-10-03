import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

function updateImage(contents, sha) {
  assert.match(sha, /^[a-f0-9]{40}$/, 'Expected a full commit SHA');
  const image = 'ghcr.io/stop-bullshit/luckyh-cloud-web';
  const pattern = /^(\s*image:\s*)ghcr\.io\/stop-bullshit\/luckyh-cloud-web:sha-[a-f0-9]{40}(?=\s*$)/gm;
  assert.equal([...contents.matchAll(pattern)].length, 1, 'Expected exactly one web image');
  return contents.replace(pattern, `$1${image}:sha-${sha}`);
}

if (process.argv[2] === '--self-test') {
  const oldSha = 'a'.repeat(40);
  const newSha = 'b'.repeat(40);
  const manifest = `spec:\n  image: ghcr.io/stop-bullshit/luckyh-cloud-web:sha-${oldSha}\n  replicas: 1\n`;
  assert.equal(updateImage(manifest, newSha), manifest.replace(oldSha, newSha));
  assert.equal(updateImage(manifest, oldSha), manifest);
  assert.throws(() => updateImage(manifest, 'invalid'));
  assert.throws(() => updateImage('spec: {}\n', newSha));
  assert.throws(() => updateImage(manifest + manifest, newSha));
  console.log('GitOps image checks passed');
} else {
  const path = 'deploy/k8s/web.yaml';
  writeFileSync(path, updateImage(readFileSync(path, 'utf8'), process.argv[2]));
}
