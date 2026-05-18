# Commerce OS Runbook

本文档记录当前本地运行、验证、交易链路 smoke 和故障排查步骤。

## 1. 环境变量

本地 PostgreSQL 默认连接：

```bash
export DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store
export API_BASE_URL=http://127.0.0.1:4000
```

端口约定：

```text
API:        4000
Storefront: 3000
Admin:      3001
PostgreSQL: 5432
```

## 2. 数据库准备

检查 PostgreSQL：

```bash
/usr/local/opt/postgresql@16/bin/pg_isready -h localhost -p 5432
```

运行 migration 和 demo seed：

```bash
export DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store
pnpm db:migrate
pnpm db:seed:demo
pnpm db:validate
```

Demo seed 固定数据：

```text
siteId:      00000000-0000-4000-8000-000000000301
verticalId:  00000000-0000-4000-8000-000000000101
brandId:     00000000-0000-4000-8000-000000000201
productId:   00000000-0000-4000-8000-000000001002
skuId:       00000000-0000-4000-8000-000000001003
warehouseId: 00000000-0000-4000-8000-000000001004
currency:    USD
```

## 3. 启动三端

终端 1：

```bash
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store API_PORT=4000 pnpm --filter @cross-border/api dev
```

终端 2：

```bash
API_BASE_URL=http://127.0.0.1:4000 NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000 PORT=3000 pnpm --filter @cross-border/storefront dev
```

终端 3：

```bash
API_BASE_URL=http://127.0.0.1:4000 NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000 PORT=3001 pnpm --filter @cross-border/admin dev
```

访问地址：

```text
http://localhost:3000
http://localhost:3000/products
http://localhost:3000/products/00000000-0000-4000-8000-000000001002
http://localhost:3000/cart
http://localhost:3000/checkout
http://localhost:3000/payment-result
http://localhost:3000/orders
http://localhost:3000/orders/ORDER_ID
http://localhost:3000/account
http://localhost:3001
http://localhost:3001/verticals
http://localhost:3001/brands
http://localhost:3001/sites
http://localhost:3001/domains
http://localhost:3001/site-config
http://localhost:3001/api-catalog
http://localhost:3001/orders
http://localhost:3001/orders/ORDER_ID
http://localhost:3001/payments
http://localhost:3001/inventory
http://localhost:3001/fulfillment
http://localhost:3001/customers
http://localhost:3001/products
http://localhost:3001/products/00000000-0000-4000-8000-000000001002
http://localhost:3001/product-attributes
http://localhost:4000/api/health
```

如果端口被占用：

```bash
for port in 3000 3001 4000; do lsof -tiTCP:$port -sTCP:LISTEN | xargs -r kill; done
```

## 4. 标准验证命令

