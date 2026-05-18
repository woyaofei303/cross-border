# Issue 006: Admin Site Scope Shell

Status: done
Triage label: completed

## Parent

`.scratch/multi-site-commerce-os/prd.md`

## What to build

Upgrade the Unified Admin shell into a scoped operations workspace. An Admin User should have a Site Switcher, clear current Scope context, and navigation into all planned operational modules. Lists and detail pages introduced later should inherit this scope model.

This slice makes no broad business mutation; it establishes the operator frame for all following Admin pages.

User stories covered: 24, 25, 26, 27, 55, 56, 59, 60.

## Acceptance criteria

- [x] Unified Admin shows current Admin Scope and selected Site/Vertical/Brand context.
- [x] Site Switcher can select Global, Vertical, Brand or Site viewing modes where access allows it.
- [x] Admin navigation includes Orders, Payments, Inventory, Fulfillment, After-sales, Products, Customers, Roles/Scopes, Audit and Analytics.
- [x] Admin data loading applies Admin Scope consistently to existing dashboard data.
- [x] Tests cover scope selection and visibility rules.
- [x] Browser verification confirms Admin shell and navigation render correctly.

## Implementation notes

- Added a top-level scope switcher and a scoped workspace summary for current Site, Vertical and Brand.
- Scope buttons are disabled when the loaded Admin access context does not allow that scope type.
- Existing analytics and risk operations tables continue to use the active scope filter.

## Blocked by

None - can start immediately
