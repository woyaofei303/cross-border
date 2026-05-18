# MVP Data Model And Enums

本文档维护当前 Commerce OS MVP 的数据模型、枚举、迁移基线和高风险状态规则。

注意：项目已经进入实现阶段。本文早期 SQL 草案仍可作为建模参考，但正式数据库结构以 `packages/database/migrations/*.sql` 为准。修改表结构时必须新增 migration，不得直接改已运行数据库。

## 0. 当前 migration 基线

当前 migration 文件：

```text
0001_mvp_core_schema
0002_site_foundation
0003_site_dimensions_nullable
0004_backfill_default_site_dimensions
0005_admin_scope_foundation
0006_product_dynamic_attributes
0007_analytics_multidimensional_stats
0008_aftersales_refund_workflow
```

当前已经落地的关键模型：

```text
Multi-site foundation:
- verticals
- brands
- sites
- site_domains
- site_configs

Site-aware core:
- products
- product_skus
- product_categories
- product_media
- sku_prices
- carts
- cart_items
- orders
- order_items
- payment_orders
- payment_transactions
- payment_webhook_events
- warehouses
- sku_inventory
- inventory_locks
- inventory_transactions
- fulfillment_orders
- fulfillment_items
- shipments
- shipment_tracking_events
- after_sales_requests
- payment_refunds
- analytics_events
- daily_sales_stats
- channel_performance_stats
- product_performance_stats
- customer_ltv_stats
- admin_operation_logs
- audit_logs

Admin scope:
- admin_user_scopes

Dynamic attributes:
- vertical_attributes
- vertical_attribute_options
- product_attribute_values
```

当前 demo seed 固定数据：

```text
siteId:      00000000-0000-4000-8000-000000000301
verticalId:  00000000-0000-4000-8000-000000000101
brandId:     00000000-0000-4000-8000-000000000201
productId:   00000000-0000-4000-8000-000000001002
skuId:       00000000-0000-4000-8000-000000001003
warehouseId: 00000000-0000-4000-8000-000000001004
currency:    USD
```

校验命令：

```bash
export DATABASE_URL=postgres://cross_border:cross_border_password@localhost:5432/cross_border_store
pnpm db:validate
pnpm db:migrate
pnpm db:seed:demo
DATABASE_URL=$DATABASE_URL pnpm e2e:commerce
```

## 0.1 当前高风险状态基线

订单状态分列：

```text
order_status:
- pending_payment
- payment_processing
- paid
- confirmed
- partially_fulfilled
- fulfilled
- completed
- cancelled
- closed

payment_status:
- unpaid
- processing
- paid
- failed
- partially_refunded
- refunded
- chargeback

fulfillment_status:
- unfulfilled
- pending
- partially_shipped
- shipped
- delivered
- failed

aftersales_status:
- none
- requested
- reviewing
- approved
- rejected
- returning
- received
- refunding
- completed
- closed
```

支付回调状态：

```text
payment_webhook_status:
- received
- processing
- processed
- failed
- dead_letter
```

库存字段：

```text
sku_inventory:
- available_qty
- locked_qty
- physical_qty
- inbound_qty
- safety_qty
```

库存锁状态：

```text
inventory_lock_status:
- locked
- released
- deducted
- expired
```

Commerce Pipeline 当前负责：

```text
1. claim pending payment_webhook_events
2. process webhook into payment_transactions and PaymentSucceeded/PaymentFailed events
3. consume PaymentSucceeded to update order and deduct inventory
4. project OrderPaid analytics
```

## 1. MVP 范围

第一批 MVP 只覆盖交易闭环和后台基础运营。

```text
Included:
- User/Auth
- Product
- Cart
- Order
- Payment
- Inventory
- Fulfillment Basic
- After-sales Basic
- Admin/RBAC
- Audit
- Domain Events / Outbox

Deferred:
- CRM 深度画像
- 营销自动化
- BI 大屏
- AI 客服
- 多仓智能拆单
- 多支付路由策略引擎
- OpenSearch 同步任务
```

第一批 migration 表清单：

```text
Identity:
- users
- user_profiles
- user_addresses
- site_customers
- site_customer_addresses
- user_login_logs

Admin:
- admin_users
- admin_roles
- admin_permissions
- admin_user_roles
- admin_role_permissions
- admin_operation_logs

Product:
- product_categories
- products
- product_skus
- product_media
- product_translations
- sku_prices
- sku_region_rules

Cart:
- carts
- cart_items

Order:
- orders
- order_items
- order_status_logs
- order_events

Payment:
- payment_channels
- payment_orders
- payment_transactions
- payment_webhook_events
- payment_refunds
- payment_chargebacks

Inventory:
- warehouses
- sku_inventory
- inventory_locks
- inventory_transactions

Fulfillment:
- fulfillment_orders
- fulfillment_items
- logistics_providers
- shipments
- shipment_tracking_events

After-sales:
- after_sales_requests
- after_sales_items
- after_sales_logs
- after_sales_attachments

Events and Audit:
- domain_events
- event_process_logs
- audit_logs
```

