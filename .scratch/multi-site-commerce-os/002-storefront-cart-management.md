# Issue 002: Storefront Cart Management

Status: done
Triage label: completed

## Parent

`.scratch/multi-site-commerce-os/prd.md`

## What to build

Build a complete Site-aware Cart page and Cart Line operations for the Storefront. A Shopper should be able to add a SKU from Product Detail, view Cart, update quantities, remove Cart Lines, and see display totals for the current Site and currency.

Cart remains display/pre-checkout state only. Final price truth belongs to Order creation.

User stories covered: 5, 6, 7, 8, 21, 56, 59, 60.

## Acceptance criteria

- [x] Product Detail can add a current-Site SKU to Cart.
- [x] Cart page shows Cart Lines, quantity controls, remove action, subtotal and total display.
- [x] Cart operations support guest identity without cross-Site data mixing.
- [x] Cart rejects or hides SKU operations outside the resolved Site.
- [x] Tests cover Cart Line add/update/remove and Site isolation.
- [x] Browser verification confirms a Shopper can add demo SKU to Cart and update quantity.

## Implementation notes

- Added `/cart` as the current-site cart page.
- Added storefront same-origin cart proxy routes so the client never sends trusted `site_id`.
- Added backend `PATCH /api/cart/items/:skuId` to set cart line quantity.
- Guest cart identity uses browser storage with cookie fallback for restricted browser contexts.

## Blocked by

- `.scratch/multi-site-commerce-os/001-storefront-product-discovery.md`
