# 项目变更日志 (AI Copilot 辅助开发)

---

### [CHANGE-更新: 静态资源压缩缓存-20261007-1626-01]

| 字段 | 内容 |
| --- | --- |
| **日期** | 2026-10-07（北京时间） |
| **模块** | 前端 Nginx 部署 |
| **触发需求** | 部署页面的约 1640KB JS 未压缩，下载耗时约 6.5 秒；用户要求调整并部署 |
| **业务规则** | 本次加载性能需求，无 Jira 编号；仅调整静态资源响应策略 |
| **场景覆盖** | 支持 gzip 的客户端、无压缩客户端、hash JS/CSS 缓存、HTML 重新校验、页面路由刷新、缺失 hash 资源 404、API 网关代理 |

**变更文件清单：**

| 文件路径 | 操作 | 变更说明 |
| --- | --- | --- |
| `deploy/nginx.conf` | 更新 | JS/CSS gzip；hash 文件缓存一年；HTML 和未带 hash 的资源重新校验；API 优先匹配 |
| `deploy/ghcr.md` | 更新 | 说明现有 GitOps 自动部署流程及响应头验证方法 |
| `docs/static-resource-performance-change-log.md` | 新增 | 记录本次修改及验证要点 |

**未改动模块（保护边界）：**

- 前端页面、路由拆包、鉴权接口及后端业务逻辑。
- 现有镜像构建、GitOps 更新和 Fleet 滚动部署流程。

**风险与回滚：**

- gzip 增加压缩 CPU 开销；仅内容 hash 不变的 JS/CSS 长期缓存，HTML 每次重新校验。
- 回滚时恢复前一个 SHA 镜像标签，由 Fleet 滚动更新。

**验证方式：**

- 已在实际 Nginx 上通过配置语法和候选响应检查：JS/CSS gzip、identity 响应、hash 缓存、HTML 及页面路由重新校验、缺失 hash 文件 404。API 校验和带 hash 后缀的 API 路径与现有服务器均返回 401，保持网关代理。
- 已通过 `npm run lint -- -- --preserveSymlinks` 和 `npm exec --no -- antd lint ./src`；隔离工作目录复用现有依赖目录，TypeScript 使用 `preserveSymlinks` 解决依赖目录链接的类型路径问题。没有修改编译配置。
- 发布工作流将执行普通 lint、测试、静态构建及镜像 Nginx 检查；部署后核对新镜像 SHA、rollout 状态及线上压缩、缓存响应头和实际下载大小。