## 2. 数据建模规范

### 2.1 ID 和编号

```text
Primary key:
- 所有业务表使用 UUID 主键。

Public number:
- order_no、payment_no、refund_no、fulfillment_no、request_no 使用业务编号。
- 禁止直接暴露数据库自增 ID。

Recommended format:
- order_no: CB + yyyyMMdd + random/base36 sequence
- payment_no: PAY + yyyyMMdd + random/base36 sequence
- refund_no: REF + yyyyMMdd + random/base36 sequence
- fulfillment_no: FUL + yyyyMMdd + random/base36 sequence
- after_sales request_no: AS + yyyyMMdd + random/base36 sequence
```

### 2.2 金额

```text
- 金额字段统一 NUMERIC(18,2)。
- currency 使用 ISO 4217 三位币种码，例如 USD、EUR、GBP。
- 订单必须保存 price_snapshot。
- 支付和退款金额必须和 currency 同时存储。
```

### 2.3 时间

```text
- 时间字段统一 TIMESTAMPTZ。
- created_at 必填。
- updated_at 对可变业务表必填。
- 状态完成类时间使用 paid_at、cancelled_at、closed_at、succeeded_at、failed_at。
```

### 2.4 幂等

```text
Required idempotency keys:
- orders(user_id, idempotency_key)
- payment_orders(idempotency_key)
- payment_refunds(idempotency_key)
- inventory_locks(idempotency_key)
- inventory_transactions(idempotency_key)

Required external de-dup keys:
- payment_webhook_events(channel_code, provider_event_id)
- payment_transactions(channel_code, provider_transaction_id)
- shipments(provider_id, tracking_no)
```

### 2.5 删除策略

```text
- 关键业务表不做物理删除。
- 使用 status、deleted_at 或 is_active 表达禁用。
- 审计日志、支付 webhook、库存流水、订单状态日志只追加。
```

## 3. 枚举定义

后续如果使用 PostgreSQL enum，建议先使用 CHECK + 应用层 enum。原因是 MVP 阶段状态仍可能调整，CHECK 迁移成本低于 PostgreSQL enum。

### 3.1 用户枚举

```text
user_status:
- active
- disabled
- blocked

user_type:
- guest
- registered

risk_level:
- normal
- watch
- high
- blocked

login_type:
- email
- phone
- oauth

admin_user_status:
- active
- disabled
```

### 3.2 商品枚举

```text
product_status:
- draft
- active
- inactive
- archived

sku_status:
- active
- inactive
- archived

media_type:
- image
- video

region_rule_status:
- sellable
- blocked
```

### 3.3 购物车枚举

```text
cart_status:
- active
- converted
- abandoned
- closed
```

### 3.4 订单枚举

```text
order_status:
- pending_payment
- payment_processing
- paid
- confirmed
- partially_fulfilled
- fulfilled
- completed
- cancelled
- closed

payment_status:
- unpaid
- processing
- paid
- failed
- partially_refunded
- refunded
- chargeback

fulfillment_status:
- unfulfilled
- pending
- partially_shipped
- shipped
- delivered
- failed

aftersales_status:
- none
- requested
- reviewing
- approved
- rejected
- returning
- received
- refunding
- completed
- closed

operator_type:
- user
- admin
- system
```

### 3.5 支付枚举

```text
payment_channel_status:
- active
- inactive

payment_order_status:
- created
- processing
- succeeded
- failed
- cancelled
- expired

payment_transaction_type:
- authorize
- capture
- sale
- refund
- chargeback

payment_transaction_status:
- pending
- succeeded
- failed

payment_webhook_status:
- received
- processing
- processed
- failed
- dead_letter

payment_refund_status:
- requested
- processing
- succeeded
- failed
- cancelled

chargeback_status:
- opened
- won
- lost
- closed
```

### 3.6 库存枚举

```text
warehouse_status:
- active
- inactive

inventory_lock_status:
- locked
- released
- deducted
- expired

inventory_transaction_type:
- initial
- adjust
- lock
- release
- deduct
- return_restock
```

### 3.7 履约和售后枚举

