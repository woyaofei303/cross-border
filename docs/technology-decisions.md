# Technology Decisions

本文档记录当前 Commerce OS 实现阶段的技术决策。早期“单个 Next.js 应用雏形”和“实现前确认”的描述已经过期；后续开发以本文为准。

## 1. 当前项目状态

```text
Package manager:
- pnpm workspaces

Applications:
- apps/storefront: Next.js storefront
- apps/admin: Next.js admin
- apps/api: NestJS API

Packages:
- packages/shared: shared enums/events/ids
- packages/database: SQL migrations and migration CLI
- packages/config: shared config helpers

Runtime:
- Node.js
- TypeScript
- PostgreSQL

Frontend:
- Next.js 16.2.6
- React 19.2.4
- Tailwind CSS 4
- lucide-react
- Admin i18n uses a lightweight local dictionary in `apps/admin/src/lib/admin-i18n.ts` before introducing a heavier localization framework

Backend:
- NestJS 11
- pg
- class-validator / class-transformer
- Swagger/OpenAPI setup

Testing:
- Vitest
- PostgreSQL integration test for commerce flows
```

本项目 Next.js 版本有本地约束：

```text
Before writing or refactoring Next.js code, read relevant local docs under:
node_modules/next/dist/docs/
```

## 2. 当前脚本

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm db:validate
pnpm db:migrate
pnpm db:seed:demo
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store pnpm e2e:commerce
```

开发服务：

```bash
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store API_PORT=4000 pnpm --filter @cross-border/api dev
```

```bash
API_BASE_URL=http://127.0.0.1:4000 PORT=3000 pnpm --filter @cross-border/storefront dev
```

```bash
API_BASE_URL=http://127.0.0.1:4000 PORT=3001 pnpm --filter @cross-border/admin dev
```

## 3. ADR-001 Monorepo Strategy

Decision:

```text
Use pnpm workspaces.
Do not add Nx or Turborepo during MVP unless build time becomes the blocker.
```

Current layout:

```text
apps/
  storefront/
  admin/
  api/

packages/
  shared/
  database/
  config/
```

Reasoning:

```text
- One lockfile and one workspace is enough for the current team size.
- Shared enums, IDs, domain events and config are already factored into packages.
- Adding Nx/Turborepo now would not improve the high-risk commerce flow.
```

## 4. ADR-002 Modular Monolith API

Decision:

```text
Use NestJS modular monolith in apps/api.
Do not split microservices during MVP.
```

Current modules:

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
admin-access
admin-audit
health
```

Rules:

```text
- Domain services own business decisions and state transitions.
- Repositories contain persistence logic, not domain policy.
- Cross-module side effects use use-cases and outbox events.
- High-risk write paths must remain explicit and testable.
```

## 5. ADR-003 PostgreSQL Migrations

Decision:

```text
Use SQL-first migrations managed by packages/database/src/cli.ts.
Do not use generated migrations for high-risk tables.
```

Current migration files:

```text
packages/database/migrations/0001_mvp_core_schema.up.sql
packages/database/migrations/0002_site_foundation.up.sql
packages/database/migrations/0003_site_dimensions_nullable.up.sql
packages/database/migrations/0004_backfill_default_site_dimensions.up.sql
packages/database/migrations/0005_admin_scope_foundation.up.sql
packages/database/migrations/0006_product_dynamic_attributes.up.sql
packages/database/migrations/0007_analytics_multidimensional_stats.up.sql
packages/database/migrations/0008_aftersales_refund_workflow.up.sql
```

Migration rules:

```text
- Use expand -> backfill -> validate -> contract for existing data.
- Add nullable site_id / vertical_id / brand_id first, backfill, then enforce later.
- Never directly rebuild production tables.
- Do not delete old columns before replacement has been validated.
- Every new table must have rollback strategy or explicit irreversible-data note.
```

## 6. ADR-004 Data Access

Decision:

```text
Use pg and explicit SQL for current MVP write paths.
Do not introduce Prisma, TypeORM or Kysely into high-risk transaction paths now.
```

Reasoning:

