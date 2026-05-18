# Issue 012: Admin Product Catalog Management

Status: done
Triage label: accepted

## Parent

`.scratch/multi-site-commerce-os/prd.md`

## What to build

Build Admin Product, SKU, Category and Vertical Attribute management pages. An Admin User should be able to view and manage Site-scoped catalog data, edit Product status, and maintain dynamic attributes for each Vertical.

This slice should make catalog operations usable without weakening Product/SKU/Site boundaries.

User stories covered: 28, 29, 30, 2, 3, 4, 56, 59, 60.

## Acceptance criteria

- [x] Admin has Product List and Product Detail/Edit pages scoped by selected Site/Vertical/Brand.
- [x] Admin can view and edit SKU basics, price display data and status.
- [x] Admin can view and manage Categories for the selected Site.
- [x] Admin can view and manage Vertical Attributes and options.
- [x] Product status changes are audited.
- [x] Tests cover scoped catalog reads, dynamic attributes and status mutation.
- [x] Browser verification confirms catalog changes are reflected on Storefront where applicable.

## Implemented scope

```text
API:
- GET /api/admin/products
- GET /api/admin/products/:productId
- GET /api/admin/categories
- POST /api/admin/products/:productId/status
- POST /api/admin/skus/:skuId/update
- POST /api/admin/categories/:categoryId/update
- POST /api/admin/product-attributes
- POST /api/admin/product-attributes/:attributeId/update
- POST /api/admin/product-attributes/:attributeId/options

Admin:
- /products
- /products/[productId]
- /product-attributes
- Next.js API proxy routes for catalog mutations
```

## Verification notes

```text
- Product status mutation through Admin proxy returns site_id / vertical_id / brand_id.
- inactive product is removed from Storefront /products.
- active product is restored to Storefront /products.
- audit_logs records product.update_status with site_id / vertical_id / brand_id.
- HTTP/browser smoke captured Admin product list, vertical attributes and Storefront product list behavior.
```

## Validation commands

```bash
pnpm --filter @cross-border/api test -- product
pnpm --filter @cross-border/admin test -- admin-products admin-product-attributes
pnpm typecheck
pnpm lint
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store pnpm db:validate
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store pnpm e2e:commerce
pnpm build
git diff --check
```