```text
fulfillment_order_status:
- pending
- picking
- packed
- shipped
- partially_shipped
- delivered
- cancelled
- failed

shipment_status:
- created
- shipped
- in_transit
- delivered
- exception
- returned

after_sales_type:
- refund_only
- return_refund
- exchange

after_sales_request_status:
- requested
- reviewing
- approved
- rejected
- returning
- received
- refunding
- completed
- closed

return_quality_status:
- sellable
- damaged
- missing
```

### 3.8 权限、事件、审计枚举

```text
permission_type:
- menu
- action
- data

domain_event_status:
- pending
- processing
- processed
- failed
- dead_letter

event_process_status:
- processing
- processed
- failed

audit_actor_type:
- user
- admin
- system
```

## 4. MVP SQL 草案

### 4.1 Extensions

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### 4.2 Identity

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(64) UNIQUE,
  password_hash TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  user_type VARCHAR(32) NOT NULL DEFAULT 'registered',
  default_locale VARCHAR(16),
  default_currency CHAR(3),
  risk_level VARCHAR(32) NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('active', 'disabled', 'blocked')),
  CHECK (user_type IN ('guest', 'registered')),
  CHECK (risk_level IN ('normal', 'watch', 'high', 'blocked')),
  CHECK (email IS NOT NULL OR phone IS NOT NULL OR user_type = 'guest')
);

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  first_name VARCHAR(128),
  last_name VARCHAR(128),
  birthday DATE,
  country_code VARCHAR(8),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  country_code VARCHAR(8) NOT NULL,
  province VARCHAR(128),
  city VARCHAR(128),
  postal_code VARCHAR(64),
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  recipient_name VARCHAR(255) NOT NULL,
  recipient_phone VARCHAR(64),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_user_addresses_default
  ON user_addresses(user_id)
  WHERE is_default = TRUE;

CREATE TABLE site_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_user_id UUID REFERENCES users(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  vertical_id UUID NOT NULL REFERENCES verticals(id),
  brand_id UUID NOT NULL REFERENCES brands(id),
  guest_token VARCHAR(128),
  email VARCHAR(255),
  phone VARCHAR(64),
  nickname VARCHAR(128),
  membership_level VARCHAR(64) NOT NULL DEFAULT 'standard',
  points INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('active', 'disabled', 'blocked')),
  CHECK (points >= 0),
  CHECK (
    global_user_id IS NOT NULL
    OR guest_token IS NOT NULL
    OR email IS NOT NULL
    OR phone IS NOT NULL
  )
);

CREATE UNIQUE INDEX ux_site_customers_global_user
  ON site_customers(site_id, global_user_id)
  WHERE global_user_id IS NOT NULL;

CREATE UNIQUE INDEX ux_site_customers_guest
  ON site_customers(site_id, guest_token)
  WHERE guest_token IS NOT NULL;

CREATE TABLE site_customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_customer_id UUID NOT NULL REFERENCES site_customers(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id),
  vertical_id UUID NOT NULL REFERENCES verticals(id),
  brand_id UUID NOT NULL REFERENCES brands(id),
  label VARCHAR(64),
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  phone VARCHAR(64),
  country_code VARCHAR(8) NOT NULL,
  region VARCHAR(120),
  city VARCHAR(120) NOT NULL,
  postal_code VARCHAR(32) NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_site_customer_addresses_default
  ON site_customer_addresses(site_customer_id)
  WHERE is_default = TRUE;

CREATE TABLE user_login_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  login_type VARCHAR(32) NOT NULL,
  ip_address VARCHAR(64),
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (login_type IN ('email', 'phone', 'oauth'))
);
```

### 4.3 Admin And RBAC

```sql
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('active', 'disabled'))
);

CREATE TABLE admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(128) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  type VARCHAR(32) NOT NULL,
  resource VARCHAR(128) NOT NULL,
  action VARCHAR(64) NOT NULL,
  parent_id UUID REFERENCES admin_permissions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (type IN ('menu', 'action', 'data'))
);

CREATE TABLE admin_user_roles (
  admin_user_id UUID NOT NULL REFERENCES admin_users(id),
  role_id UUID NOT NULL REFERENCES admin_roles(id),
  PRIMARY KEY (admin_user_id, role_id)
);

CREATE TABLE admin_role_permissions (
  role_id UUID NOT NULL REFERENCES admin_roles(id),
  permission_id UUID NOT NULL REFERENCES admin_permissions(id),
  PRIMARY KEY (role_id, permission_id)
);
```

### 4.4 Product

```sql
CREATE TABLE product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES product_categories(id),
  slug VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES product_categories(id),
  spu_code VARCHAR(128) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  seo_title VARCHAR(255),
  seo_description TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('draft', 'active', 'inactive', 'archived'))
);

