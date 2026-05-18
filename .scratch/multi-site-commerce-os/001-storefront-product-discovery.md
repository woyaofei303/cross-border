# Issue 001: Storefront Product Discovery

Status: done
Triage label: completed

## Parent

`.scratch/multi-site-commerce-os/prd.md`

## What to build

Build a Site-aware Product Listing and Product Detail path for the current Storefront. A Shopper should be able to enter the current Site, browse Products, filter by Category and Vertical Attribute, open a Product Detail page, select a SKU, and see enough price, media and stock context to continue into Cart.

This slice must preserve domain-resolved Site Context and must not let the client choose a trusted `site_id`.

User stories covered: 1, 2, 3, 4, 56, 59, 60.

## Acceptance criteria

- [x] Storefront has a Product Listing page that loads Products for the resolved Site only.
- [x] Product Listing supports Category and Vertical Attribute filtering from current Site/Vertical data.
- [x] Storefront has a Product Detail page with Product media, SKU options, price display and stock availability.
- [x] Direct navigation to another Site's Product or SKU is rejected or hidden.
- [x] Tests cover Site-aware catalog loading and filter behavior.
- [x] Browser verification confirms listing and detail pages render with demo seed data.
- [x] Relevant docs are updated if route names, commands or smoke flow change.

## Implementation notes

- Added `/products` for current-site catalog browsing.
- Added `/products/[productId]` for current-site product detail; unknown or cross-site product ids return `notFound`.
- Product catalog DTO now exposes `availableQty` and `stockStatus` for stock availability UI.

## Blocked by

None - can start immediately
