# Current Implementation Baseline

本文档记录当前代码已经实现的事实基线。领域词汇只放在 `CONTEXT.md`；架构目标放在 `docs/commerce-os-architecture.md`；运行步骤放在 `docs/commerce-os-runbook.md`。

## 1. 代码结构

```text
apps/
  storefront/
  admin/
  api/

packages/
  shared/
  database/
  config/

scripts/
  require-database-url.mjs
  seed-demo-commerce.mjs
```

## 2. 当前应用

```text
apps/storefront:
- Next.js storefront
- 当前包含 default site 首页、商品列表页、商品详情页、购物车页、结算页、支付结果页、订单列表页、订单详情页和 Account Lite 页
- 已能通过 site context 加载站点配置、商品、分类、垂类属性和库存可售提示
- 已能通过 guest token 操作 current-site cart，支持加购、数量更新和移除
- 已能从购物车创建 current-site 订单、锁库存、创建支付单、触发 demo webhook 和 Commerce Pipeline，并从后端读取支付结果
- 已能通过 current-site shopper scope 查看订单列表、订单详情、状态分列、订单商品快照和可用物流信息
- 已能从订单详情发起 current-site 售后申请，支持仅退款和退货退款，创建申请不等同于退款到账
- Account Lite 已支持 guest-to-account MVP：保存 current-site Site Customer、默认地址，并让 Checkout 复用地址快照

apps/admin:
- Next.js unified admin
- 当前包含统一后台 Ant Design 全局壳层、固定侧边栏、真实页面路由、可记忆 Admin Work Tabs 和 Admin i18n 基础设施
- 已包含站点切换、scope 切换、站点/垂类/品牌上下文、垂类属性、分析、风险运营和 Commerce Pipeline 操作入口
- 已新增接口目录 `/api-catalog`，展示 `API_BASE_URL`、OpenAPI UI、OpenAPI JSON、Storefront/Admin/Webhook/System 核心 REST 端点，以及 Next BFF 与 Commerce Core API 的表现层/数据层边界
- Site Management 菜单已从页面锚点升级为独立页面：`/verticals`、`/brands`、`/sites`、`/domains`、`/site-config`
- 已包含后台订单列表 `/orders` 和订单详情 `/orders/[orderId]`
- 订单详情已展示分离的订单/支付/履约/售后状态、商品快照、支付记录、库存锁与流水、履约单、物流单、退款、售后申请和状态日志
- 订单详情已支持后台履约动作：为已支付订单创建履约单、录入物流商和运单号发货、标记签收完成
- 已包含后台支付运营页 `/payments`，展示 scoped 支付单、支付交易、支付 webhook 和 Commerce Pipeline 处理结果
- 已包含后台库存运营页 `/inventory`，展示 scoped SKU 库存余额、库存锁、库存流水和幂等键
- 已包含后台售后运营页 `/after-sales` 和售后详情 `/after-sales/[requestId]`
- 售后详情已支持审批退款、拒绝售后申请、标记支付退款成功，并保留售后申请与实际退款资金状态分离
- 已包含后台商品目录页 `/products`、商品详情 `/products/[productId]` 和垂类属性页 `/product-attributes`
- 商品目录已支持按 Admin Scope 查看站点商品、SKU、价格、库存摘要、分类和垂类属性，并支持商品上下架、SKU 基础信息/价格状态维护、分类维护和属性选项维护
- 已包含后台客户页 `/customers`，按 Admin Scope 查看 Site Customer、Global User 摘要、默认地址和订单价值
- 已包含后台 RBAC / Scope 页 `/rbac`，展示 Admin Users、Roles、Permissions、Scope，并支持 Global Admin 分配 Global / Vertical / Brand / Site Scope
- 已包含后台审计页 `/audit`，按 Admin Scope 搜索和查看高风险 audit logs
- 首页 `/` 已升级为运营总览大屏，聚合 GMV、净销售额、客单价、风险金额、支付回调、履约、库存锁、售后、近期销售趋势、渠道分布、商品排行和风险提醒
- 已包含后台分析页 `/analytics`，按 Global / Vertical / Brand / Site Scope 查看 daily sales、channel performance、product performance 和 customer LTV
- 已包含后台运营风险页 `/operations`，按 Scope 查看订单、支付 webhook、库存锁、库存流水、售后、退款和审计日志
- 已包含后台履约队列页 `/fulfillment`，从 scoped orders 推导待发货、已发货和已签收队列
- 后台全局侧边栏使用真实路由，不再使用锚点兜底；侧边栏在桌面视口固定，页面内容独立滚动
- 顶部 Admin Work Tabs 会记录左侧菜单和详情页打开历史，Dashboard 固定不可关闭；同一 pathname 的列表页只保留一个标签，query 变化会更新当前标签而不会产生重复标签，激活已有标签不会改变原有标签顺序，其余标签可关闭并写入 `commerce.admin.workTabs`
- 后台内容区已采用全宽弹性布局，不再用居中 `max-width` 约束主工作区；现有页面通过全局 Ant Design 风格层统一获得背景、字体颜色、表格、卡片、表单、按钮、输入框、搜索框、复选框/单选框和 icon/文字对齐样式
- 后台查询条件和行内操作区使用统一控件高度；带标签的输入框、下拉和日期字段要与同一行操作按钮按控件底线对齐
- 后台订单、支付、库存、售后等运营页头部 Site / Scope 切换器使用统一紧凑面板；指标卡统一使用 `admin-metric-card` 的 icon/label/value 对齐模型
- 顶部 Admin Work Tabs 已强化 active 状态、图标、关闭按钮和视觉边界；当前标签不再与其他标签混成一组白色文字块
- 商品页已作为 UI 样板页收紧：指标卡使用统一 icon/label/value 对齐模型，站点/数据范围/状态筛选使用紧凑 pill group，分类管理表单限制在可扫读宽度内，避免超宽屏横向分散
- 垂类属性页 `/product-attributes` 已明确为动态商品属性配置页：字段用于商品编辑表单、前台筛选和搜索分面；页面支持按站点/垂类切换、属性搜索、状态/类型筛选、分页，并将编辑表单收紧为紧凑配置行
- 后台高风险运营列表已补搜索/筛选/分页基线：`/orders` 支持订单号、支付单号、买家、订单/支付/履约状态和创建时间筛选；`/payments` 支持支付单、订单号、幂等键、支付状态、webhook 状态和时间筛选；`/inventory` 支持 SKU/商品/仓库/订单、库存锁状态、库存流水类型和时间筛选；`/after-sales` 支持售后单、订单号、原因、买家、类型、状态和时间筛选；`/customers` 支持邮箱、手机号、姓名、游客令牌、状态和创建时间筛选；`/products` 支持商品、SPU、slug、分类搜索
- 后台列表组件化已开始按 `security-admin` 的 SearchForm/SearchTable 思路迁移：当前新增 `AdminQueryPanel`、`AdminResourceTable`、`AdminPagination` 组合，`AdminQueryPanel` 已使用 Ant Design `Form`、`Input`、`Select`、`DatePicker`、`Button` 承载查询输入、下拉、日期和操作按钮，后续列表按同一模式继续替换手写 table
- 以上后台列表的查询条件会保留 Admin Scope / Site / page size，查询参数变化只更新当前 Admin Work Tab，不新增重复 tab
- 后台主要 client-side 操作面板已优先使用 Ant Design Button、Input、Input.Search、InputNumber、Select、Checkbox、Alert、Card、Statistic 和 Table；纯服务端列表页保留语义 HTML，但继承统一 Ant Design 视觉层，后续按页面渐进替换为原生 Ant Design 组件
- 后台 i18n 当前由 `apps/admin/src/lib/admin-i18n.ts` 和 `apps/admin/src/lib/admin-static-localization.ts` 共同覆盖：全局侧边栏、语言切换、Scope 文案、站点管理、交易运营、风险、分析、RBAC、审计和主要详情页静态 UI 文案均支持 English / 简体中文；商品名、邮箱、订单号、SKU、币种和 JSON 快照等业务数据保持原值

apps/api:
- NestJS modular monolith
- 当前负责所有核心业务 API、数据库事务、outbox 和后台运营接口
```