CREATE TABLE product_skus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  sku_code VARCHAR(128) NOT NULL UNIQUE,
  title VARCHAR(255),
  attributes JSONB NOT NULL DEFAULT '{}',
  weight_gram INT,
  length_mm INT,
  width_mm INT,
  height_mm INT,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('active', 'inactive', 'archived')),
  CHECK (weight_gram IS NULL OR weight_gram >= 0),
  CHECK (length_mm IS NULL OR length_mm >= 0),
  CHECK (width_mm IS NULL OR width_mm >= 0),
  CHECK (height_mm IS NULL OR height_mm >= 0)
);

CREATE TABLE product_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  sku_id UUID REFERENCES product_skus(id),
  media_type VARCHAR(32) NOT NULL,
  url TEXT NOT NULL,
  alt_text VARCHAR(255),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (media_type IN ('image', 'video'))
);

CREATE TABLE product_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  locale VARCHAR(16) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  seo_title VARCHAR(255),
  seo_description TEXT,
  UNIQUE (product_id, locale)
);

CREATE TABLE sku_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID NOT NULL REFERENCES product_skus(id),
  currency CHAR(3) NOT NULL,
  region_code VARCHAR(16),
  list_price NUMERIC(18,2) NOT NULL,
  sale_price NUMERIC(18,2),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sku_id, currency, region_code),
  CHECK (list_price >= 0),
  CHECK (sale_price IS NULL OR sale_price >= 0),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE sku_region_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID NOT NULL REFERENCES product_skus(id),
  region_code VARCHAR(16) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'sellable',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sku_id, region_code),
  CHECK (status IN ('sellable', 'blocked'))
);
```

### 4.5 Cart

```sql
CREATE TABLE carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  guest_token VARCHAR(128),
  currency CHAR(3) NOT NULL,
  country_code VARCHAR(8),
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('active', 'converted', 'abandoned', 'closed')),
  CHECK (user_id IS NOT NULL OR guest_token IS NOT NULL)
);

CREATE INDEX ix_carts_user_status ON carts(user_id, status);
CREATE INDEX ix_carts_guest_status ON carts(guest_token, status);

CREATE TABLE cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES carts(id),
  sku_id UUID NOT NULL REFERENCES product_skus(id),
  quantity INT NOT NULL,
  display_unit_price NUMERIC(18,2) NOT NULL,
  display_currency CHAR(3) NOT NULL,
  selected BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cart_id, sku_id),
  CHECK (quantity > 0),
  CHECK (display_unit_price >= 0)
);
```

### 4.6 Order

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(64) NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id),
  guest_token VARCHAR(128),
  order_status VARCHAR(32) NOT NULL,
  payment_status VARCHAR(32) NOT NULL,
  fulfillment_status VARCHAR(32) NOT NULL,
  aftersales_status VARCHAR(32) NOT NULL DEFAULT 'none',
  currency CHAR(3) NOT NULL,
  subtotal_amount NUMERIC(18,2) NOT NULL,
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  shipping_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18,2) NOT NULL,
  country_code VARCHAR(8),
  shipping_address_snapshot JSONB NOT NULL,
  billing_address_snapshot JSONB,
  price_snapshot JSONB NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  CHECK (user_id IS NOT NULL OR guest_token IS NOT NULL),
  CHECK (order_status IN (
    'pending_payment',
    'payment_processing',
    'paid',
    'confirmed',
    'partially_fulfilled',
    'fulfilled',
    'completed',
    'cancelled',
    'closed'
  )),
  CHECK (payment_status IN (
    'unpaid',
    'processing',
    'paid',
    'failed',
    'partially_refunded',
    'refunded',
    'chargeback'
  )),
  CHECK (fulfillment_status IN (
    'unfulfilled',
    'pending',
    'partially_shipped',
    'shipped',
    'delivered',
    'failed'
  )),
  CHECK (aftersales_status IN (
    'none',
    'requested',
    'reviewing',
    'approved',
    'rejected',
    'returning',
    'received',
    'refunding',
    'completed',
    'closed'
  )),
  CHECK (subtotal_amount >= 0),
  CHECK (discount_amount >= 0),
  CHECK (shipping_amount >= 0),
  CHECK (tax_amount >= 0),
  CHECK (total_amount >= 0)
);

CREATE UNIQUE INDEX ux_orders_user_idempotency
  ON orders(user_id, idempotency_key)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX ux_orders_guest_idempotency
  ON orders(guest_token, idempotency_key)
  WHERE guest_token IS NOT NULL;

CREATE INDEX ix_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX ix_orders_status_created ON orders(order_status, created_at DESC);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  product_id UUID NOT NULL REFERENCES products(id),
  sku_id UUID NOT NULL REFERENCES product_skus(id),
  sku_code VARCHAR(128) NOT NULL,
  product_title TEXT NOT NULL,
  sku_title TEXT,
  image_url TEXT,
  unit_price NUMERIC(18,2) NOT NULL,
  quantity INT NOT NULL,
  discount_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18,2) NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (unit_price >= 0),
  CHECK (quantity > 0),
  CHECK (discount_amount >= 0),
  CHECK (total_amount >= 0)
);

CREATE INDEX ix_order_items_order ON order_items(order_id);
CREATE INDEX ix_order_items_sku ON order_items(sku_id);

CREATE TABLE order_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  status_type VARCHAR(32) NOT NULL,
  from_status VARCHAR(32),
  to_status VARCHAR(32) NOT NULL,
  reason TEXT,
  operator_type VARCHAR(32) NOT NULL,
  operator_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status_type IN ('order', 'payment', 'fulfillment', 'aftersales')),
  CHECK (operator_type IN ('user', 'admin', 'system'))
);

CREATE INDEX ix_order_status_logs_order ON order_status_logs(order_id, created_at DESC);

CREATE TABLE order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  event_type VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_order_events_order ON order_events(order_id, created_at DESC);
```

