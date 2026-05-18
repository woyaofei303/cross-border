# Issue 004: Storefront Orders And Account Lite

Status: done
Triage label: done

## Parent

`.scratch/multi-site-commerce-os/prd.md`

## What to build

Build a minimal current-Site Order List, Order Detail and Account Lite experience for guest and registered future paths. A Shopper should be able to review Orders created in the current Site, inspect status dimensions separately, see shipment details when available, and manage simple address data when available.

This slice should avoid overbuilding authentication. It should establish the Site Customer language and data boundary that later login work can extend.

User stories covered: 14, 15, 16, 21, 22, 23, 56, 59, 60.

## Acceptance criteria

- [x] Storefront has an Order List view scoped to the current Site and shopper identity.
- [x] Storefront has an Order Detail view showing Order Status, Payment Status, Fulfillment Status and Aftersales Status separately.
- [x] Shipment/tracking information is shown when a Shipment exists.
- [x] Account Lite page has a clear placeholder or MVP path for Site Customer identity and addresses.
- [x] Tests cover Order lookup isolation and status display behavior.
- [x] Browser verification confirms an Order created by Checkout can be viewed in current Site Order pages.

## Blocked by

None - can start after checkout/payment result verification
