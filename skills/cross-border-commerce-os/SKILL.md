---
name: cross-border-commerce-os
description: Use for this repository's Multi-site Vertical Commerce OS work, including architecture docs, page completion, API integration, database migrations, order/payment/inventory/fulfillment/aftersales flows, RBAC scope, audit, local runbooks, and smoke validation. Trigger when working in /Users/julian/cross-border-store or when the user mentions cross-border store, multi-site commerce, unified admin, Commerce Pipeline, payment webhook idempotency, inventory locks, fulfillment, refunds, or project documentation.
---

# Cross-border Commerce OS

Use this skill when working on `/Users/julian/cross-border-store`.

## First Read

Read these files before changing behavior:

```text
CONTEXT.md
docs/current-implementation-baseline.md
docs/commerce-os-architecture.md
docs/mvp-data-model-and-enums.md
docs/technology-decisions.md
docs/commerce-os-runbook.md
docs/agents/domain.md
```

For Next.js frontend/admin changes, also read relevant local Next.js docs under:

```text
node_modules/next/dist/docs/
```

## Core Rules

```text
- Do not rewrite the system from scratch.
- Do not start microservices.
- Preserve default site compatibility.
- Do not trust client-supplied site_id.
- Do not bypass admin RBAC + scope.
- Do not trust frontend payment success.
- Do not collapse order/payment/fulfillment/aftersales statuses into one field.
- Do not mutate inventory without inventory_transactions.
- Do not process payment webhook without provider event id dedupe.
- Do not skip audit for high-risk admin actions.
```

## Current Architecture

```text
apps/storefront: Next.js storefront
apps/admin: Next.js unified admin
apps/api: NestJS modular monolith
packages/shared: enums, events, IDs
packages/database: SQL migrations and CLI
packages/config: shared config helpers
```

Important API modules:

```text
site
product
customer
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

## High-risk Flow

Keep this flow intact:

```text
cart item
-> order created
-> inventory locked
-> payment order created
-> payment webhook received and stored
-> Commerce Pipeline processes webhook
-> PaymentSucceeded event
-> order paid
-> inventory deducted
-> analytics projected
-> fulfillment order created
-> shipment created
-> shipment delivered
-> order completed
-> storefront after-sales request when needed
-> admin refund approval
-> payment refund marked succeeded
-> aftersales completed
```

Expected final state:

```text
order_status = completed
payment_status = paid, partially_refunded or refunded depending refund flow
fulfillment_status = delivered
payment_webhook_events.status = processed
sku_inventory.locked_qty = 0
```

## Local Commands

Database:

```bash
export DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store
pnpm db:migrate
pnpm db:seed:demo
pnpm db:validate
```

Run apps:

```bash
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store API_PORT=4000 pnpm --filter @cross-border/api dev
```

```bash
API_BASE_URL=http://127.0.0.1:4000 NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000 PORT=3000 pnpm --filter @cross-border/storefront dev
```

```bash
API_BASE_URL=http://127.0.0.1:4000 NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:4000 PORT=3001 pnpm --filter @cross-border/admin dev
```

Validation:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm db:validate
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store pnpm e2e:commerce
pnpm build
git diff --check
```

## Development Workflow

For implementation tasks:

```text
1. Inspect current code and docs first.
2. Identify existing behavior and preserve it.
3. Make the smallest vertical slice that completes a user-visible or operator-visible flow.
4. Add or update tests around state transitions, idempotency, scope and inventory effects.
5. Run validation commands.
6. If frontend/admin changed, start all apps and verify in browser.
7. Update docs/runbook when commands, routes or flows change.
```

For documentation tasks:

```text
1. Update CONTEXT.md only when domain language, relationships or ambiguity changed.
2. Update docs/current-implementation-baseline.md if implemented modules, pages, routes or gaps changed.
3. Update docs/commerce-os-architecture.md if module boundaries or target architecture changed.
4. Update docs/mvp-data-model-and-enums.md if migrations, states or data rules changed.
5. Update docs/technology-decisions.md if tool choices or guardrails changed.
6. Update docs/commerce-os-runbook.md if commands, ports, smoke flow or troubleshooting changed.
7. Update docs/agents/skills-usage.md if skill workflow changed.
```

## Page Completion Priorities

Storefront:

```text
1. FAQ and contact support
2. User registration/login
3. Persistent multi-address book and account center
```

Admin:

```text
1. Roles/scopes editing and audit-log detail pages
2. Analytics
3. Customer service tickets
4. Coupons and campaign operations
```

Recently completed page foundations:

