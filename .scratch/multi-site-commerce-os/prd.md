# PRD: Multi-site Commerce OS Completion

Status: ready
Triage label: ready-for-agent

## Problem Statement

当前系统已经从早期单站点 Storefront 演进到多站点 Commerce OS 的实现阶段，但前后台仍有大量功能页面没有完成，顾客和运营人员无法通过完整 UI 走完真实业务流程。

从顾客视角看，Storefront 目前主要是 default Site 首页体验，缺少商品列表、商品详情、Cart、Checkout、Payment Result、Order、After-sales 和客服入口，完整购物路径仍依赖 API smoke。

从运营视角看，Unified Admin 目前是单页工作台，已经能看到部分 Site、Vertical、Brand、Analytics、Operations 数据，也能触发 Commerce Pipeline，但缺少订单、支付、库存、履约、售后、商品、用户、权限和审计等独立页面，运营人员无法稳定处理日常交易、异常和售后。

从系统视角看，核心链路已经通过 API 跑通，但用户认证、Site Customer、地址、订单查询、后台详情操作、支付/退款可视化、履约操作页面和审计追踪仍需要产品化。继续开发必须保持多站点、Admin Scope、支付 webhook 幂等、库存流水和状态机正确性。

## Solution

补齐 Multi-site Vertical Commerce OS 的 MVP 操作闭环。

Storefront 侧建立从商品发现到售后申请的完整顾客路径：

```text
Site Domain
-> Product Listing
-> Product Detail
-> Cart
-> Checkout
-> Payment Result
-> Order List
-> Order Detail
-> After-sales Request
-> FAQ / Contact Support
```

Unified Admin 侧建立围绕交易风险模块的运营路径：

```text
Dashboard
-> Site Switcher
-> Product / SKU / Category
-> Inventory
-> Orders
-> Payments / Webhooks
-> Commerce Pipeline
-> Fulfillment / Shipments
-> Refunds / After-sales
-> Users / Site Customers
-> Roles / Scopes
-> Audit Logs
-> Analytics
```

API 侧补齐页面所需的读取、详情、操作和查询接口，保持模块化单体，不拆微服务。所有新增能力必须默认 Site-aware，并在后台自动应用 Admin Scope。

## User Stories

