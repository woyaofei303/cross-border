CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
  CHECK (list_price >= 0),
  CHECK (sale_price IS NULL OR sale_price >= 0),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX ux_sku_prices_global
  ON sku_prices(sku_id, currency)
  WHERE region_code IS NULL;

CREATE UNIQUE INDEX ux_sku_prices_region
  ON sku_prices(sku_id, currency, region_code)
  WHERE region_code IS NOT NULL;

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
