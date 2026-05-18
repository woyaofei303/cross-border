# Issue 008: Admin Payments, Webhooks And Pipeline

Status: done
Triage label: shipped

## Parent

`.scratch/multi-site-commerce-os/prd.md`

## What to build

Build Admin payment operations pages for Payment Orders, Payment Transactions, Payment Webhooks and Commerce Pipeline. A Finance Operator should be able to diagnose payment state, duplicate webhooks, failed processing and pipeline outcomes without using SQL.

Payment Webhook idempotency and backend payment truth must remain central to the UI.

User stories covered: 37, 38, 39, 40, 56, 57, 58, 59, 60.

## Acceptance criteria

- [x] Admin has Payment Order and Payment Transaction lists scoped by Admin Scope.
- [x] Admin has Payment Webhook list with provider event id, event type, status, error and processed time.
- [x] Admin can trigger Commerce Pipeline from the payments/operations surface.
- [x] Pipeline result shows processed, skipped, already processed and failed counts with item details.
- [x] Tests cover scoped payment reads, duplicate webhook visibility and pipeline action result.
- [x] Browser verification confirms a demo webhook can be processed and inspected.

## Blocked by

- Resolved by `.scratch/multi-site-commerce-os/007-admin-order-detail-operations.md`
