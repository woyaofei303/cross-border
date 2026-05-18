ALTER TABLE users
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE user_profiles
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE user_addresses
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE user_login_logs
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE product_categories
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE products
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE product_skus
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE product_media
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE product_translations
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE sku_prices
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE sku_region_rules
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE carts
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE cart_items
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE orders
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE order_items
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE order_status_logs
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE order_events
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE payment_orders
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE payment_transactions
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE payment_webhook_events
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE payment_refunds
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE payment_chargebacks
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE warehouses
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE sku_inventory
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE inventory_locks
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE inventory_transactions
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE fulfillment_orders
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE fulfillment_items
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE shipments
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE shipment_tracking_events
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE after_sales_requests
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE after_sales_items
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE after_sales_logs
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE after_sales_attachments
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE domain_events
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE audit_logs
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

ALTER TABLE admin_operation_logs
  ADD COLUMN site_id UUID REFERENCES sites(id),
  ADD COLUMN vertical_id UUID REFERENCES verticals(id),
  ADD COLUMN brand_id UUID REFERENCES brands(id);

CREATE INDEX ix_users_site ON users(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX ix_product_categories_site ON product_categories(site_id) WHERE site_id IS NOT NULL;
CREATE INDEX ix_products_site_status ON products(site_id, status, updated_at DESC) WHERE site_id IS NOT NULL;
CREATE INDEX ix_product_skus_site_status ON product_skus(site_id, status, updated_at DESC) WHERE site_id IS NOT NULL;
CREATE INDEX ix_carts_site_user_status ON carts(site_id, user_id, status) WHERE user_id IS NOT NULL;
CREATE INDEX ix_carts_site_guest_status ON carts(site_id, guest_token, status) WHERE guest_token IS NOT NULL;
CREATE INDEX ix_orders_site_status_created ON orders(site_id, order_status, created_at DESC) WHERE site_id IS NOT NULL;
CREATE INDEX ix_orders_site_user_created ON orders(site_id, user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX ix_payment_orders_site_order ON payment_orders(site_id, order_id) WHERE site_id IS NOT NULL;
CREATE INDEX ix_payment_webhook_events_site_status ON payment_webhook_events(site_id, status, received_at) WHERE site_id IS NOT NULL;
CREATE INDEX ix_sku_inventory_site_sku_warehouse ON sku_inventory(site_id, sku_id, warehouse_id) WHERE site_id IS NOT NULL;
CREATE INDEX ix_inventory_locks_site_order ON inventory_locks(site_id, order_id) WHERE site_id IS NOT NULL;
CREATE INDEX ix_inventory_transactions_site_sku_created ON inventory_transactions(site_id, sku_id, created_at DESC) WHERE site_id IS NOT NULL;
CREATE INDEX ix_fulfillment_orders_site_order ON fulfillment_orders(site_id, order_id) WHERE site_id IS NOT NULL;
CREATE INDEX ix_after_sales_requests_site_order ON after_sales_requests(site_id, order_id) WHERE site_id IS NOT NULL;
CREATE INDEX ix_domain_events_site_status ON domain_events(site_id, status, next_retry_at, created_at) WHERE site_id IS NOT NULL;
CREATE INDEX ix_audit_logs_site_resource ON audit_logs(site_id, resource_type, resource_id, created_at DESC) WHERE site_id IS NOT NULL;
CREATE INDEX ix_admin_operation_logs_site_resource ON admin_operation_logs(site_id, resource_type, resource_id, created_at DESC) WHERE site_id IS NOT NULL;