```text
- Storefront product listing: /products
- Storefront product detail: /products/[productId]
- Storefront cart page: /cart
- Storefront checkout page: /checkout
- Storefront payment result page: /payment-result
- Storefront order list: /orders
- Storefront order detail: /orders/[orderId]
- Storefront after-sales request from order detail
- Storefront Account Lite: /account
- Unified Admin scope shell with site/scope switcher and risk workspace navigation
- Admin order list: /orders
- Admin order detail: /orders/[orderId]
- Admin payment operations: /payments
- Admin inventory operations: /inventory
- Admin fulfillment actions from order detail: create fulfillment, ship and deliver
- Admin after-sales operations: /after-sales and /after-sales/[requestId]
- Admin refund actions: approve/reject after-sales request and mark refund succeeded
- Admin product catalog operations: /products, /products/[productId] and /product-attributes
- Admin catalog actions: product status, SKU price/status, category updates and vertical attribute options
- Admin product catalog smoke: status active -> admin product list -> storefront product API/page contains DB product
- Admin customer management: /customers scoped Site Customer list with Global User summary, default address and order value
- Customer smoke: Account Lite save -> Checkout address reuse -> Admin /customers visibility
- Admin RBAC and audit operations: /rbac and /audit
- RBAC smoke: global admin assigns site scope, site admin is denied global assignment, audit log records admin_scope.assign with site dimensions
- Admin analytics and operations dashboards: /analytics and /operations
- Dashboard smoke: home route shows operating metrics, sales trend, channel distribution, product ranking, risk alerts, scope/site switching and drill-down links to analytics/operations
- Admin global shell: Ant Design baseline, fixed desktop sidebar, concrete route navigation, persistent Admin Work Tabs, Admin i18n message keys, and static localization fallback across primary admin pages/details
- Admin layout smoke: content workspace is full-width/elastic; list-page query changes must update the existing Admin Work Tab instead of creating duplicate tabs for the same pathname, and activating an existing tab must not reorder the work-tab list
- Admin visual/control smoke: backgrounds, text color, focus states, buttons, inputs, search boxes, selects, checkboxes/radios, alerts, cards, tables and icon/text alignment must follow the global Ant Design baseline; query filters and inline operation forms must use one control-height baseline with action buttons aligned to the control row; visible client-side action panels should prefer Ant Design components over native HTML controls
- Admin scanability smoke: active Admin Work Tab must be visually distinct; metric card icon/label/value alignment must be stable; scope/site/status selectors should be compact grouped controls; wide-screen forms should not stretch fields into disconnected islands
- Admin list query smoke: orders, payments, inventory, after-sales, customers, products and vertical attributes must expose business search/status/date filters plus pagination; query/page changes must preserve Admin Scope/Site and must not create duplicate Admin Work Tabs for the same pathname
- Admin search-table component smoke: follow the `security-admin` SearchForm/SearchTable split; use `AdminQueryPanel`, `AdminResourceTable` and `AdminPagination` for list pages, keeping query fields, columns, empty state and pagination reusable; query inputs, selects, date fields and buttons must be Ant Design controls, not raw HTML controls
- API contract smoke: apps/api is the canonical REST API; OpenAPI must be reachable at /api/docs and /api/docs-json; Unified Admin /api-catalog must expose Storefront/Admin/Webhook/System endpoint groups and state that Next route handlers are BFF/proxy adapters only
- Vertical attribute page smoke: /product-attributes is the dynamic catalog field configuration surface for product edit forms, storefront filters and search facets; it must explain that purpose, filter editable fields before mutation, keep config rows compact and paginate definition tables
- Admin Site Management pages: /verticals, /brands, /sites, /domains and /site-config
- Admin fulfillment queue page: /fulfillment
- Admin navigation/i18n smoke: sidebar links must not fall back to hash anchors; language switcher must persist `commerce_admin_locale`; Chinese mode should not expose obvious static English UI copy on dashboard, site management, product, order, payment, inventory, fulfillment, after-sales, customer, analytics, RBAC, audit or primary detail pages
```

## Migration Policy

```text
- Use SQL migrations in packages/database/migrations.
- Use expand -> backfill -> validate -> contract.
- Add nullable site dimensions first, then backfill, then enforce later.
- Keep rollback files unless irreversible data movement is explicit.
- Do not directly modify production schema outside migrations.
```

## Final Response Requirements

When modifying files, include:

```text
- Concise summary
- Validation commands and results
- Modified file list
- Copyable git status/diff commands
```

Use absolute paths for changed files in final responses.