### 4.7 Payment

```sql
CREATE TABLE payment_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  payment_no VARCHAR(64) NOT NULL UNIQUE,
  channel_code VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  provider_payment_id VARCHAR(128),
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  request_payload JSONB,
  response_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  succeeded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  CHECK (status IN ('created', 'processing', 'succeeded', 'failed', 'cancelled', 'expired')),
  CHECK (amount >= 0)
);

CREATE INDEX ix_payment_orders_order ON payment_orders(order_id);
CREATE INDEX ix_payment_orders_provider ON payment_orders(channel_code, provider_payment_id);

CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_order_id UUID NOT NULL REFERENCES payment_orders(id),
  channel_code VARCHAR(32) NOT NULL,
  provider_transaction_id VARCHAR(128) NOT NULL,
  transaction_type VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel_code, provider_transaction_id),
  CHECK (transaction_type IN ('authorize', 'capture', 'sale', 'refund', 'chargeback')),
  CHECK (status IN ('pending', 'succeeded', 'failed')),
  CHECK (amount >= 0)
);

CREATE INDEX ix_payment_transactions_payment_order ON payment_transactions(payment_order_id);

CREATE TABLE payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_order_id UUID REFERENCES payment_orders(id),
  channel_code VARCHAR(32) NOT NULL,
  provider_event_id VARCHAR(128) NOT NULL,
  event_type VARCHAR(128) NOT NULL,
  provider_object_id VARCHAR(128),
  raw_payload JSONB NOT NULL,
  signature_header TEXT,
  status VARCHAR(32) NOT NULL,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE (channel_code, provider_event_id),
  CHECK (status IN ('received', 'processing', 'processed', 'failed', 'dead_letter'))
);

CREATE INDEX ix_payment_webhook_events_status ON payment_webhook_events(status, received_at);
CREATE INDEX ix_payment_webhook_events_provider_object ON payment_webhook_events(channel_code, provider_object_id);

CREATE TABLE payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_order_id UUID NOT NULL REFERENCES payment_orders(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  refund_no VARCHAR(64) NOT NULL UNIQUE,
  provider_refund_id VARCHAR(128),
  status VARCHAR(32) NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  reason TEXT,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  request_payload JSONB,
  response_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  succeeded_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  CHECK (status IN ('requested', 'processing', 'succeeded', 'failed', 'cancelled')),
  CHECK (amount > 0)
);

CREATE INDEX ix_payment_refunds_order ON payment_refunds(order_id);
CREATE INDEX ix_payment_refunds_provider ON payment_refunds(provider_refund_id);

CREATE TABLE payment_chargebacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_order_id UUID NOT NULL REFERENCES payment_orders(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  provider_dispute_id VARCHAR(128) NOT NULL UNIQUE,
  status VARCHAR(32) NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  currency CHAR(3) NOT NULL,
  reason TEXT,
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('opened', 'won', 'lost', 'closed')),
  CHECK (amount >= 0)
);
```

### 4.8 Inventory

