# Issue 014: Admin RBAC Scopes And Audit

Status: done
Triage label: completed

## Parent

`.scratch/multi-site-commerce-os/prd.md`

## What to build

Build Admin Role, Permission, Scope and Audit Log pages. An Admin Manager should be able to inspect and manage who can access Global, Vertical, Brand or Site data, and an Auditor should be able to trace high-risk actions.

This slice must preserve existing RBAC + Scope foundations and avoid granting broad access accidentally.

User stories covered: 50, 51, 52, 24, 25, 26, 27, 56, 58, 59, 60.

## Acceptance criteria

- [x] Admin has pages for Admin Users, Roles, Permissions and Admin Scopes.
- [x] Admin Scope assignment supports Global, Vertical, Brand and Site scopes.
- [x] Admin has Audit Log page filtered by scope and searchable by actor/action/resource.
- [x] High-risk actions from other modules appear in Audit Log.
- [x] Tests cover scope enforcement and audit record visibility.
- [x] Browser verification confirms scoped Admin RBAC and audit visibility.

## Completion notes

- Added `/api/admin/rbac` and `/api/admin/rbac/users/:adminUserId/scopes`.
- Scope assignment requires a global admin and writes `admin_scope.assign` to audit logs with target scope dimensions.
- Added `/api/admin/audit-logs` with Admin RBAC scope filtering and action/resource/query filters.
- Added Admin `/rbac` and `/audit` pages.
- Demo seed now creates a Global Admin and a Default Site Operator with roles, permissions and scopes.
- Verified a site-scoped admin receives 403 when trying to assign global scope.

## Blocked by

- `.scratch/multi-site-commerce-os/006-admin-site-scope-shell.md`
