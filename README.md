This repository is being shaped into a cross-border Commerce OS monorepo.

The current runnable application is the storefront at:

```text
apps/storefront
```

## Getting Started

Run the storefront development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

You can start editing the storefront by modifying:

```text
apps/storefront/src/app/page.tsx
```

## Workspace Commands

```bash
pnpm dev
pnpm dev:api
pnpm db:dev:up
pnpm db:migrate
pnpm db:status
pnpm db:validate
pnpm db:rollback
pnpm db:dev:down
pnpm build
pnpm lint
pnpm test
pnpm test:integration
pnpm typecheck
```

The storefront dev server defaults to `http://localhost:3000`.

The API defaults to port `4000` and exposes:

```text
GET /api/health
```

Database migrations run against `DATABASE_URL` and are stored in:

```text
packages/database/migrations
```

Copy the development environment template before starting local services:

```bash
cp .env.example .env
```

Start the local PostgreSQL service:

```bash
pnpm db:dev:up
```

Validate migration files without connecting to PostgreSQL:

```bash
pnpm db:validate
```

Run and inspect migrations:

```bash
DATABASE_URL=postgres://user:password@localhost:5432/cross_border_store pnpm db:migrate
DATABASE_URL=postgres://user:password@localhost:5432/cross_border_store pnpm db:status
DATABASE_URL=postgres://user:password@localhost:5432/cross_border_store pnpm db:rollback
```

Using the default `.env.example` values:

```bash
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store pnpm db:migrate
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store pnpm db:status
```

Run PostgreSQL-backed integration tests after migrations are available:

```bash
DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store pnpm test:integration
```

The integration test suite is skipped automatically when `DATABASE_URL` is not set.

## Architecture Docs

```text
docs/commerce-os-architecture.md
docs/mvp-data-model-and-enums.md
docs/technology-decisions.md
```

## Planned Apps

```text
apps/storefront
apps/admin
apps/api
```
