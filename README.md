# LuckyH Cloud Web

基于 [Ant Design Pro 官方脚手架](https://github.com/ant-design/ant-design-pro)，保留原版登录页、布局、蓝色主题、Logo、国际化、主题设置和完整示例页面。

项目目录：`D:\project\demo\luckyh-cloud-web`。

## 启动

Node.js 22 及以上；当前机器使用 Node.js 24、npm 11。首次启动：

```powershell
cd D:\project\demo\luckyh-cloud-web
npm ci
npm start
```

也可双击 `start-web.bat`。访问 **http://localhost:8000/**。停止前端时在启动终端按 `Ctrl+C`。

后端网关默认 `http://127.0.0.1:8080`；开发代理位于 `config/proxy.ts`。换地址时将 `.env.example` 复制为 `.env.local` 后修改 `API_TARGET`，再重启前端。前端仅访问网关，不直接连接 Nacos、数据库或 Redis。

演示账号：`admin`，密码：`123456`。原版登录表单已接入 `/api/auth/login`；登录后请求自动携带 Bearer 令牌，刷新页面通过 `/api/auth/validate` 验证身份，退出调用 `/api/auth/logout` 并清除本地令牌。勾选“自动登录”时在本机保存访问令牌；未勾选时仅保留在当前浏览器标签会话内。

## 页面与接口

保留原版 Dashboard、表单、列表、详情、结果、异常、个人页与 AI 助手示例菜单。新增 **业务管理**：

| 页面 | 功能 | 网关接口 |
| --- | --- | --- |
| `/business/users` | 查询、分页、新建、编辑、详情、删除、查看关联订单 | `/api/user/users` |
| `/business/orders` | 分页、按用户查询、新建、详情、支付、取消 | `/api/order/orders` |
| `/user/register` | 注册普通登录账号 | `/api/auth/register` |

登录账号对应后端 `sys_user`，业务用户对应 `user`，两者独立。订单仅待支付状态提供支付和取消操作；当前后端没有订单编辑、删除和商品目录接口。

原版示例页面使用脚手架自带 Mock，仅用于展示组件和模板；业务管理、登录、注册、退出全部调用真实后端。原版手机号验证码登录入口保留，当前后端未提供该能力，页面会提示使用账户密码登录。注册固定普通用户类型 `2`，无需验证码。

后端分页已在用户、订单服务各增加 MyBatis Plus MySQL 分页拦截器；已有服务需要重启后生效。当前后端仍属于 demo，业务接口只验证登录态，尚未实现完整的角色权限和订单归属限制；用户资料的已有联系方式清空规则仍沿用后端行为。

## 验证与构建

```powershell
npm run lint
npm test -- src/utils/session.test.ts src/requestErrorConfig.test.ts
npm run build
```

`dist/` 为生产构建产物。生产环境配置 `/api/` 反向代理到网关，并为前端路由提供 `index.html` 回退；参考 `deploy/nginx.conf`。其中 `host.docker.internal:8080` 适用于本机 Docker Desktop，其他服务器应改成实际网关地址。生产环境不提供原版示例 Mock。

可选本机构建镜像：`docker build -t luckyh-cloud-web .`，运行：`docker run --rm -p 8000:80 luckyh-cloud-web`（先停止开发服务，释放 8000 端口）。

## 结构

- `config/`：原版配置、菜单路由、网关代理。
- `src/pages/Users`、`src/pages/Orders`：真实业务页面。
- `src/services/luckyh`：请求类型与后端接口。
- `src/utils/session.ts`：登录令牌存取。
- `src/requestErrorConfig.ts`：兼容后端 `{code,message,data}` 与原版示例响应，处理业务失败和 401。

脚手架来源提交：`24de7e34b8f035553cbe82639ee86292df71b14a`，版本 Ant Design Pro 6.0.3，React 19 + TypeScript + Umi Max 4 + Ant Design 6。保留原版组件实现，未执行自定义视觉改版。