```sql
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  country_code VARCHAR(8) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE sku_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID NOT NULL REFERENCES product_skus(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  available_qty INT NOT NULL DEFAULT 0,
  locked_qty INT NOT NULL DEFAULT 0,
  physical_qty INT NOT NULL DEFAULT 0,
  inbound_qty INT NOT NULL DEFAULT 0,
  safety_qty INT NOT NULL DEFAULT 0,
  version INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (sku_id, warehouse_id),
  CHECK (available_qty >= 0),
  CHECK (locked_qty >= 0),
  CHECK (physical_qty >= 0),
  CHECK (inbound_qty >= 0),
  CHECK (safety_qty >= 0),
  CHECK (available_qty + locked_qty <= physical_qty + inbound_qty)
);

CREATE INDEX ix_sku_inventory_sku ON sku_inventory(sku_id);

CREATE TABLE inventory_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  sku_id UUID NOT NULL REFERENCES product_skus(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  quantity INT NOT NULL,
  status VARCHAR(32) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  deducted_at TIMESTAMPTZ,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (quantity > 0),
  CHECK (status IN ('locked', 'released', 'deducted', 'expired'))
);

CREATE INDEX ix_inventory_locks_order ON inventory_locks(order_id);
CREATE INDEX ix_inventory_locks_expiry ON inventory_locks(status, expires_at);

CREATE TABLE inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id UUID NOT NULL REFERENCES product_skus(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  order_id UUID REFERENCES orders(id),
  type VARCHAR(32) NOT NULL,
  quantity INT NOT NULL,
  before_available INT NOT NULL,
  after_available INT NOT NULL,
  before_locked INT NOT NULL,
  after_locked INT NOT NULL,
  before_physical INT NOT NULL,
  after_physical INT NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (type IN ('initial', 'adjust', 'lock', 'release', 'deduct', 'return_restock')),
  CHECK (quantity > 0),
  CHECK (after_available >= 0),
  CHECK (after_locked >= 0),
  CHECK (after_physical >= 0)
);

CREATE INDEX ix_inventory_transactions_sku_created ON inventory_transactions(sku_id, created_at DESC);
CREATE INDEX ix_inventory_transactions_order ON inventory_transactions(order_id);
```

### 4.9 Fulfillment

```sql
CREATE TABLE fulfillment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  fulfillment_no VARCHAR(64) NOT NULL UNIQUE,
  warehouse_id UUID REFERENCES warehouses(id),
  status VARCHAR(32) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN (
    'pending',
    'picking',
    'packed',
    'shipped',
    'partially_shipped',
    'delivered',
    'cancelled',
    'failed'
  ))
);

CREATE INDEX ix_fulfillment_orders_order ON fulfillment_orders(order_id);

CREATE TABLE fulfillment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_order_id UUID NOT NULL REFERENCES fulfillment_orders(id),
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  sku_id UUID NOT NULL REFERENCES product_skus(id),
  quantity INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (quantity > 0)
);

CREATE TABLE logistics_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fulfillment_order_id UUID NOT NULL REFERENCES fulfillment_orders(id),
  provider_id UUID NOT NULL REFERENCES logistics_providers(id),
  tracking_no VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider_id, tracking_no),
  CHECK (status IN ('created', 'shipped', 'in_transit', 'delivered', 'exception', 'returned'))
);

CREATE INDEX ix_shipments_fulfillment_order ON shipments(fulfillment_order_id);

CREATE TABLE shipment_tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id),
  tracking_status VARCHAR(64) NOT NULL,
  description TEXT,
  location TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_shipment_tracking_events_shipment ON shipment_tracking_events(shipment_id, occurred_at DESC);
```

### 4.10 After-sales

```sql
CREATE TABLE after_sales_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id),
  user_id UUID REFERENCES users(id),
  request_no VARCHAR(64) NOT NULL UNIQUE,
  type VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  reason TEXT NOT NULL,
  requested_amount NUMERIC(18,2),
  approved_amount NUMERIC(18,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (type IN ('refund_only', 'return_refund', 'exchange')),
  CHECK (status IN (
    'requested',
    'reviewing',
    'approved',
    'rejected',
    'returning',
    'received',
    'refunding',
    'completed',
    'closed'
  )),
  CHECK (requested_amount IS NULL OR requested_amount >= 0),
  CHECK (approved_amount IS NULL OR approved_amount >= 0)
);

CREATE INDEX ix_after_sales_requests_order ON after_sales_requests(order_id);
CREATE INDEX ix_after_sales_requests_user ON after_sales_requests(user_id);

CREATE TABLE after_sales_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  after_sales_request_id UUID NOT NULL REFERENCES after_sales_requests(id),
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  quantity INT NOT NULL,
  requested_amount NUMERIC(18,2),
  approved_amount NUMERIC(18,2),
  return_quality_status VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (quantity > 0),
  CHECK (requested_amount IS NULL OR requested_amount >= 0),
  CHECK (approved_amount IS NULL OR approved_amount >= 0),
  CHECK (return_quality_status IS NULL OR return_quality_status IN ('sellable', 'damaged', 'missing'))
);

CREATE TABLE after_sales_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  after_sales_request_id UUID NOT NULL REFERENCES after_sales_requests(id),
  action VARCHAR(64) NOT NULL,
  from_status VARCHAR(32),
  to_status VARCHAR(32),
  operator_type VARCHAR(32) NOT NULL,
  operator_id UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (operator_type IN ('user', 'admin', 'system'))
);

CREATE TABLE after_sales_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  after_sales_request_id UUID NOT NULL REFERENCES after_sales_requests(id),
  file_url TEXT NOT NULL,
  file_type VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 4.11 Events And Audit

```sql
CREATE TABLE domain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(128) NOT NULL,
  aggregate_type VARCHAR(64) NOT NULL,
  aggregate_id UUID NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  retry_count INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'dead_letter')),
  CHECK (retry_count >= 0)
);

