# Issue 005: Storefront After-sales Request

Status: done
Triage label: completed

## Parent

`.scratch/multi-site-commerce-os/prd.md`

## What to build

Build the Storefront After-sales Request path from Order Detail. A Shopper should be able to request refund-only or return-refund service for eligible Order Items, provide reason/details, and then see the request state reflected on Order Detail.

After-sales Request must remain distinct from Refund. Creating or approving a request must not imply money has moved.

User stories covered: 17, 18, 19, 44, 47, 56, 58, 59, 60.

## Acceptance criteria

- [x] Order Detail exposes After-sales Request action when Order state allows it.
- [x] Shopper can create refund-only and return-refund requests for current-Site Orders.
- [x] Request reason/details are captured and attached to the Order context.
- [x] Order Detail shows Aftersales Status separately after request creation.
- [x] Tests cover Site isolation, eligible state checks and request creation.
- [x] Browser verification confirms a demo Order can produce an After-sales Request.

## Implementation notes

- Added an after-sales panel to `/orders/[orderId]`.
- Added storefront BFF route `POST /api/after-sales/refund-requests`.
- Added frontend eligibility helpers for payment and aftersales status.
- Hardened backend request planning so public after-sales creation requires a user or guest buyer scope.
- Creating a request sets order `aftersales_status = requested`; approval/refund movement remains an admin/payment concern.

## Blocked by

None - can start after order detail verification
