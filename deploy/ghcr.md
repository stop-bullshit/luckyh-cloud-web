# 前端镜像发布到 GHCR

镜像地址为 `ghcr.io/stop-bullshit/luckyh-cloud-web`。仓库当前默认分支是 `codex/luckyh-cloud-web`；更新默认分支、推送 `v*` 标签或在默认分支手工运行镜像发布工作流时，先执行检查，再构建并推送镜像。Pull Request 只检查和构建，不发布。

每次发布有 `sha-<完整提交 SHA>` 标签，Git 标签发布还有相同的 `v*` 标签。K8S 部署使用确定版本或镜像 digest，回滚时恢复之前的镜像引用。

工作流使用自动生成的 `GITHUB_TOKEN` 推送，不需要为发布另建个人 Token。新镜像保持 GHCR 默认私有；若保持私有，集群使用有 `read:packages` 权限的 classic PAT，并配置 `imagePullSecrets`。Secret 必须与应用处于同一个 namespace。详见后端仓库的 `support/docs/ghcr.md`。

## 构建和运行

前端的 Node 构建阶段产生 `dist/`，最终镜像只提供 Nginx 与静态文件。私人 `.env.local`、本地凭据和生成目录不进入构建上下文。

```powershell
docker build -t luckyh-cloud-web:local .
docker run --rm -p 8000:80 -e GATEWAY_UPSTREAM=http://host.docker.internal:8080 luckyh-cloud-web:local
```

`GATEWAY_UPSTREAM` 在容器启动时设置，不需要为了不同网关地址重新构建镜像。本机 Docker Desktop 的默认值为 `http://host.docker.internal:8080`；K8S 中改为实际网关 Service 地址，例如：

```yaml
env:
  - name: GATEWAY_UPSTREAM
    value: http://luckyh-gateway-service:8080
imagePullSecrets:
  - name: ghcr-pull
```

网关与前端需在同一个 namespace，或使用网关 Service 的完整集群 DNS。Nginx 保留 `/api` 路径，由现有网关路由处理；其他前端路径回退到 `index.html`，支持刷新页面。

如果改由 Ingress 将 `/api` 直接转发到网关，应保持请求路径，并同步配置与订单事务相适配的上游超时；开发环境的 `API_TARGET` 不负责生产镜像代理。

## 发布结果检查

1. 在 GitHub Actions 中检查类型检查、测试、静态构建及镜像推送结果。
2. 在账号 Packages 页面检查镜像、SHA 标签和读取权限。
3. 部署时设置 `GATEWAY_UPSTREAM` 和拉取 Secret，再验证首页、直接刷新 `/business/orders`、登录及订单操作。

默认分支的镜像发布成功后，工作流会更新 `deploy/k8s/web.yaml` 中的 SHA 镜像标签；Fleet 同步该目录并滚动更新应用。发布标签不触发这一步。

## 静态资源加载检查

Nginx 对超过 1KB 的 JS/CSS 开启 gzip。带 8 位内容 hash 的 JS/CSS 缓存一年，并设置 `immutable`；HTML 和未带 hash 的资源使用 `no-cache`，允许浏览器保存但每次使用前重新校验。不存在的 hash 资源返回 404，页面路由仍回退到 HTML，`/api/` 保持原有网关代理。

部署后，从首页取得实际 JS/CSS 文件名并检查：

```powershell
curl.exe -I -H 'Accept-Encoding: gzip' 'http://cloud.home/<带hash的实际文件名>.js'
curl.exe -I 'http://cloud.home/'
curl.exe -I 'http://cloud.home/business/orders'
```

JS/CSS 应返回 `Content-Encoding: gzip`、`Vary: Accept-Encoding` 和 `Cache-Control: public, max-age=31536000, immutable`；页面应返回 `Cache-Control: no-cache`。比较下载大小时用 GET，单独检查 HEAD 不会测出实际传输字节数。