CREATE INDEX ix_domain_events_status ON domain_events(status, next_retry_at, created_at);
CREATE INDEX ix_domain_events_aggregate ON domain_events(aggregate_type, aggregate_id);

CREATE TABLE event_process_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES domain_events(id),
  consumer_name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, consumer_name),
  CHECK (status IN ('processing', 'processed', 'failed'))
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type VARCHAR(32) NOT NULL,
  actor_id UUID,
  action VARCHAR(128) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id VARCHAR(128),
  before_snapshot JSONB,
  after_snapshot JSONB,
  ip_address VARCHAR(64),
  user_agent TEXT,
  request_id VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (actor_type IN ('user', 'admin', 'system'))
);

CREATE INDEX ix_audit_logs_resource ON audit_logs(resource_type, resource_id, created_at DESC);
CREATE INDEX ix_audit_logs_actor ON audit_logs(actor_type, actor_id, created_at DESC);

CREATE TABLE admin_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id),
  action VARCHAR(128) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id VARCHAR(128),
  before_snapshot JSONB,
  after_snapshot JSONB,
  ip_address VARCHAR(64),
  user_agent TEXT,
  request_id VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_admin_operation_logs_admin ON admin_operation_logs(admin_user_id, created_at DESC);
CREATE INDEX ix_admin_operation_logs_resource ON admin_operation_logs(resource_type, resource_id, created_at DESC);
```

## 5. 状态迁移确认表

### 5.1 order_status

```text
pending_payment -> payment_processing
pending_payment -> cancelled
pending_payment -> closed

payment_processing -> paid
payment_processing -> cancelled
payment_processing -> closed

paid -> confirmed
paid -> cancelled

confirmed -> partially_fulfilled
confirmed -> fulfilled

partially_fulfilled -> fulfilled

fulfilled -> completed
```

禁止：

```text
- cancelled -> paid
- closed -> paid
- fulfilled -> cancelled
- completed -> cancelled
```

### 5.2 payment_status

```text
unpaid -> processing
processing -> paid
processing -> failed
paid -> partially_refunded
paid -> refunded
paid -> chargeback
partially_refunded -> refunded
partially_refunded -> chargeback
```

禁止：

```text
- refunded -> paid
- chargeback -> paid
- failed -> paid，除非创建新的 payment_order 并重新进入 processing
```

### 5.3 fulfillment_status

```text
unfulfilled -> pending
pending -> partially_shipped
pending -> shipped
pending -> failed
partially_shipped -> shipped
shipped -> delivered
```

禁止：

```text
- delivered -> shipped
- failed -> shipped，除非人工重新创建 fulfillment_order
```

### 5.4 inventory_lock_status

```text
locked -> released
locked -> deducted
locked -> expired
expired -> released
```

禁止：

```text
- released -> deducted
- deducted -> released
```

### 5.5 after_sales_request_status

```text
requested -> reviewing
reviewing -> approved
reviewing -> rejected
reviewing -> closed
approved -> refunding
approved -> returning
returning -> received
received -> refunding
refunding -> completed
rejected -> closed
completed -> closed
```

## 6. 关键业务事务边界

### 6.1 创建订单事务

```text
Transaction:
1. 根据 idempotency_key 查询已有订单。
2. 读取 cart_items。
3. 校验商品状态、SKU 状态、区域规则。
4. 重新计算价格和运费。
5. 创建 orders。
6. 创建 order_items。
7. 对 sku_inventory SELECT FOR UPDATE。
8. 创建 inventory_locks。
9. 更新 sku_inventory available_qty / locked_qty。
10. 写 inventory_transactions。
11. 写 order_status_logs。
12. 写 domain_events OrderCreated、InventoryLocked。
13. 提交事务。
```

失败处理：

```text
- 任一步失败，整个事务回滚。
- 不允许订单创建成功但库存锁失败。
- 不允许库存锁成功但 order_items 未生成。
```

### 6.2 支付 webhook 事务

```text
Request transaction:
1. 验签。
2. 插入 payment_webhook_events。
3. 唯一键冲突则返回 200。
4. 提交并返回 2xx。