每个可交付切片至少运行：

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm db:validate
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store pnpm e2e:commerce
pnpm build
git diff --check
```

后台导航和多语言 smoke：

```text
1. 打开 http://localhost:3001
2. 确认左侧菜单没有 `#...` 锚点链接，Site Management 菜单进入 `/verticals`、`/brands`、`/sites`、`/domains`、`/site-config`
3. 页面向下滚动时，桌面视口左侧菜单保持固定
4. 点击左侧多个菜单和订单/商品/售后详情页，确认顶部 Admin Work Tabs 记录打开历史，Dashboard 标签不可关闭，其余标签可关闭
5. 确认 active Admin Work Tab 有清晰背景、顶部强调线、图标和关闭按钮；非 active tab 与 active tab 可明显区分
6. 在同一列表页切换 scope/filter/query，确认顶部不会出现重复工作标签；详情页按具体业务对象路径保留独立标签
7. 刷新后确认工作标签页通过 `commerce.admin.workTabs` localStorage 恢复
8. 确认主工作区为全宽弹性布局，没有居中的 `max-width` 页面容器；旧页面表格、表单和卡片也套用统一 Ant Design 风格
9. 抽检 `/products`，确认商品/启用/SKU/可售等指标卡 icon 与标题对齐，站点/数据范围/状态筛选为紧凑分组，分类管理表单不会在宽屏下被横向拉散
10. 抽检 `/products/PRODUCT_ID`、`/product-attributes`、`/orders/ORDER_ID`、`/after-sales/REQUEST_ID`、`/payments`、`/rbac`、`/audit`，确认可见按钮、输入框、搜索框、下拉、复选框、提示、统计卡和结果表优先使用 Ant Design 组件；服务端表格页至少继承统一背景、字体颜色、focus ring、icon/文字对齐和表头样式
11. 抽检列表搜索和分页：`/orders` 用订单号/支付单号/订单状态/支付状态/履约状态/创建时间筛选；`/payments` 用支付单号/订单号/幂等键/支付状态/webhook 状态/时间筛选；`/inventory` 用 SKU/商品/仓库/订单、库存锁状态、流水类型和时间筛选；`/after-sales` 用售后单号/订单号/原因/买家/类型/状态/时间筛选；`/customers` 用邮箱/手机号/姓名/游客令牌/状态/创建时间筛选；`/products` 用商品/SPU/slug/分类筛选
12. 对上述列表点击分页上一页/下一页和 page size，确认 `scopeType`、`scopeId`、`siteId`、查询条件和当前 Admin Work Tab 都被保留
13. 抽检 `/product-attributes`，确认页面说明该页用于维护动态商品属性、商品编辑字段、前台筛选和搜索分面；搜索/状态/类型筛选会同时影响下面的编辑配置行和属性定义表，表格有分页
14. 在左侧 Language 下拉中切换 English / 简体中文，确认全局侧栏、后台首页 Scope 文案、站点管理页、订单/支付/库存/履约/售后/商品/客户/分析/RBAC/审计页面静态 UI 文案即时切换
15. 抽检动态详情页：`/orders/ORDER_ID`、`/products/00000000-0000-4000-8000-000000001002`、`/after-sales/REQUEST_ID`，确认按钮、表头、空状态和操作说明使用当前语言；商品名、邮箱、订单号、SKU、币种和 JSON 快照等业务数据可保持原值
16. 刷新或跳转页面后，语言偏好通过 `commerce_admin_locale` cookie 保持，并同步写入 `commerce.admin.locale` localStorage
```

后台运营总览大屏 smoke：

```text
1. 打开 http://localhost:3001
2. 确认首页展示 GMV、净销售额、AOV、风险金额、回调成功率、待履约、库存锁和售后待处理指标
3. 确认首页展示近期销售趋势、渠道分布、商品排行和风险提醒
4. 切换 Global / Vertical / Brand / Site Scope，指标和图表随当前授权范围重算
5. 切换 Default Site，下拉值和大屏标题同步变化
6. 点击 Analytics / Operations 进入明细页，顶部 Admin Work Tabs 增加或激活对应标签
```

后台 API Catalog smoke：

```text
1. 打开 http://localhost:3001/api-catalog
2. 确认页面展示 API Base URL、OpenAPI Docs 和 OpenAPI JSON
3. 点击 Swagger UI，确认跳转到 http://127.0.0.1:4000/api/docs
4. 点击 Contract JSON，确认跳转到 http://127.0.0.1:4000/api/docs-json
5. 确认页面按 Storefront / Admin / Webhook / System 分组展示 REST 端点
6. 确认页面说明 Next.js route handlers 是 BFF/proxy adapter，不是 Commerce Core API 的业务事实来源
```

后台搜索表格组件 smoke：

```text
1. 打开 http://localhost:3001/orders
2. 确认搜索条件、表格列、空状态和分页由统一资源表格样式呈现
3. 切换搜索、状态、日期和 page size，确认查询条件保留 Admin Scope / Site
4. 打开 http://localhost:3001/product-attributes
5. 确认 Attribute Search、Vertical Attribute Actions 和 Attribute Definitions 分区清晰，定义表有统一分页
```

## 5. 交易链路 smoke 顺序

真实链路顺序：

```text
1. GET /api/cart
2. POST /api/cart/items
3. PATCH /api/cart/items/:skuId
4. POST /api/orders
5. POST /api/payments
6. POST /api/payments/webhooks/stripe
7. POST /api/admin/operations/process-pending-commerce
8. GET /api/orders/:orderId/checkout-result
9. POST /api/admin/fulfillments
10. POST /api/admin/fulfillments/:fulfillmentOrderId/ship
11. POST /api/admin/shipments/:shipmentId/deliver
12. GET /api/admin/orders
13. GET /api/admin/orders/:orderId
14. GET /api/admin/payments/orders
15. GET /api/admin/payments/transactions
16. GET /api/admin/payments/webhooks
17. GET /api/admin/inventory/balances
18. GET /api/admin/inventory/locks
19. GET /api/admin/inventory/transactions
20. POST /api/after-sales/refund-requests
21. GET /api/admin/after-sales/requests
22. GET /api/admin/after-sales/requests/:requestId
23. POST /api/admin/after-sales/:requestId/approve-refund
24. POST /api/admin/payment-refunds/:refundId/mark-succeeded
```

预期最终结果：

```json
{
  "order_status": "completed",
  "payment_status": "paid",
  "fulfillment_status": "delivered",
  "payment_webhook_status": "processed",
  "locked_qty": 0
}
```

## 6. Commerce Pipeline

直接调用 API：

```bash
curl -sS -X POST http://127.0.0.1:4000/api/admin/operations/process-pending-commerce \
  -H 'Content-Type: application/json' \
  -d '{"limit":20}'