```text
- Order/payment/inventory need visible row locks and deterministic transaction boundaries.
- Current repositories already use pg with explicit SQL and tests.
- Introducing a query builder mid-MVP would create churn without fixing current gaps.
```

Repository rules:

```text
- Use SELECT ... FOR UPDATE for inventory/payment/order settlement when mutating shared state.
- Use FOR UPDATE SKIP LOCKED for outbox/pipeline claiming.
- Cast JSON and numeric fields explicitly where PostgreSQL type inference can be ambiguous.
- Keep SQL close to the module that owns the table.
```

## 7. ADR-005 Site-aware Architecture

Decision:

```text
Default site remains the first site.
All new storefront reads and writes must use resolved site context.
All admin reads and writes must use admin scope.
```

Rules:

```text
Storefront:
- Resolve domain -> site.
- Inject site_id / vertical_id / brand_id into request context.
- Never trust client-supplied site_id.
- Cart and order must stay within one site.

Admin:
- Resolve admin access from x-admin-user-id where present.
- Fallback global admin access is allowed only for local/dev smoke flows.
- List and detail queries must apply global / vertical / brand / site scope.
- High-risk admin writes must record audit.
- Global admin navigation must use real Next.js routes, not hash anchors.
- Desktop admin sidebar should remain sticky while page content scrolls.
```

## 8. ADR-006 Payment, Outbox And Commerce Pipeline

Decision:

```text
Use PostgreSQL outbox and explicit Commerce Pipeline during MVP.
Do not introduce RabbitMQ/Kafka yet.
```

Current pipeline:

```text
POST /api/admin/operations/process-pending-commerce
```

Pipeline stages:

```text
1. Claim payment_webhook_events where status is received/failed.
2. Process webhook idempotently into payment_transactions.
3. Append PaymentSucceeded or PaymentFailed domain event.
4. Consume PaymentSucceeded to update order and deduct inventory.
5. Project OrderPaid analytics.
```

Payment rules:

```text
- Payment POST requests require idempotencyKey.
- payment_webhook_events(channel_code, provider_event_id) is unique.
- Webhook endpoint accepts provider event, stores it, and returns before downstream processing.
- Repeated webhook cannot repeat order payment, stock deduction or shipment.
- Frontend payment result is never a source of truth.
```

## 9. ADR-006A API Contract Boundary

Decision:

```text
apps/api is the canonical Commerce Core REST API.
apps/storefront and apps/admin may keep Next.js route handlers only as BFF/proxy adapters.
```

Rules:

```text
- OpenAPI is exposed by apps/api at /api/docs and /api/docs-json.
- Unified Admin exposes /api-catalog as the operator-visible API contract directory.
- Business facts, transactions, state machines, idempotency, inventory ledger and audit remain in apps/api.
- Next route handlers may inject x-site-domain, forward admin headers and adapt same-origin UI calls, but must not own commerce state transitions.
- New resource reads should prefer REST-style GET /api/resources and GET /api/resources/:id.
- Domain commands may keep explicit action endpoints when they are not CRUD, such as payment webhooks, commerce pipeline processing, ship and deliver.
- Admin list APIs should gradually accept the same search and pagination fields used by the UI; UI-side filtering is only an interim adapter for small scoped datasets.
```

Reasoning:

```text
- The project already has NestJS controllers and Swagger, but the interface contract was not visible enough to operators or developers.
- Making the API catalog explicit preserves front/back separation without removing useful Next.js BFF routes.
- A full endpoint rename would be a risky big-bang change; the safer path is to document the contract and migrate high-growth lists incrementally.
```

## 10. ADR-007 Inventory Correctness

Decision:

```text
PostgreSQL is the correctness boundary for inventory.
Redis can be added later for cache or rate limiting, not as the source of truth.
```

Inventory model:

```text
available_qty
locked_qty
physical_qty
inbound_qty
safety_qty
```

Required operations:

```text
Create order:
- decrease available_qty
- increase locked_qty
- insert inventory_locks
- insert inventory_transactions

Payment succeeded:
- decrease locked_qty
- decrease physical_qty
- mark locks deducted
- insert inventory_transactions

Payment timeout/cancel:
- increase available_qty
- decrease locked_qty
- mark locks released/expired
- insert inventory_transactions
```

