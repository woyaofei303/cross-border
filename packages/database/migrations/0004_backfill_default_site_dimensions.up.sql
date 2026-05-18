DO $$
DECLARE
  default_site_id UUID;
  default_vertical_id UUID;
  default_brand_id UUID;
  target_table TEXT;
  target_tables TEXT[] := ARRAY[
    'users',
    'user_profiles',
    'user_addresses',
    'user_login_logs',
    'product_categories',
    'products',
    'product_skus',
    'product_media',
    'product_translations',
    'sku_prices',
    'sku_region_rules',
    'carts',
    'cart_items',
    'orders',
    'order_items',
    'order_status_logs',
    'order_events',
    'payment_orders',
    'payment_transactions',
    'payment_webhook_events',
    'payment_refunds',
    'payment_chargebacks',
    'warehouses',
    'sku_inventory',
    'inventory_locks',
    'inventory_transactions',
    'fulfillment_orders',
    'fulfillment_items',
    'shipments',
    'shipment_tracking_events',
    'after_sales_requests',
    'after_sales_items',
    'after_sales_logs',
    'after_sales_attachments',
    'domain_events',
    'audit_logs',
    'admin_operation_logs'
  ];
BEGIN
  SELECT
    sites.id,
    sites.vertical_id,
    sites.brand_id
  INTO
    default_site_id,
    default_vertical_id,
    default_brand_id
  FROM sites
  WHERE sites.code = 'default-site';

  IF default_site_id IS NULL THEN
    RAISE EXCEPTION 'Default site seed data is required before site dimension backfill.';
  END IF;

  FOREACH target_table IN ARRAY target_tables LOOP
    EXECUTE format(
      'UPDATE %I
       SET
         site_id = COALESCE(site_id, $1),
         vertical_id = COALESCE(vertical_id, $2),
         brand_id = COALESCE(brand_id, $3)
       WHERE site_id IS NULL OR vertical_id IS NULL OR brand_id IS NULL',
      target_table
    )
    USING default_site_id, default_vertical_id, default_brand_id;
  END LOOP;
END $$;