```

通过 Admin Next.js 代理调用：

```bash
curl -sS -X POST http://127.0.0.1:3001/api/admin/operations/process-pending-commerce \
  -H 'Content-Type: application/json' \
  -d '{"limit":20}'
```

返回中应关注：

```text
paymentWebhooks.processed
paymentSucceededEvents.processed
analyticsEvents.processed
failed
results[].errorMessage
```

## 7. Admin Order Operations

后台订单列表按 Admin Scope 收敛数据，前端可附加 scope 参数缩小范围，不能放大后端 RBAC 范围：

```bash
curl -sS "http://127.0.0.1:4000/api/admin/orders?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&limit=20"
```

后台订单详情读取高风险链路记录：

```bash
curl -sS "http://127.0.0.1:4000/api/admin/orders/ORDER_ID"
```

详情页面：

```text
http://localhost:3001/orders
http://localhost:3001/orders/ORDER_ID
```

订单详情页可执行履约动作：

```text
1. paid / paid / unfulfilled 订单显示 Create Fulfillment
2. 创建履约单后，订单变为 confirmed / paid / pending
3. 录入 carrier 和 tracking 后 Ship
4. 发货后，订单变为 fulfilled / paid / shipped
5. 标记 Deliver 后，订单变为 completed / paid / delivered
```

## 8. Admin Payment Operations

后台支付运营页按 Admin Scope 收敛支付单、交易和 webhook，页面可触发 Commerce Pipeline：

```bash
curl -sS "http://127.0.0.1:4000/api/admin/payments/orders?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&limit=20"
```

```bash
curl -sS "http://127.0.0.1:4000/api/admin/payments/transactions?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&limit=20"
```

```bash
curl -sS "http://127.0.0.1:4000/api/admin/payments/webhooks?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&limit=20"
```

页面：

```text
http://localhost:3001/payments
```

支付运营页应能看到：

```text
paymentOrders[].idempotencyKey
paymentTransactions[].providerTransactionId
paymentWebhooks[].providerEventId
paymentWebhooks[].status
paymentWebhooks[].processedAt
pipeline.paymentWebhooks.processed / skipped / alreadyProcessed / failed
```

## 9. Admin Inventory Operations

后台库存运营页按 Admin Scope 收敛 SKU 余额、库存锁和库存流水：

```bash
curl -sS "http://127.0.0.1:4000/api/admin/inventory/balances?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&limit=20"
```

```bash
curl -sS "http://127.0.0.1:4000/api/admin/inventory/locks?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&limit=20"
```

```bash
curl -sS "http://127.0.0.1:4000/api/admin/inventory/transactions?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&limit=20"
```

页面：

```text
http://localhost:3001/inventory
```

库存运营页应能看到：

```text
inventoryBalances[].availableQty
inventoryBalances[].lockedQty
inventoryBalances[].physicalQty
inventoryBalances[].inboundQty
inventoryBalances[].safetyQty
inventoryLocks[].status
inventoryLocks[].expiresAt
inventoryLocks[].releasedAt
inventoryLocks[].deductedAt
inventoryLocks[].idempotencyKey
inventoryTransactions[].beforeAvailable / afterAvailable
inventoryTransactions[].beforeLocked / afterLocked
inventoryTransactions[].beforePhysical / afterPhysical
inventoryTransactions[].idempotencyKey
```

## 10. Admin Product Catalog Operations

后台商品目录页按 Admin Scope 收敛商品、SKU、分类和垂类属性：

```text
http://localhost:3001/products
http://localhost:3001/products/00000000-0000-4000-8000-000000001002
http://localhost:3001/product-attributes
```

直接调用 API 查询商品和分类：

```bash
curl -sS "http://127.0.0.1:4000/api/admin/products?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&limit=100"
```

```bash
curl -sS "http://127.0.0.1:4000/api/admin/products/00000000-0000-4000-8000-000000001002?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301"
```

```bash
curl -sS "http://127.0.0.1:4000/api/admin/categories?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&limit=100"
```

直接调用 API 查询垂类属性：

```bash
curl -sS "http://127.0.0.1:4000/api/admin/product-attributes?verticalId=00000000-0000-4000-8000-000000000101"
```

商品上下架通过 Admin Next.js 代理调用：

```bash
curl -sS -X POST "http://127.0.0.1:3001/api/admin/products/00000000-0000-4000-8000-000000001002/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"inactive"}'
```

```bash
curl -sS -X POST "http://127.0.0.1:3001/api/admin/products/00000000-0000-4000-8000-000000001002/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'
```

SKU 维护：

```bash
curl -sS -X POST "http://127.0.0.1:3001/api/admin/skus/00000000-0000-4000-8000-000000001003/update" \
  -H "Content-Type: application/json" \
  -d '{"status":"active","priceAmount":"49.00","compareAtAmount":"79.00","currency":"USD"}'