## 3. 当前后端模块

```text
site
product
cart
order
payment
inventory
fulfillment
aftersales
analytics
operations
customer
admin-access
admin-audit
health
```

## 4. 当前数据库迁移

```text
0001_mvp_core_schema
0002_site_foundation
0003_site_dimensions_nullable
0004_backfill_default_site_dimensions
0005_admin_scope_foundation
0006_product_dynamic_attributes
0007_analytics_multidimensional_stats
0008_aftersales_refund_workflow
0009_site_customers_addresses
```

## 5. 当前已实现核心能力

```text
Multi-site:
- verticals
- brands
- sites
- site_domains
- site_configs
- default site backfill

Product:
- products
- product_skus
- product_categories
- product_media
- sku_prices
- catalog stock availability hints
- vertical_attributes
- vertical_attribute_options
- product_attribute_values
- admin catalog scoped reads
- admin product status, SKU, category and vertical attribute mutations
- admin product status changes are audited with site / vertical / brand dimensions
- active DB products are surfaced to Storefront product APIs and pages under current site context

Customer:
- users remains the Global User table
- site_customers represents Site Customer identity per site / vertical / brand
- site_customer_addresses stores current-site customer addresses
- storefront Account Lite can create/update a Site Customer and default address
- checkout can reuse the stored default address snapshot
- admin customer list applies Admin RBAC scope

Cart:
- current-site cart
- guest cart
- site-scoped SKU insertion
- storefront cart page
- cart quantity update and removal

Order:
- create order
- idempotency key
- order item snapshot
- shipping address snapshot from checkout
- checkout payment result query scoped by current site and buyer identity
- storefront order list/detail query scoped by current site and buyer identity
- admin order list/detail query scoped by Admin RBAC data scope
- order detail includes item snapshots and shipment/tracking rows when present
- order status logs
- inventory lock during order creation

Payment:
- payment_orders
- payment_transactions
- payment_webhook_events
- admin payment order / transaction / webhook scoped reads
- provider event id dedupe
- Stripe-style signature carrier requirement
- storefront demo payment webhook proxy for local end-to-end smoke

Inventory:
- available_qty
- locked_qty
- physical_qty
- inbound_qty
- safety_qty
- inventory_locks
- inventory_transactions
- admin inventory balance / lock / transaction scoped reads

Operations:
- risk dashboard query model
- Commerce Pipeline endpoint
- Admin Order operations detail endpoint
- Admin Payment operations endpoints
- Admin Inventory operations endpoints
- Admin Fulfillment mutation endpoints with audit recording

Fulfillment:
- create fulfillment order
- ship fulfillment
- deliver shipment
- admin fulfillment actions from order detail

Aftersales:
- refund request workflow foundation
- storefront after-sales request action from order detail
- admin after-sales request list/detail scoped reads
- admin refund approval and request rejection
- payment refund success marking
- refund approval / rejection / success audit recording

Analytics:
- multidimensional sales/channel/product/customer LTV projection foundation

Admin:
- admin scope foundation
- admin audit recording
- RBAC snapshot and scoped audit-log query endpoints
- product catalog operations page and product detail actions
- vertical attribute operations page and options maintenance
- payment operations page and pipeline trigger
- inventory operations page
- fulfillment actions panel on order detail
- after-sales operations page and refund actions panel
- customer management page for scoped Site Customers
- RBAC Scope page and Audit Trail page
- Analytics dashboard page and Operations risk dashboard page
```

