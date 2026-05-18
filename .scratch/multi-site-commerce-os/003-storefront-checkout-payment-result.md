# Issue 003: Storefront Checkout And Payment Result

Status: done
Triage label: completed

## Parent

`.scratch/multi-site-commerce-os/prd.md`

## What to build

Build Checkout and Payment Result pages backed by the existing Order, Inventory Lock, Payment Order, Payment Webhook and Commerce Pipeline flow. A Shopper should be able to check out from Cart, create an idempotent Order, create a Payment Order, simulate or complete the MVP payment callback path, and land on a Payment Result page that reads backend truth.

Payment Result must not trust a frontend redirect as proof of Payment success.

User stories covered: 9, 10, 11, 12, 13, 21, 56, 57, 58, 59, 60.

## Acceptance criteria

- [x] Checkout captures shipping contact/address fields needed for MVP Order creation.
- [x] Checkout creates one idempotent Order from the current Cart and locks inventory.
- [x] Checkout creates one idempotent Payment Order for the Order.
- [x] Payment Result page shows pending, paid or failed state from backend records.
- [x] Demo payment path can drive webhook receipt and Commerce Pipeline processing without trusting frontend success.
- [x] Tests cover idempotent checkout retry, inventory lock, Payment Order creation and Payment Result state.
- [x] Browser verification confirms Cart -> Checkout -> Payment Result works with demo seed data.

## Blocked by

None - can start immediately