Worker transaction:
1. 锁定 payment_webhook_events。
2. 找到 payment_order。
3. 插入 payment_transactions。
4. 更新 payment_orders。
5. 写 domain_events PaymentSucceeded 或 PaymentFailed。
6. 标记 webhook processed。
```

失败处理：

```text
- webhook 已落库但业务处理失败，标记 failed。
- 重试仍使用同一 webhook event，不重新接收。
- 重放事件不绕过唯一约束。
```

### 6.3 支付成功扣库存事务

```text
Transaction:
1. 消费 PaymentSucceeded。
2. 通过 event_process_logs 做 consumer 幂等。
3. 锁定 order。
4. 校验 payment_status 当前不是 paid/refunded/chargeback。
5. 更新 order payment_status = paid，order_status = paid。
6. 锁定 inventory_locks。
7. 锁定 sku_inventory。
8. locked_qty -= quantity。
9. physical_qty -= quantity。
10. inventory_locks.status = deducted。
11. 写 inventory_transactions。
12. 写 order_status_logs。
13. 写 domain_events OrderPaid、InventoryDeducted。
```

## 7. 必须建立的应用层防线

数据库约束不能替代业务规则，以下逻辑必须在 service 层实现。

```text
Order:
- 校验状态迁移是否允许。
- 校验订单金额是否与 payment_order 一致。
- 校验订单不能重复支付推进。

Payment:
- 校验 webhook 签名。
- 校验 provider event type 是否在 allowlist。
- 校验 provider object 与本地 payment_order 绑定关系。
- 不能使用前端 payment result 更新订单。

Inventory:
- 对 sku_inventory 使用行锁。
- 校验 available_qty - safety_qty >= quantity。
- 防止重复 deduct/release。

Refund:
- 校验可退款金额。
- 校验退款金额不能超过已支付金额减已退款金额。
- 仅允许有权限管理员审核退款。

Fulfillment:
- 未支付订单不能发货。
- 发货数量不能超过 order_item 未发货数量。

Audit:
- 后台写操作必须写 audit_logs 或 admin_operation_logs。
- 库存调整、退款审核、订单取消必须记录 before_snapshot 和 after_snapshot。
```

## 8. 初始种子数据

### 8.1 payment_channels

```sql
INSERT INTO payment_channels (channel_code, name, status, config)
VALUES
  ('stripe', 'Stripe', 'active', '{}'),
  ('paypal', 'PayPal', 'inactive', '{}');
```

### 8.2 warehouses

```sql
INSERT INTO warehouses (code, name, country_code, status)
VALUES
  ('DEFAULT', 'Default Warehouse', 'US', 'active');
```

### 8.3 admin_permissions

第一批权限编码建议：

```text
dashboard.view
product.view
product.create
product.update
product.publish
sku.view
sku.update
inventory.view
inventory.adjust
order.view
order.confirm
order.cancel
payment.view
payment.webhook.replay
refund.view
refund.approve
fulfillment.view
fulfillment.create
shipment.update
user.view
user.risk.update
admin_user.view
admin_user.create
role.view
role.create
role.update
audit.view
```

## 9. Migration 拆分建议

```text
0001_extensions.sql
0002_identity.sql
0003_admin_rbac.sql
0004_product.sql
0005_cart.sql
0006_order.sql
0007_payment.sql
0008_inventory.sql
0009_fulfillment.sql
0010_after_sales.sql
0011_events_audit.sql
0012_seed_core.sql
```

依赖顺序：

```text
identity -> admin_rbac
identity -> cart -> order
product -> cart
product -> order
product -> inventory
order -> payment
order -> inventory
order -> fulfillment
order -> after_sales
events_audit can be created after identity/admin or at the end
```

## 10. 实现前确认清单

进入代码实现前必须确认：

```text
- 是否接受 CHECK 约束方案，而不是 PostgreSQL enum。
- 是否接受 UUID gen_random_uuid()。
- 是否接受 NUMERIC(18,2) 存金额。
- 是否先单仓 DEFAULT warehouse。
- 是否 MVP 只启用 Stripe，PayPal inactive。
- 是否所有后台高风险操作都写 audit_logs。
- 是否订单、支付、库存事件先走 PostgreSQL outbox。
- 是否第一批 migration 暂不包含 CRM、BI、复杂营销表。
```

如果以上确认通过，下一步可以进入工程实现：

```text
1. 读取当前 Next.js 版本文档。
2. 确认 monorepo 改造方式。
3. 选择数据库 migration 工具。
4. 创建 migration 文件。
5. 创建 NestJS API 骨架。
```
