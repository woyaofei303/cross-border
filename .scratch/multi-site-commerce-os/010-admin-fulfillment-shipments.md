# Issue 010: Admin Fulfillment And Shipments

Status: done
Triage label: implemented

## Parent

`.scratch/multi-site-commerce-os/prd.md`

## What to build

Build Admin fulfillment operations from Order Detail. A Warehouse Operator should be able to create a Fulfillment Order for a paid Order, create a Shipment with carrier and tracking number, and mark the Shipment delivered.

The flow must keep Fulfillment Order and Shipment distinct, and must update Order Fulfillment Status without touching Payment Status.

User stories covered: 41, 42, 43, 35, 36, 52, 56, 57, 58, 59, 60.

## Acceptance criteria

- [x] Paid Orders expose a create Fulfillment Order action in Admin.
- [x] Fulfillment Order detail shows items, warehouse and status.
- [x] Admin can create Shipment with provider and tracking number.
- [x] Admin can mark Shipment delivered and Order becomes completed/delivered when rules allow it.
- [x] High-risk actions write Audit Logs.
- [x] Tests cover paid-only fulfillment, ship, deliver and scoped access.
- [x] Browser verification confirms Admin can fulfill a paid demo Order.

## Dependencies

- `.scratch/multi-site-commerce-os/007-admin-order-detail-operations.md`

## Verification

```text
pnpm --filter @cross-border/api test -- fulfillment
pnpm --filter @cross-border/admin test -- admin-orders
pnpm typecheck
pnpm lint
Browser smoke: http://127.0.0.1:3001/orders/2a765e80-9ecd-4115-a641-c25c59929a82
Screenshot: /tmp/cross-border-store-verification/admin-fulfillment.png
```