## 11. ADR-008 Frontend And Admin Strategy

Decision:

```text
Keep one storefront codebase and one admin codebase.
Do not copy storefront per site.
```

Storefront current state:

```text
- Default site homepage loads site config and catalog.
- Product display is server-loaded.
- Dedicated product listing, product detail, cart, checkout, payment result, order list, order detail, after-sales request and Account Lite pages exist.
- FAQ, contact support, full login and persistent address book still need implementation.
```

Admin current state:

```text
- Unified admin shell uses real routes, not hash-anchor navigation.
- Desktop sidebar remains fixed while page content scrolls.
- Site/vertical/brand/domain/site-config management pages exist.
- Product, vertical attribute, order, payment, inventory, fulfillment, after-sales, customer, analytics, operations, RBAC and audit pages exist.
- Admin i18n uses a message-key layer plus a static localization fallback for legacy/server-rendered UI copy; business data such as product names, emails, order numbers, SKU, currency and JSON snapshots is not hard-translated by the UI fallback.
```

UI rule:

```text
Operational admin screens should be dense, scannable and task-focused.
Avoid landing-page composition inside admin.
```

## 12. ADR-009 Admin UI Baseline

Decision:

```text
Use Ant Design as the global UI baseline for apps/admin only.
Do not introduce Ant Design into apps/storefront.
```

Admin UI rules:

```text
- apps/admin wraps all pages with Ant Design ConfigProvider and App.
- Global admin shell uses Ant Design Layout, Sider, Menu, Select and Tabs.
- Admin content uses a full-width elastic workspace; page containers must not be capped at a centered max-width.
- Existing server-rendered admin pages inherit Ant Design-inspired global table, card, form and control styling before each page is migrated to native Ant Design components.
- Visible client-side admin action panels should use Ant Design controls for buttons, inputs, search boxes, selects, checkboxes, alerts, cards, statistics and tables instead of native HTML controls.
- Global admin CSS owns background, typography, icon/text alignment, input focus states, button radius, table headers and Ant Design component visual consistency.
- Admin Work Tabs must make the active tab obvious with icon, stronger active background, top accent and close affordance; tabs should not look like undifferentiated white labels.
- Admin metric cards must use a consistent icon/label/value alignment model; icon and label share one baseline, value has a stable line height.
- Scope/site/status selectors should use compact segmented/pill groups rather than scattered free-floating links.
- Header-level Site and Scope selectors should use the same compact panel layout across order, payment, inventory, after-sales, product and attribute pages.
- Wide admin forms should use compact max-width form lanes where full-width stretching hurts scanability, such as category management rows.
- Backend-facing list pages must expose business query fields that fit the domain instead of a single generic dump: orders need order/payment/fulfillment status and created-time filters; payments need payment/webhook status and created-time filters; inventory needs SKU/product/warehouse/order search plus lock/movement filters; after-sales needs request/order/reason/type/status filters; customers need identity/status/created-time filters.
- Admin list filters must preserve `scopeType`, `scopeId`, `siteId` and page size across navigation so UI filtering never widens the backend RBAC scope.
- Every visible admin table that can grow beyond a smoke dataset must have pagination. Server-rendered pages may start with UI-side pagination over the current scoped API result, but backend query parameters should be added when dataset size becomes the bottleneck.
- Vertical Attributes is a configuration page for dynamic catalog fields, storefront filters and search facets. It should lead with purpose, search/filter the editable fields, and keep configuration forms compact rather than presenting disconnected wide cards.
- Search and table composition should follow the `security-admin` style split: query form owns fields/reset/search, resource table owns columns/rows/empty/pagination, and request layer owns API query serialization. Current implementation uses `AdminQueryPanel`, `AdminResourceTable` and `AdminPagination`.
- Admin query forms must use Ant Design controls instead of native form controls: `AdminQueryPanel` renders Ant Design `Form`, `Input`, `Select`, `DatePicker` and `Button`; URL query serialization remains plain strings such as `YYYY-MM-DD`.
- Admin search filters and inline operation forms use a shared control-height baseline. Labels sit above controls; action buttons align to the control row baseline, not the full label+control block center.
- Admin data screens should progressively migrate to Ant Design Card, Statistic, Table, Tag, Button, Form, Select, Drawer and Modal.
- Existing Tailwind utility classes may remain for page-specific spacing and bespoke visuals during incremental migration.
- Storefront keeps its independent brand-facing UI and must not inherit Ant Design styles.
```

