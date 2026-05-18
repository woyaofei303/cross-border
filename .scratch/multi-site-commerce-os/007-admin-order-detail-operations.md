# Issue 007: Admin Order Detail Operations

Status: done
Triage label: completed

## Parent

`.scratch/multi-site-commerce-os/prd.md`

## What to build

Build Admin Order List and Order Detail pages. An Order Operator should be able to find Orders within their Admin Scope, inspect Order snapshots, status logs, Cart origin, Payment Orders, Inventory Locks, Fulfillment Orders, Shipments, Refunds and After-sales Requests.

This slice is read-heavy but must establish the operational detail surface used by later payment, fulfillment and refund actions.

User stories covered: 34, 35, 36, 47, 55, 56, 58, 59, 60.

## Acceptance criteria

- [x] Admin has an Order List filtered by selected Admin Scope.
- [x] Admin has an Order Detail page with separated Order, Payment, Fulfillment and Aftersales statuses.
- [x] Order Detail shows immutable item snapshot, payment records, inventory locks, fulfillment records, refunds and status logs when present.
- [x] Unauthorized scoped Admin Users cannot view out-of-scope Orders.
- [x] Tests cover scoped list/detail access and status display.
- [x] Browser verification confirms a demo Order can be opened from Admin.

## Blocked by

None - can start after admin scope shell verification
