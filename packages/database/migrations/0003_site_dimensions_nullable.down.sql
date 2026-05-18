ALTER TABLE admin_operation_logs
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE audit_logs
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE domain_events
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE after_sales_attachments
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE after_sales_logs
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE after_sales_items
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE after_sales_requests
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE shipment_tracking_events
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE shipments
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE fulfillment_items
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE fulfillment_orders
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE inventory_transactions
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE inventory_locks
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE sku_inventory
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE warehouses
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE payment_chargebacks
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE payment_refunds
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE payment_webhook_events
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE payment_transactions
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE payment_orders
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE order_events
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE order_status_logs
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE order_items
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE orders
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE cart_items
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE carts
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE sku_region_rules
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE sku_prices
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE product_translations
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE product_media
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE product_skus
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE products
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE product_categories
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE user_login_logs
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE user_addresses
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;

ALTER TABLE users
  DROP COLUMN IF EXISTS brand_id,
  DROP COLUMN IF EXISTS vertical_id,
  DROP COLUMN IF EXISTS site_id;
