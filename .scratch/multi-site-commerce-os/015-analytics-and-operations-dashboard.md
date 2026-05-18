# Issue 015: Analytics And Operations Dashboard

Status: done
Triage label: completed

## Parent

`.scratch/multi-site-commerce-os/prd.md`

## What to build

Build scoped Analytics and Operations dashboards that turn the existing projection data and risk query model into actionable Admin pages. Business Analysts and Operations Leads should be able to compare Global, Vertical, Brand and Site performance while also seeing operational risks.

This slice should remain read-mostly and should not introduce a separate BI warehouse.

User stories covered: 53, 54, 55, 24, 25, 26, 27, 56, 58, 59, 60.

## Acceptance criteria

- [x] Admin Analytics dashboard shows daily sales, channel performance, product performance and customer LTV by selected scope.
- [x] Operations dashboard shows Orders, Payment Webhooks, Inventory Locks, Inventory Transactions, After-sales Requests, Refunds and Audit Logs.
- [x] Scope switching updates analytics and operations data consistently.
- [x] Empty states and stale projection states are visible and understandable.
- [x] Tests cover scoped analytics reads and operations risk rows.
- [x] Browser verification confirms dashboard pages render after Commerce Pipeline/e2e projections.

## Completion notes

- Added Admin `/analytics` page using existing multidimensional projection rows.
- Added Admin `/operations` page using existing operations risk dashboard rows.
- Added shared dashboard helpers for scope path building, analytics scope filtering, dimension filtering and amount formatting.
- Admin shell now links Analytics and Risk Ops to the dedicated pages.
- Browser verification captured `/analytics` and `/operations` screenshots.

## Blocked by

- `.scratch/multi-site-commerce-os/006-admin-site-scope-shell.md`
- `.scratch/multi-site-commerce-os/008-admin-payments-webhooks-pipeline.md`
