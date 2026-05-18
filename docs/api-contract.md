# API Contract And Separation Boundary

本文档记录当前 Commerce OS 的接口契约边界。目标是让表现层和业务数据层清晰分离，同时保留 Next.js SSR / BFF 便利性。

## 1. 当前结论

```text
Canonical API:
- apps/api NestJS modular monolith
- Runtime prefix: /api
- OpenAPI UI: /api/docs
- OpenAPI JSON: /api/docs-json

Presentation layers:
- apps/storefront
- apps/admin

BFF/proxy adapters:
- apps/storefront/src/app/api/*
- apps/admin/src/app/api/*
```

解释：

```text
- 业务事实、事务、幂等、状态机、库存扣减、审计和 RBAC Scope 归 apps/api。
- Storefront / Admin 可以有 Next route handlers，但它们只能作为同源代理、体验编排或前端适配层。
- Next route handlers 不应成为订单、支付、库存、售后等业务事实来源。
- 页面组件不直接访问数据库，不直接拼接业务 SQL。
```

## 2. RESTful 命名规则

```text
GET    /api/resources
GET    /api/resources/:id
POST   /api/resources
PATCH  /api/resources/:id
DELETE /api/resources/:id
```

对于非 CRUD 的领域命令：

```text
POST /api/admin/operations/process-pending-commerce
POST /api/payments/webhooks/:channel
POST /api/admin/fulfillments/:fulfillmentOrderId/ship
POST /api/admin/shipments/:shipmentId/deliver
```

规则：

```text
- 可以保留领域命令动词，但必须是显式业务动作。
- 高风险动作必须走 apps/api，不能只在 Next BFF 内完成。
- POST / PATCH / DELETE 必须保留幂等、审计或状态机约束。
- 列表接口必须支持分页参数，并逐步把 UI-side filter 下沉到 API query。
```

## 3. 接口可管理化入口

本地启动 API 后：

```text
http://127.0.0.1:4000/api/docs
http://127.0.0.1:4000/api/docs-json
```

统一后台入口：

```text
http://127.0.0.1:3001/api-catalog
```

后台 API Catalog 页面展示：

```text
- API_BASE_URL
- Swagger UI 链接
- OpenAPI JSON 链接
- Storefront / Admin / Webhook / System 核心 REST 端点清单
- Presentation / Data Boundary 说明
```

## 4. 前后端分离约束

Storefront：

```text
- 从域名解析 Site Context。
- 不信任前端传入 site_id。
- 通过 API/BFF 读取商品、购物车、订单、支付结果、售后和 Site Customer。
```

Unified Admin：

```text
- 通过 Admin REST API 读取列表和详情。
- 列表/详情必须携带或推导 Admin Scope。
- 后台搜索条件必须保留 scopeType / scopeId / siteId。
- 高风险写操作必须经 apps/api 记录审计。
```

Next BFF：

```text
- 只做同源代理、header 透传、site-domain 注入和 UI 请求适配。
- 不持有业务状态机。
- 不直接绕过 API 写核心业务表。
```

## 5. 后台搜索表格组件化规则

参考 `/Users/julian/fameex-web/apps/security-admin` 的模式：

```text
SearchForm:
- 只负责查询条件、重置和触发查询。

SearchTable / PageSearchTable:
- 只负责 columns、rows、loading、pagination 和 row render。

Request layer:
- 负责把 search fields + pagination 转成 API query。
```

当前项目的 server-rendered 适配：

```text
AdminQueryPanel:
- 负责 GET 查询表单。

AdminResourceTable:
- 负责统一表头、列定义、空状态、横向滚动和分页插槽。

AdminPagination:
- 负责分页 URL 和 page size。
```

后续如果引入 React Query：

```text
- 可以增加 client-side PageSearchTable，但不能替代 apps/api 的 REST contract。
- React Query 只缓存 API 结果，不成为业务状态来源。
```
