# Issue 013: Users, Site Customers And Addresses

Status: done
Triage label: completed

## Parent

`.scratch/multi-site-commerce-os/prd.md`

## What to build

Build the MVP identity and customer-management path needed for Storefront account features and Admin customer visibility. The system should distinguish Global User from Site Customer, support address management for Checkout reuse, and expose Site Customer data to Admin within scope.

This slice should avoid overbuilding full CRM automation.

User stories covered: 21, 22, 23, 49, 56, 58, 59, 60.

## Acceptance criteria

- [x] Storefront has MVP account/login or guest-to-account path appropriate for current system constraints.
- [x] Storefront can manage addresses for Checkout reuse.
- [x] Admin can view Site Customers scoped by Admin Scope.
- [x] Global User and Site Customer concepts are represented distinctly in API/UI language.
- [x] Tests cover Site Customer isolation and address ownership.
- [x] Browser verification confirms address reuse in Checkout or account flow.

## Completion notes

- Added `site_customers` and `site_customer_addresses` through migration `0009_site_customers_addresses` without deleting legacy `users` or `user_addresses`.
- Storefront Account Lite creates/updates a current-site Site Customer and default address through resolved site context.
- Checkout refreshes the stored Site Customer profile and reuses the backend default address snapshot when available.
- Admin `/customers` lists Site Customers, Global User summaries, default addresses and order value under Admin RBAC + Scope.
- Browser verification confirmed Account -> Checkout address reuse and Admin customer visibility.

## Blocked by

- `.scratch/multi-site-commerce-os/004-storefront-orders-account-lite.md`
- `.scratch/multi-site-commerce-os/006-admin-site-scope-shell.md`