```

分类维护：

```bash
curl -sS -X POST "http://127.0.0.1:3001/api/admin/categories/00000000-0000-4000-8000-000000001001/update" \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Eyewear","sortOrder":10,"isActive":true}'
```

垂类属性维护：

```bash
curl -sS -X POST "http://127.0.0.1:3001/api/admin/product-attributes" \
  -H "Content-Type: application/json" \
  -d '{"verticalId":"00000000-0000-4000-8000-000000000101","name":"Frame Material","code":"frame_material","type":"text","required":false,"searchable":true,"filterable":true,"sortOrder":40,"status":"active"}'
```

```bash
curl -sS -X POST "http://127.0.0.1:3001/api/admin/product-attributes/ATTRIBUTE_ID/options" \
  -H "Content-Type: application/json" \
  -d '{"label":"Acetate","value":"acetate","sortOrder":10}'
```

商品状态变更必须写审计日志，并带站点维度：

```bash
node --input-type=module <<'NODE'
import pg from "./apps/api/node_modules/pg/lib/index.js";
const { Client } = pg;
const client = new Client({ connectionString: "postgres://cross_border:cross_border_password@localhost:5432/cross_border_store" });
await client.connect();
const result = await client.query(`
  SELECT action, resource_type, resource_id, site_id, vertical_id, brand_id, after_snapshot, created_at
  FROM audit_logs
  WHERE action = 'product.update_status'
  ORDER BY created_at DESC
  LIMIT 10
`);
console.log(JSON.stringify(result.rows, null, 2));
await client.end();
NODE
```

前台联动验证：

```bash
curl -sS http://127.0.0.1:3000/products | grep -o "Demo Blue Light Glasses" | wc -l | tr -d " "
```

预期：

```text
inactive 后输出 0
active 后输出大于 0
```

完整商品目录 smoke：

```bash
curl -sS -X POST "http://127.0.0.1:4000/api/admin/products/00000000-0000-4000-8000-000000001002/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"active"}'

