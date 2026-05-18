# Issue 011: Admin After-sales And Refunds

Status: done
Triage label: shipped

## Parent

`.scratch/multi-site-commerce-os/prd.md`

## What to build

Build Admin After-sales and Refund operations. A Support Agent should be able to review After-sales Requests with Order context, approve or reject requests, and a Finance Operator should be able to mark Payment Refunds succeeded so that Order and Aftersales statuses reflect actual money movement.

After-sales approval must remain distinct from Refund success.

User stories covered: 44, 45, 46, 47, 52, 56, 57, 58, 59, 60.

## Acceptance criteria

- [x] Admin has After-sales Request list and detail pages filtered by Admin Scope.
- [x] After-sales Detail shows Order context, requested items, reason and requested amount.
- [x] Admin can approve or reject an After-sales Request when rules allow it.
- [x] Admin can mark Payment Refund succeeded and see Order/Aftersales status update.
- [x] High-risk actions write Audit Logs.
- [x] Tests cover approval, rejection, refund success, status propagation and scoped access.
- [x] Browser verification confirms Storefront request -> Admin approval -> refund success flow.

## Blocked by

- `.scratch/multi-site-commerce-os/005-storefront-aftersales-request.md`
- `.scratch/multi-site-commerce-os/007-admin-order-detail-operations.md`
- `.scratch/multi-site-commerce-os/008-admin-payments-webhooks-pipeline.md`

## Implementation notes

- Added Admin `/after-sales` list and `/after-sales/[requestId]` detail pages.
- Added Admin proxies for approving after-sales refund, rejecting request and marking payment refund succeeded.
- Added backend admin after-sales scoped list/detail use cases and repository queries.
- Added `RefundRejected` domain event type and reject request planning.
- Refund approval remains distinct from refund success. Approval creates `payment_refunds.status = requested`; only mark-succeeded updates `orders.payment_status` and completes after-sales.
- High-risk actions write `audit_logs` with site / vertical / brand dimensions. `admin_operation_logs` is additionally written when the request resolves to a database admin user UUID.

## Verification

```bash
pnpm --filter @cross-border/api test -- aftersales
pnpm --filter @cross-border/admin test -- admin-aftersales
pnpm typecheck
```

Browser smoke:

```text
Storefront checkout -> Payment result -> View order -> Submit after-sales request
Admin /after-sales -> after-sales detail -> approve refund -> mark refund succeeded
Final request/order state: completed / refunded / completed
Screenshot: /tmp/cross-border-store-verification/admin-aftersales-refunds.png
```