## 6. 已跑通真实链路

```text
seed demo data
-> load storefront product
-> add cart item
-> checkout captures shipping address
-> create order
-> lock inventory
-> create payment order
-> receive payment webhook
-> process Commerce Pipeline
-> update order paid
-> deduct inventory
-> project analytics
-> create fulfillment order
-> ship
-> deliver
-> final order: completed / paid / delivered
```

售后退款链路：

```text
paid order
-> storefront after-sales request
-> admin after-sales detail review
-> approve refund
-> payment_refund requested
-> mark refund succeeded
-> order payment_status = refunded or partially_refunded
-> aftersales_status = completed
-> audit_logs recorded for approval and refund success
```

## 7. 当前 demo 数据

```text
siteId:      00000000-0000-4000-8000-000000000301
verticalId:  00000000-0000-4000-8000-000000000101
brandId:     00000000-0000-4000-8000-000000000201
productId:   00000000-0000-4000-8000-000000001002
skuId:       00000000-0000-4000-8000-000000001003
warehouseId: 00000000-0000-4000-8000-000000001004
currency:    USD
```

## 8. 当前缺口

Storefront:

```text
- 用户注册/登录
- FAQ
- 联系客服
- 完整密码登录、OAuth 和邮箱验证
```

Admin:

```text
- 优惠券管理
- 客服工单
- 管理员账号
- 角色权限完整 CRUD
- 操作日志详情页和导出
- BI 图表增强和导出
```

Backend:

```text
- 用户认证尚未产品化，当前是 guest-to-account MVP
- 用户地址已有 current-site 默认地址，完整地址簿仍待补齐
- 真实支付跳转仍是 demo/smoke 级别
- 退货实物入仓、换货和退款失败重试仍待补齐
- 复杂营销、客服、CRM 和 BI 大屏仍待后续阶段
```

## 9. 当前验证命令

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm db:validate
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store pnpm e2e:commerce
pnpm build
git diff --check
```