curl -sS "http://127.0.0.1:4000/api/admin/products?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&limit=5"

curl -sS "http://127.0.0.1:4000/api/products"

curl -sS "http://127.0.0.1:3001/products?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&siteId=00000000-0000-4000-8000-000000000301" | rg -o "Product Catalog|Demo Blue Light Glasses|SKU"

curl -sS "http://127.0.0.1:3001/product-attributes?siteId=00000000-0000-4000-8000-000000000301&verticalId=00000000-0000-4000-8000-000000000101" | rg -o "Vertical Attributes|Origin|Merchandising Badge|Dispatch Promise|Attribute Definitions"

curl -sS "http://127.0.0.1:3000/products" | rg -o "Demo Blue Light Glasses|View details"
```

## 11. Storefront Account And Admin Customer Operations

前台 Account Lite 保存 current-site Site Customer 和默认地址：

```bash
customer_email="smoke+$(date +%s)@example.com"

curl -sS -X POST "http://127.0.0.1:4000/api/customers/site-customers" \
  -H "Content-Type: application/json" \
  -d "{\"guestToken\":\"guest_customer_smoke\",\"email\":\"$customer_email\",\"phone\":\"+14155550199\",\"nickname\":\"Smoke Buyer\",\"defaultAddress\":{\"label\":\"Default\",\"email\":\"$customer_email\",\"fullName\":\"Smoke Buyer\",\"phone\":\"+14155550199\",\"countryCode\":\"US\",\"region\":\"CA\",\"city\":\"San Francisco\",\"postalCode\":\"94105\",\"addressLine1\":\"100 Market Street\"}}"
```

通过 Storefront Next.js 代理保存：

```bash
customer_email="proxy+$(date +%s)@example.com"

curl -sS -X POST "http://127.0.0.1:3000/api/account/site-customer" \
  -H "Content-Type: application/json" \
  -d "{\"guestToken\":\"guest_customer_proxy_smoke\",\"email\":\"$customer_email\",\"phone\":\"+14155550198\",\"nickname\":\"Proxy Buyer\",\"defaultAddress\":{\"label\":\"Default\",\"email\":\"$customer_email\",\"fullName\":\"Proxy Buyer\",\"phone\":\"+14155550198\",\"countryCode\":\"US\",\"region\":\"CA\",\"city\":\"San Francisco\",\"postalCode\":\"94105\",\"addressLine1\":\"101 Market Street\"}}"
```

后台按 Admin Scope 查询客户：

```bash
curl -sS "http://127.0.0.1:4000/api/admin/customers?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&limit=20"
```

页面 smoke：

```bash
curl -sS "http://127.0.0.1:3000/account" | rg -o "Account|Default shipping address|Guest profile"