1. As a Shopper, I want to open a Site by domain, so that I see the correct brand, theme, language, currency and catalog.
2. As a Shopper, I want to browse a Product Listing, so that I can discover Products in the current Site.
3. As a Shopper, I want to filter Products by Category and Vertical Attribute, so that I can narrow the collection to relevant SKUs.
4. As a Shopper, I want to view a Product Detail page, so that I can understand price, media, SKU options, delivery promise and stock availability.
5. As a Shopper, I want to add a SKU to Cart, so that I can prepare a purchase within the current Site.
6. As a Shopper, I want my Cart to contain only current Site SKUs, so that cross-site data never mixes.
7. As a Shopper, I want to update Cart Line quantity, so that I can control purchase quantity before Checkout.
8. As a Shopper, I want Cart totals to show current currency and price display, so that I understand the expected payment amount.
9. As a Shopper, I want to enter shipping contact and address in Checkout, so that the Order can be fulfilled.
10. As a Shopper, I want Checkout to validate stock before Order creation, so that I do not pay for unavailable stock.
11. As a Shopper, I want Checkout to create an Order idempotently, so that retrying after a network error does not create duplicate Orders.
12. As a Shopper, I want Payment Result to show pending, paid or failed states, so that I understand whether my purchase is complete.
13. As a Shopper, I want Payment Result to avoid trusting frontend redirects, so that it reflects backend Payment Status.
14. As a Shopper, I want to see my Order List for the current Site, so that I can review purchases made on this Site.
15. As a Shopper, I want to see Order Detail with Order Status, Payment Status, Fulfillment Status and Aftersales Status, so that I understand what is happening.
16. As a Shopper, I want to see Shipment tracking details when available, so that I can track delivery.
17. As a Shopper, I want to request a refund-only After-sales Request, so that I can ask for refund without returning goods when allowed.
18. As a Shopper, I want to request a return-refund After-sales Request, so that I can return goods and request a Refund.
19. As a Shopper, I want to upload or describe After-sales evidence later, so that support can review my request.
20. As a Shopper, I want FAQ and Contact Support entry points, so that I can get help without leaving the Site.
21. As a Guest Shopper, I want guest Cart and guest Order lookup to work safely, so that I can buy without registration in MVP.
22. As a Registered Shopper, I want login and account center, so that I can manage addresses and Orders.
23. As a Site Customer, I want address management, so that I can reuse shipping addresses at Checkout.
24. As a Site Operator, I want a Site Switcher in Unified Admin, so that I can focus on one Site while still using the same backend.
25. As a Global Admin, I want to view all Sites, Verticals and Brands, so that I can manage the whole Commerce OS.
26. As a Vertical Manager, I want all lists filtered to my Vertical, so that I cannot see unrelated vertical data.
27. As a Site Operator, I want all lists filtered to my Site, so that I cannot accidentally process another Site's Orders.
28. As an Admin User, I want Product Management pages, so that I can view Products, SKUs, Categories, Media and prices.
29. As an Admin User, I want Vertical Attribute Management, so that each Vertical can define its own Product attributes.
30. As an Admin User, I want to edit Product status, so that Products can be drafted, activated, inactivated or archived.
31. As an Inventory Operator, I want Inventory Management pages, so that I can view available, locked, physical, inbound and safety quantities.
32. As an Inventory Operator, I want to view Inventory Locks, so that I can diagnose stuck or expired reservations.
33. As an Inventory Operator, I want to view Inventory Transactions, so that every stock movement is traceable.
34. As an Order Operator, I want an Order List, so that I can review paid, unpaid, cancelled and fulfilled Orders.
35. As an Order Operator, I want Order Detail, so that I can see snapshots, Cart origin, payments, inventory locks, fulfillment, refunds and status logs.
36. As an Order Operator, I want Order Status, Payment Status, Fulfillment Status and Aftersales Status displayed separately, so that I do not confuse business states.
37. As a Finance Operator, I want Payment Order and Payment Transaction pages, so that I can reconcile local payment records with providers.
38. As a Finance Operator, I want Payment Webhook records, so that I can diagnose duplicate, failed or unprocessed provider events.
39. As a Finance Operator, I want to trigger Commerce Pipeline, so that pending Payment Webhooks and events can be processed from Admin.
40. As a Finance Operator, I want pipeline result details, so that I can see processed, skipped and failed records.
41. As a Warehouse Operator, I want to create a Fulfillment Order from a paid Order, so that the warehouse can begin shipping.
42. As a Warehouse Operator, I want to create a Shipment with carrier and tracking number, so that delivery can be tracked.
43. As a Warehouse Operator, I want to mark Shipment delivered, so that the Order can complete when delivery is confirmed.
44. As a Support Agent, I want an After-sales Request list, so that I can review refund-only and return-refund requests.
45. As a Support Agent, I want to approve or reject After-sales Requests, so that customer issues are processed consistently.
46. As a Finance Operator, I want to mark Payment Refund succeeded, so that the Order and After-sales statuses reflect actual money movement.
47. As a Support Agent, I want Order context in After-sales Detail, so that I can make a correct decision.
48. As a Customer Service Agent, I want Ticket and Conversation entry points, so that support work can later connect to Orders and Site Customers.
49. As a CRM Operator, I want Site Customer views, so that lifecycle, tags, points and membership can be managed per Site.
50. As an Admin Manager, I want Admin Role and Permission pages, so that access can be granted intentionally.
51. As an Admin Manager, I want Admin Scope assignment, so that users can be limited to Global, Vertical, Brand or Site data.
52. As an Auditor, I want Audit Logs, so that high-risk admin actions can be traced by actor, resource, Site and time.
53. As a Business Analyst, I want Analytics by Global, Vertical, Brand and Site, so that performance can be compared across the Commerce OS.
54. As a Business Analyst, I want Product, Channel and Customer LTV stats, so that merchandising and acquisition decisions can be made.
55. As an Operations Lead, I want a risk dashboard, so that I can see Orders, Payment Webhooks, Inventory Locks, Inventory Transactions, After-sales Requests, Refunds and Audit Logs in one place.
56. As an Engineer, I want all new APIs to be Site-aware, so that data isolation remains correct.
57. As an Engineer, I want all high-risk write APIs to be idempotent where retries are expected, so that network retries do not duplicate state changes.
58. As an Engineer, I want integration tests around Order, Payment, Inventory, Fulfillment and After-sales flows, so that critical state transitions are protected.
59. As an Engineer, I want browser verification for Storefront and Unified Admin pages, so that UI flows are not only API-complete.
60. As an Engineer, I want docs and runbooks updated with every flow change, so that future agents do not repeat stale assumptions.

## Implementation Decisions

