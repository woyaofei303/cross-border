# Issue 009: Admin Inventory Operations

Status: done
Triage label: completed

## Parent

`.scratch/multi-site-commerce-os/prd.md`

## What to build

Build Admin Inventory pages for SKU inventory balances, Inventory Locks and Inventory Transactions. An Inventory Operator should be able to trace stock from available quantity through lock, deduct, release or expiry for the selected Site/Vertical/Brand scope.

This slice should focus on visibility and traceability. Manual adjustment can be added only if it writes Inventory Transactions and Audit Logs.

User stories covered: 31, 32, 33, 55, 56, 58, 59, 60.

## Acceptance criteria

- [x] Admin has Inventory Balance list showing available, locked, physical, inbound and safety quantities.
- [x] Admin has Inventory Lock list showing status, expiry, release and deduction data.
- [x] Admin has Inventory Transaction list showing before/after quantities and idempotency key.
- [x] Inventory pages are filtered by Admin Scope.
- [x] Tests cover scoped inventory reads and transaction trace display.
- [x] Browser verification confirms demo SKU stock and transactions are visible after checkout/payment.

## Blocked by

- `.scratch/multi-site-commerce-os/006-admin-site-scope-shell.md`