curl -sS "http://127.0.0.1:3001/customers?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&siteId=00000000-0000-4000-8000-000000000301" | rg -o "Site Customers|Customer Profiles|With Address|Smoke Buyer"
```

数据边界：

```text
- users 是 Global User 基础表。
- site_customers 是 Site Customer 站点身份，必须带 site_id / vertical_id / brand_id。
- site_customer_addresses 是 current-site 地址簿，Checkout 只复制地址快照到订单，不引用可变地址行。
- Storefront 仍不传可信 site_id，后端通过 x-site-domain / host 解析 current site。
```

## 12. Admin Fulfillment Operations

## 12. Admin RBAC Scope And Audit Trail

后台 RBAC 和审计页：

```text
http://localhost:3001/rbac
http://localhost:3001/audit
```

Demo seed 会创建两个后台账号：

```text
globalAdminId: 00000000-0000-4000-8000-000000002001
siteAdminId:   00000000-0000-4000-8000-000000002002
```

读取 RBAC 快照：

```bash
curl -sS "http://127.0.0.1:4000/api/admin/rbac"
```

Global Admin 给后台用户分配站点 scope：

```bash
curl -sS -X POST "http://127.0.0.1:4000/api/admin/rbac/users/00000000-0000-4000-8000-000000002002/scopes" \
  -H "Content-Type: application/json" \
  -H "x-admin-user-id: 00000000-0000-4000-8000-000000002001" \
  -H "x-request-id: rbac-smoke-001" \
  -d '{"scopeType":"site","scopeId":"00000000-0000-4000-8000-000000000301"}'
```

Site Admin 尝试越权分配 Global Scope 应返回 `403`：

```bash
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "http://127.0.0.1:4000/api/admin/rbac/users/00000000-0000-4000-8000-000000002001/scopes" \
  -H "Content-Type: application/json" \
  -H "x-admin-user-id: 00000000-0000-4000-8000-000000002002" \
  -d '{"scopeType":"global"}'
```

查询带 site scope 的审计日志：

```bash
curl -sS "http://127.0.0.1:4000/api/admin/audit-logs?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&query=admin_scope.assign&limit=20" \
  -H "x-admin-user-id: 00000000-0000-4000-8000-000000002002"
```

预期：

```json
{
  "deniedStatus": 403,
  "latestAuditAction": "admin_scope.assign",
  "latestAuditSiteId": "00000000-0000-4000-8000-000000000301"
}
```

## 13. Admin Analytics And Operations Dashboards

后台分析和运营风险页：

```text
http://localhost:3001/analytics
http://localhost:3001/operations
```

带默认站点 scope：

```text
http://localhost:3001/analytics?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&siteId=00000000-0000-4000-8000-000000000301
http://localhost:3001/operations?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&siteId=00000000-0000-4000-8000-000000000301
```

Analytics 页面显示：

```text
- Daily Sales
- Channel Performance
- Product Performance
- Customer LTV
```

Operations 页面显示：

```text
- Orders
- Payment Webhooks
- Inventory Locks
- Inventory Transactions
- After-sales Requests
- Refunds
- Audit Logs
```

如果看不到 analytics 投影数据，先跑交易链路或处理 pipeline：

```bash
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store pnpm e2e:commerce
```

```bash
curl -sS -X POST http://127.0.0.1:4000/api/admin/operations/process-pending-commerce \
  -H 'Content-Type: application/json' \
  -d '{"limit":20}'
```

## 14. Admin Fulfillment Operations

后台订单详情页通过 Admin Next.js 代理执行履约动作：

```text
http://localhost:3001/orders/ORDER_ID
```

直接调用 API 创建履约单：

```bash
curl -sS -X POST http://127.0.0.1:4000/api/admin/fulfillments \
  -H 'Content-Type: application/json' \
  -d '{"orderId":"ORDER_ID","warehouseId":"00000000-0000-4000-8000-000000001004"}'
```

创建物流单：

```bash
curl -sS -X POST http://127.0.0.1:4000/api/admin/fulfillments/FULFILLMENT_ORDER_ID/ship \
  -H 'Content-Type: application/json' \
  -d '{"providerCode":"demo-carrier","providerName":"Demo Carrier","trackingNo":"TRACK-ORDER"}'
```

标记签收：

```bash
curl -sS -X POST http://127.0.0.1:4000/api/admin/shipments/SHIPMENT_ID/deliver \
  -H 'Content-Type: application/json' \
  -d '{"deliveredAt":"2026-05-16T15:05:00.000Z","location":"Customer address","description":"Delivered by admin operation"}'