Reasoning:

```text
- Unified Admin is an operational system where Ant Design's dense management components fit the workflow.
- Storefront is customer-facing and needs site/brand theming, so coupling it to Ant Design would hurt future multi-site presentation.
- Incremental adoption avoids a big-bang rewrite of existing working admin pages.
```

## 13. ADR-010 Admin Work Tabs

Decision:

```text
Add persistent Admin Work Tabs to the Unified Admin shell.
```

Rules:

```text
- Admin Work Tabs are internal workspace tabs, not browser tabs.
- Tab identity is the normalized admin route pathname.
- Query-string changes update the existing tab instead of creating another tab for the same list route.
- The dashboard tab is always present and not closable.
- Navigating from the left menu opens or activates a tab.
- Activating an existing tab updates its stored route/query/title metadata in place and must not move that tab to the beginning or end of the work-tab list.
- Detail routes such as order, product and after-sales detail may open dedicated tabs.
- Tabs persist in localStorage and survive refresh.
- Closing the active tab redirects to the most recently active remaining tab.
- Each tab stores title, path, query, closable flag and lastActiveAt.
```

Reasoning:

```text
- Operators commonly compare orders, products, refunds, customers and risk rows across pages.
- Browser tabs lose admin context and do not communicate which admin pages were opened inside the workspace.
- Persisting only lightweight route metadata keeps the feature local and reversible.
```

## 14. ADR-011 Admin Dashboard Boundary

Decision:

```text
Upgrade the Unified Admin home route `/` into the Admin Dashboard / 运营总览大屏.
Do not create a separate TV-wall BI route during MVP.
```

Dashboard scope:

```text
- Aggregate existing analytics, operations, order, payment, inventory and after-sales data.
- Support global / vertical / brand / site switching through the existing admin scope model.
- Show GMV, net sales, paid orders, AOV, refund/risk amount, failed webhooks, active inventory locks, paid-unfulfilled orders and pending after-sales.
- Include recent sales trend, channel distribution, product ranking and risk alerts.
- Keep `/analytics` and `/operations` as drill-down pages rather than replacing them.
```

Reasoning:

```text
- The system already has analytics and operations datasets, so the home page should compose them.
- A separate BI wall would add another navigation surface before the MVP operator workflow is stable.
- The dashboard must stay operational and actionable, not purely decorative.
```

## 15. ADR-012 Validation Strategy

Required checks before considering a slice complete:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm db:validate
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store pnpm e2e:commerce
pnpm build
git diff --check
```

For page work, also start all three apps and verify browser rendering:

```bash
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store API_PORT=4000 pnpm --filter @cross-border/api dev
API_BASE_URL=http://127.0.0.1:4000 PORT=3000 pnpm --filter @cross-border/storefront dev
API_BASE_URL=http://127.0.0.1:4000 PORT=3001 pnpm --filter @cross-border/admin dev
```

## 16. ADR-013 Deployment Direction

Decision:

```text
MVP deployment remains Docker Compose + Nginx + PostgreSQL.
Kubernetes is deferred.
```

Rules:

```text
- Migrations run as release step, not from app startup.
- API requires DATABASE_URL.
- Storefront/admin require API_BASE_URL for local SSR/API proxy integration.
- Webhook endpoint must be public HTTPS before real payment provider integration.
- PostgreSQL backups must exist before accepting real orders.
```

## 17. Current Guardrails

```text
- Do not start microservices.
- Do not copy storefront per vertical/site.
- Do not bypass site context.
- Do not bypass admin scope.
- Do not collapse order/payment/fulfillment/aftersales statuses.
- Do not trust frontend payment success.
- Do not mutate inventory without inventory_transactions.
- Do not process payment webhook without provider event id dedupe.
- Do not add complex CRM/BI/AI before completing transaction and operations pages.
```