- Preserve the modular monolith. Do not introduce microservices for this PRD.
- Preserve one Storefront codebase. Do not copy a frontend project per Site.
- Preserve one Unified Admin codebase. Use Site Switcher and Admin Scope to change data context.
- Treat `CONTEXT.md` as glossary only. Implementation state belongs in implementation baseline and runbooks.
- Keep `Site`, `Vertical`, `Brand`, `Site Domain`, and `Site Config` as the foundation for every new page and API.
- Storefront must resolve Site by domain or server request context. It must not trust a client-provided `site_id`.
- Unified Admin must apply Admin Scope to every list and detail query.
- Global Admin can see all data. Vertical, Brand and Site scoped admins can only see authorized data.
- Use the current default Site as the first Site and preserve backward compatibility.
- Keep Product and SKU distinct. Product pages show SPU-level content and SKU purchase options.
- Use Vertical Attributes for filterable and searchable vertical-specific Product data.
- Cart is Site-scoped and may be guest or registered.
- Cart prices are display-only. Order creation must create immutable price and Product snapshots.
- Order creation must remain idempotent.
- Order, Payment, Fulfillment and Aftersales statuses must remain separate.
- Payment Order creation must remain idempotent.
- Payment Webhook receipt must store provider events idempotently before business processing.
- Commerce Pipeline remains the MVP mechanism for processing pending payment webhooks, payment success events and analytics projections.
- Inventory must keep available, locked, physical, inbound and safety quantities.
- Inventory changes must append Inventory Transactions.
- Fulfillment Order can only be created for paid Orders.
- Shipment is separate from Fulfillment Order and owns carrier/tracking/delivery events.
- After-sales Request is separate from Refund. Approval does not mean money has already moved.
- Refund success must be tied to Payment Refund records and then reflected back to Order/Aftersales state.
- Audit Logs must be recorded for high-risk Admin actions including pipeline processing, fulfillment, shipment delivery, after-sales approval, refund success, inventory adjustment and permission/scope changes.
- Analytics must support Global, Vertical, Brand and Site scopes.
- Storefront route structure should grow from the current homepage into dedicated pages for listing, detail, cart, checkout, payment result, account, orders and aftersales.
- Admin route structure should grow from the current workbench into dedicated pages for operational modules.
- Use existing API modules and add use-cases/repositories/controllers where needed, rather than adding broad generic CRUD layers.
- Prefer deep modules around state machines, idempotency, scope filtering, inventory mutation and pipeline processing.
- Continue using SQL migrations in `packages/database/migrations`.
- Continue using explicit SQL and `pg` for high-risk transactional paths.
- Use server-side data loading for initial Storefront/Admin pages where it simplifies Site Context and Admin Scope.
- Keep real payment provider redirect integration out of MVP until backend payment truth and admin reconciliation are solid.

## Testing Decisions

- Tests should assert external behavior and durable state changes, not private implementation details.
- State machine tests should cover allowed and denied transitions for Order, Payment, Inventory, Fulfillment and Aftersales.
- Payment tests should cover duplicate webhook event ids, unsupported event types, missing signature carriers and successful processing.
- Order tests should cover idempotent create, price snapshot, status logs and transition from payment success.
- Inventory tests should cover lock, deduct, release, insufficient stock and transaction rows.
- Fulfillment tests should cover paid-only fulfillment, ship, deliver and idempotent shipment operations.
- After-sales tests should cover refund request, approval, refund success and status propagation.
- Admin Scope tests should cover Global, Vertical, Brand and Site visibility.
- Audit tests should verify high-risk operations create traceable audit records.
- Storefront tests should cover Site-aware catalog loading, Cart isolation, Checkout order creation and Payment Result state.
- Admin tests should cover Site Switcher filtering, Order Detail data, Pipeline action, Fulfillment action and Refund action.
- Integration tests should continue using real PostgreSQL for Order/Payment/Inventory/Fulfillment/Aftersales flows.
- Browser validation should open Storefront and Unified Admin after meaningful page work.
- Existing prior art includes API module unit tests, PostgreSQL integration test for commerce flows, admin site data tests and storefront site context/catalog tests.
- Standard validation before completion:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm db:validate
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store pnpm e2e:commerce
pnpm build
git diff --check
```

## Out of Scope

- Microservice split.
- App/mobile native client.
- Multi-merchant marketplace.
- AI recommendation.
- AI customer service.
- Complex WMS.
- Complex tax engine.
- Complex marketing automation.
- Personalized merchandising.
- Full real payment provider redirect/settlement launch.
- Kafka/RabbitMQ migration.
- Kubernetes migration.
- Full CRM automation and BI warehouse.
- Rebuilding the current implementation from scratch.

## Further Notes

The highest-risk modules remain Order, Payment, Inventory, Refund, Fulfillment, Permissions and Audit. Product and page completion work must not weaken these invariants.

This PRD should be split into vertical slices before implementation. The first slice should produce a customer-visible Storefront Cart/Checkout/Payment Result flow backed by existing APIs. The second slice should produce an Admin Order Detail and Fulfillment operation flow. The third slice should make After-sales and Refund operational from both Storefront and Admin.

All new work should update `docs/current-implementation-baseline.md` and `docs/commerce-os-runbook.md` when implemented behavior, routes, commands or smoke flows change.