```

预期状态：

```json
{
  "afterCreateFulfillment": {
    "orderStatus": "confirmed",
    "paymentStatus": "paid",
    "fulfillmentStatus": "pending"
  },
  "afterShip": {
    "orderStatus": "fulfilled",
    "paymentStatus": "paid",
    "fulfillmentStatus": "shipped"
  },
  "afterDeliver": {
    "orderStatus": "completed",
    "paymentStatus": "paid",
    "fulfillmentStatus": "delivered"
  }
}
```

履约动作必须写审计日志：

```bash
PGPASSWORD=cross_border_password /usr/local/opt/postgresql@16/bin/psql \
  -h localhost -U cross_border -d cross_border_store \
  -c "SELECT action, resource_type, resource_id, site_id, created_at FROM audit_logs WHERE action LIKE 'fulfillment.%' ORDER BY created_at DESC LIMIT 10;"
```

## 15. Admin After-sales And Refund Operations

后台售后运营页：

```text
http://localhost:3001/after-sales
http://localhost:3001/after-sales/AFTER_SALES_REQUEST_ID
```

直接调用 API 查询售后列表：

```bash
curl -sS "http://127.0.0.1:4000/api/admin/after-sales/requests?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&limit=20"
```

直接调用 API 查询售后详情：

```bash
curl -sS "http://127.0.0.1:4000/api/admin/after-sales/requests/AFTER_SALES_REQUEST_ID"
```

审批退款：

```bash
curl -sS -X POST http://127.0.0.1:4000/api/admin/after-sales/AFTER_SALES_REQUEST_ID/approve-refund \
  -H 'Content-Type: application/json' \
  -d '{"approvedAmount":"49.00","idempotencyKey":"approve-refund-smoke-001"}'
```

拒绝售后申请：

```bash
curl -sS -X POST http://127.0.0.1:4000/api/admin/after-sales/AFTER_SALES_REQUEST_ID/reject \
  -H 'Content-Type: application/json' \
  -d '{"reason":"Evidence does not match the order item."}'
```

标记退款成功：

```bash
curl -sS -X POST http://127.0.0.1:4000/api/admin/payment-refunds/PAYMENT_REFUND_ID/mark-succeeded \
  -H 'Content-Type: application/json' \
  -d '{"providerRefundId":"provider-refund-smoke-001"}'
```

预期状态：

```json
{
  "afterApprove": {
    "afterSalesStatus": "refunding",
    "refundStatus": "requested",
    "paymentStatus": "paid"
  },
  "afterMarkSucceeded": {
    "afterSalesStatus": "completed",
    "refundStatus": "succeeded",
    "paymentStatus": "refunded"
  }
}
```

售后和退款动作必须写审计日志。无数据库管理员 header 时写入 `audit_logs`；如果请求携带可解析的数据库 admin user UUID，也会写入 `admin_operation_logs`：

```bash
node <<'NODE'
const pg = require('pg');
const client = new pg.Client({ connectionString: 'postgres://cross_border:cross_border_password@localhost:5432/cross_border_store' });
(async () => {
  await client.connect();
  const result = await client.query(`
    SELECT action, resource_type, resource_id, site_id, vertical_id, brand_id, actor_type, actor_id, created_at
    FROM audit_logs
    WHERE action IN ('aftersales.approve_refund', 'aftersales.reject_request', 'payment_refund.mark_succeeded')
    ORDER BY created_at DESC
    LIMIT 10
  `);
  console.log(JSON.stringify(result.rows, null, 2));
  await client.end();
})().catch(async (error) => {
  console.error(error);
  try { await client.end(); } catch {}
  process.exit(1);
});
NODE
```

## 16. 高风险数据检查

检查订单状态：

```bash
PGPASSWORD=cross_border_password /usr/local/opt/postgresql@16/bin/psql \
  -h localhost -U cross_border -d cross_border_store \
  -c "SELECT order_no, order_status, payment_status, fulfillment_status, aftersales_status FROM orders ORDER BY created_at DESC LIMIT 10;"
