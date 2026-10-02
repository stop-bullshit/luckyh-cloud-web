# LuckyH Cloud Web

基于 [Ant Design Pro 官方脚手架](https://github.com/ant-design/ant-design-pro)，保留登录页、布局、蓝色主题、Logo、国际化和主题设置；示例页面已通过 `npm run simple` 精简。

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

精简版保留欢迎页、管理页和查询表格，并恢复 **业务管理**：

| 页面 | 功能 | 网关接口 |
| --- | --- | --- |
| `/business/users` | 登录用户分页、新建、编辑、详情和删除 | `/api/auth/users` |
| `/business/orders` | 分页、按用户查询、新建、详情、支付、取消 | `/api/order/orders` |
| `/business/products` | 名称搜索、分页、新增、编辑名称价格、补货 | `/api/inventory/inventory` |
| `/business/inventory` | 按名称选择商品，查询最新库存与价格 | `/api/inventory/inventory/{productId}` |
| `/business/accounts` | 选择登录用户查询、充值和扣减余额 | `/api/auth/users`、`/api/account/accounts/{userId}` |
| `/business/transactions` | 购买提交、主动回滚演示、查看事务配置 | `/api/order/orders/purchase`、`/api/order/seata-demo/*` |

登录账号对应后端 `sys_user`，“用户管理”、订单、购买事务和“余额管理”都以该表为用户来源，因此登录使用的 `admin` 会出现在所有用户选择位置。订单仅待支付状态提供支付和取消操作；当前后端没有订单编辑、删除接口。所有商品选择都来自库存服务：新增时自动生成编号、初始库存为 0，通过“补货”增加库存；新建订单由后端根据商品 ID 查询名称和单价，不接收前端自填价格。

保留的示例页面使用脚手架自带 Mock，仅用于展示组件；业务管理、登录和退出调用真实后端。手机号验证码登录入口仍会提示使用账户密码登录。余额管理从真实登录用户中选择账户并执行充值或扣减；库存和余额扣减也可由订单购买事务发起。主动回滚演示的响应只表示已触发，最终结果需核对订单、库存、余额和协调器状态。

已有后端库存表需执行 `luckyh-cloud/support/sql/04-product-management.sql` 并更新库存服务，才能使用自动编号新增商品；新建数据库使用新版 `03-distributed-demo.sql`。

后端分页已在用户、订单服务各增加 MyBatis Plus MySQL 分页拦截器；已有服务需要重启后生效。当前后端仍属于 demo，业务接口只验证登录态，尚未实现完整的角色权限和订单归属限制；用户资料的已有联系方式清空规则仍沿用后端行为。

## 验证与构建

```powershell
npm run lint
npm test -- src/utils/session.test.ts src/requestErrorConfig.test.ts
npm run build
```

`dist/` 为生产构建产物。生产环境配置 `/api/` 反向代理到网关，并为前端路由提供 `index.html` 回退；参考 `deploy/nginx.conf`。容器启动时通过 `GATEWAY_UPSTREAM` 设置网关，默认 `http://host.docker.internal:8080` 适用于本机 Docker Desktop；K8S 使用实际网关 Service 地址。生产环境不提供原版示例 Mock。

可选本机构建镜像：`docker build -t luckyh-cloud-web .`，运行：`docker run --rm -p 8000:80 luckyh-cloud-web`（先停止开发服务，释放 8000 端口）。

GitHub Actions 构建和 GHCR 发布、镜像版本及 K8S 拉取方式见 [镜像发布说明](deploy/ghcr.md)。

## 结构

- `config/`：原版配置、菜单路由、网关代理。
- `src/pages/Users`、`src/pages/Orders`：真实业务页面。
- `src/services/luckyh`：请求类型与后端接口。
- `src/utils/session.ts`：登录令牌存取。
- `src/requestErrorConfig.ts`：兼容后端 `{code,message,data}` 与原版示例响应，处理业务失败和 401。

脚手架来源提交：`24de7e34b8f035553cbe82639ee86292df71b14a`，版本 Ant Design Pro 6.0.3，React 19 + TypeScript + Umi Max 4 + Ant Design 6。保留原版组件实现，未执行自定义视觉改版。
