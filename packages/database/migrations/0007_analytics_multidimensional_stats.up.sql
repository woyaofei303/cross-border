CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES sites(id),
  vertical_id UUID REFERENCES verticals(id),
  brand_id UUID REFERENCES brands(id),
  event_type VARCHAR(64) NOT NULL,
  subject_type VARCHAR(64),
  subject_id UUID,
  user_id UUID REFERENCES users(id),
  guest_token VARCHAR(128),
  order_id UUID REFERENCES orders(id),
  product_id UUID REFERENCES products(id),
  sku_id UUID REFERENCES product_skus(id),
  channel_code VARCHAR(64),
  currency CHAR(3),
  amount NUMERIC(18, 2),
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  idempotency_key VARCHAR(160) NOT NULL UNIQUE,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_analytics_events_site_type_occurred ON analytics_events(site_id, event_type, occurred_at DESC) WHERE site_id IS NOT NULL;
CREATE INDEX ix_analytics_events_vertical_type_occurred ON analytics_events(vertical_id, event_type, occurred_at DESC) WHERE vertical_id IS NOT NULL;
CREATE INDEX ix_analytics_events_brand_type_occurred ON analytics_events(brand_id, event_type, occurred_at DESC) WHERE brand_id IS NOT NULL;
CREATE INDEX ix_analytics_events_order ON analytics_events(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX ix_analytics_events_product ON analytics_events(product_id, sku_id, occurred_at DESC) WHERE product_id IS NOT NULL;

CREATE TABLE daily_sales_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL,
  scope_type VARCHAR(16) NOT NULL,
  scope_key VARCHAR(64) NOT NULL,
  site_id UUID REFERENCES sites(id),
  vertical_id UUID REFERENCES verticals(id),
  brand_id UUID REFERENCES brands(id),
  currency CHAR(3) NOT NULL,
  gmv_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  net_sales_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  chargeback_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  order_count INT NOT NULL DEFAULT 0,
  paid_order_count INT NOT NULL DEFAULT 0,
  refunded_order_count INT NOT NULL DEFAULT 0,
  chargeback_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stat_date, scope_type, scope_key, currency),
  CHECK (scope_type IN ('global', 'vertical', 'brand', 'site')),
  CHECK (gmv_amount >= 0),
  CHECK (net_sales_amount >= 0),
  CHECK (refund_amount >= 0),
  CHECK (chargeback_amount >= 0),
  CHECK (order_count >= 0),
  CHECK (paid_order_count >= 0),
  CHECK (refunded_order_count >= 0),
  CHECK (chargeback_count >= 0)
);

CREATE INDEX ix_daily_sales_stats_scope_date ON daily_sales_stats(scope_type, scope_key, stat_date DESC);
CREATE INDEX ix_daily_sales_stats_site_date ON daily_sales_stats(site_id, stat_date DESC) WHERE site_id IS NOT NULL;
CREATE INDEX ix_daily_sales_stats_vertical_date ON daily_sales_stats(vertical_id, stat_date DESC) WHERE vertical_id IS NOT NULL;
CREATE INDEX ix_daily_sales_stats_brand_date ON daily_sales_stats(brand_id, stat_date DESC) WHERE brand_id IS NOT NULL;

CREATE TABLE channel_performance_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL,
  scope_type VARCHAR(16) NOT NULL,
  scope_key VARCHAR(64) NOT NULL,
  site_id UUID REFERENCES sites(id),
  vertical_id UUID REFERENCES verticals(id),
  brand_id UUID REFERENCES brands(id),
  channel_code VARCHAR(64) NOT NULL,
  currency CHAR(3) NOT NULL,
  order_count INT NOT NULL DEFAULT 0,
  gmv_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  net_sales_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  chargeback_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  ad_spend_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stat_date, scope_type, scope_key, channel_code, currency),
  CHECK (scope_type IN ('global', 'vertical', 'brand', 'site')),
  CHECK (order_count >= 0),
  CHECK (gmv_amount >= 0),
  CHECK (net_sales_amount >= 0),
  CHECK (refund_amount >= 0),
  CHECK (chargeback_amount >= 0),
  CHECK (ad_spend_amount >= 0)
);

CREATE INDEX ix_channel_performance_stats_scope_date ON channel_performance_stats(scope_type, scope_key, stat_date DESC);
CREATE INDEX ix_channel_performance_stats_site_date ON channel_performance_stats(site_id, stat_date DESC) WHERE site_id IS NOT NULL;

CREATE TABLE product_performance_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL,
  scope_type VARCHAR(16) NOT NULL,
  scope_key VARCHAR(64) NOT NULL,
  site_id UUID REFERENCES sites(id),
  vertical_id UUID REFERENCES verticals(id),
  brand_id UUID REFERENCES brands(id),
  product_id UUID NOT NULL REFERENCES products(id),
  sku_id UUID NOT NULL REFERENCES product_skus(id),
  currency CHAR(3) NOT NULL,
  units_sold INT NOT NULL DEFAULT 0,
  order_count INT NOT NULL DEFAULT 0,
  gmv_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  net_sales_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stat_date, scope_type, scope_key, product_id, sku_id, currency),
  CHECK (scope_type IN ('global', 'vertical', 'brand', 'site')),
  CHECK (units_sold >= 0),
  CHECK (order_count >= 0),
  CHECK (gmv_amount >= 0),
  CHECK (net_sales_amount >= 0),
  CHECK (refund_amount >= 0)
);

CREATE INDEX ix_product_performance_stats_scope_date ON product_performance_stats(scope_type, scope_key, stat_date DESC);
CREATE INDEX ix_product_performance_stats_site_product ON product_performance_stats(site_id, product_id, stat_date DESC) WHERE site_id IS NOT NULL;
CREATE INDEX ix_product_performance_stats_vertical_product ON product_performance_stats(vertical_id, product_id, stat_date DESC) WHERE vertical_id IS NOT NULL;

CREATE TABLE customer_ltv_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type VARCHAR(16) NOT NULL,
  scope_key VARCHAR(64) NOT NULL,
  site_id UUID REFERENCES sites(id),
  vertical_id UUID REFERENCES verticals(id),
  brand_id UUID REFERENCES brands(id),
  customer_identity_type VARCHAR(16) NOT NULL,
  customer_identity_key VARCHAR(128) NOT NULL,
  user_id UUID REFERENCES users(id),
  guest_token VARCHAR(128),
  currency CHAR(3) NOT NULL,
  first_order_at TIMESTAMPTZ NOT NULL,
  last_order_at TIMESTAMPTZ NOT NULL,
  order_count INT NOT NULL DEFAULT 0,
  gross_sales_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  net_sales_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scope_type, scope_key, customer_identity_type, customer_identity_key, currency),
  CHECK (scope_type IN ('global', 'vertical', 'brand', 'site')),
  CHECK (customer_identity_type IN ('user', 'guest')),
  CHECK (order_count >= 0),
  CHECK (gross_sales_amount >= 0),
  CHECK (net_sales_amount >= 0),
  CHECK (refund_amount >= 0)
);

CREATE INDEX ix_customer_ltv_stats_scope_order_count ON customer_ltv_stats(scope_type, scope_key, order_count DESC);
CREATE INDEX ix_customer_ltv_stats_site_customer ON customer_ltv_stats(site_id, customer_identity_type, customer_identity_key) WHERE site_id IS NOT NULL;