```

检查支付 webhook 幂等状态：

```bash
PGPASSWORD=cross_border_password /usr/local/opt/postgresql@16/bin/psql \
  -h localhost -U cross_border -d cross_border_store \
  -c "SELECT channel_code, provider_event_id, event_type, status, processed_at FROM payment_webhook_events ORDER BY received_at DESC LIMIT 10;"
```

检查库存余额：

```bash
PGPASSWORD=cross_border_password /usr/local/opt/postgresql@16/bin/psql \
  -h localhost -U cross_border -d cross_border_store \
  -c "SELECT sku_id, warehouse_id, available_qty, locked_qty, physical_qty, inbound_qty, safety_qty FROM sku_inventory ORDER BY updated_at DESC LIMIT 10;"
```

检查库存流水：

```bash
PGPASSWORD=cross_border_password /usr/local/opt/postgresql@16/bin/psql \
  -h localhost -U cross_border -d cross_border_store \
  -c "SELECT type, sku_id, warehouse_id, quantity, before_available, after_available, before_locked, after_locked, before_physical, after_physical, created_at FROM inventory_transactions ORDER BY created_at DESC LIMIT 10;"
```

检查后台审计：

```bash
PGPASSWORD=cross_border_password /usr/local/opt/postgresql@16/bin/psql \
  -h localhost -U cross_border -d cross_border_store \
  -c "SELECT actor_type, action, resource_type, resource_id, site_id, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 10;"
```

## 17. 常见问题

`DATABASE_URL is required`：

```text
API、db:seed:demo、e2e:commerce 都需要 DATABASE_URL。
```

前台或后台页面加载不到 API 数据：

```text
检查启动 storefront/admin 时是否设置 API_BASE_URL=http://127.0.0.1:4000。
```

Next.js dev 提示 127.0.0.1 cross-origin HMR：

```text
storefront 已在 next.config.ts 配置 allowedDevOrigins: ["127.0.0.1", "localhost"]。
如果新增 Next.js 应用也用 127.0.0.1 验证，需要在对应 next.config.ts 加同类配置并重启 dev server。
```

重复 webhook 没有再次扣库存：

```text
这是正确行为。payment_webhook_events(channel_code, provider_event_id) 去重。
```

Pipeline processed 为 0：

```text
通常表示没有 pending webhook 或 pending PaymentSucceeded event。
先检查 payment_webhook_events 和 domain_events。
```

## 18. 前台 Checkout Smoke

浏览器路径：

```text
http://localhost:3000/products/00000000-0000-4000-8000-000000001002
-> Add to cart
-> View cart
-> Checkout
-> Place order
-> Payment result
-> View order
-> Submit after-sales request
-> Admin /after-sales approve refund
-> Admin mark refund succeeded
-> My orders
```

前台 Next.js 代理路径：

```text
POST /api/checkout/orders
POST /api/checkout/payments
POST /api/checkout/payment-webhook
POST /api/checkout/process-pipeline
GET /api/checkout/result/:orderId
GET /api/orders
GET /api/orders/:orderId
POST /api/after-sales/refund-requests
```

注意：

```text
- 前台仍然不传可信 site_id，API 通过 x-site-domain / host 解析 Site Context。
- Payment Result 只读取 GET /api/orders/:orderId/checkout-result 的后端状态，不把前端跳转当作支付成功依据。
- Orders 页面读取 GET /api/orders 和 GET /api/orders/:orderId，必须带 shopper scope，后端按 current site 过滤。
- Order Detail 页面可对 paid / partially_refunded 订单发起售后申请，POST /api/after-sales/refund-requests 必须带 guestToken 或 userId buyer scope。
- 售后申请只把订单 aftersales_status 置为 requested，不代表退款已审批或资金已退回。
- Account Lite 会保存 current-site Site Customer 和默认地址；完整密码注册、邮箱验证和多地址簿仍是后续项。
- 本地 demo webhook 使用 paymentOrderId 作为 providerObjectId，让现有 payment_webhook_events 幂等链路处理。
```
