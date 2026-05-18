import { createRequire } from "node:module";

const requireFromApi = createRequire(
	new URL("../apps/api/package.json", import.meta.url),
);
const { Client } = requireFromApi("pg");

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
	console.error("DATABASE_URL is required to seed demo commerce data.");
	process.exit(1);
}

const ids = {
	siteId: "00000000-0000-4000-8000-000000000301",
	verticalId: "00000000-0000-4000-8000-000000000101",
	brandId: "00000000-0000-4000-8000-000000000201",
	categoryId: "00000000-0000-4000-8000-000000001001",
	productId: "00000000-0000-4000-8000-000000001002",
	skuId: "00000000-0000-4000-8000-000000001003",
	warehouseId: "00000000-0000-4000-8000-000000001004",
	priceId: "00000000-0000-4000-8000-000000001005",
	mediaId: "00000000-0000-4000-8000-000000001006",
	paymentChannelId: "00000000-0000-4000-8000-000000001007",
	globalAdminId: "00000000-0000-4000-8000-000000002001",
	siteAdminId: "00000000-0000-4000-8000-000000002002",
	adminManagerRoleId: "00000000-0000-4000-8000-000000002101",
	siteOperatorRoleId: "00000000-0000-4000-8000-000000002102",
	rbacPermissionId: "00000000-0000-4000-8000-000000002201",
	auditPermissionId: "00000000-0000-4000-8000-000000002202",
	ordersPermissionId: "00000000-0000-4000-8000-000000002203",
};

const client = new Client({ connectionString: databaseUrl });

await client.connect();

try {
	await client.query("BEGIN");

	await client.query(
		`
      INSERT INTO product_categories (
        id,
        site_id,
        vertical_id,
        brand_id,
        slug,
        name,
        sort_order,
        is_active
      )
      VALUES ($1, $2, $3, $4, 'demo-eyewear', 'Demo Eyewear', 10, TRUE)
      ON CONFLICT (id)
      DO UPDATE SET
        site_id = EXCLUDED.site_id,
        vertical_id = EXCLUDED.vertical_id,
        brand_id = EXCLUDED.brand_id,
        slug = EXCLUDED.slug,
        name = EXCLUDED.name,
        sort_order = EXCLUDED.sort_order,
        is_active = TRUE,
        updated_at = now()
    `,
		[ids.categoryId, ids.siteId, ids.verticalId, ids.brandId],
	);

	await client.query(
		`
      INSERT INTO products (
        id,
        site_id,
        vertical_id,
        brand_id,
        category_id,
        spu_code,
        slug,
        title,
        description,
        status,
        seo_title,
        seo_description,
        tags,
        published_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        'DEMO-SPU-001',
        'demo-blue-light-glasses',
        'Demo Blue Light Glasses',
        'A seeded product for local end-to-end commerce smoke testing.',
        'active',
        'Demo Blue Light Glasses',
        'Seeded default-site product used for local smoke tests.',
        ARRAY['demo', 'blue-light'],
        now()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        site_id = EXCLUDED.site_id,
        vertical_id = EXCLUDED.vertical_id,
        brand_id = EXCLUDED.brand_id,
        category_id = EXCLUDED.category_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        status = 'active',
        seo_title = EXCLUDED.seo_title,
        seo_description = EXCLUDED.seo_description,
        tags = EXCLUDED.tags,
        published_at = COALESCE(products.published_at, EXCLUDED.published_at),
        updated_at = now()
    `,
		[
			ids.productId,
			ids.siteId,
			ids.verticalId,
			ids.brandId,
			ids.categoryId,
		],
	);

	await client.query(
		`
      INSERT INTO product_skus (
        id,
        site_id,
        vertical_id,
        brand_id,
        product_id,
        sku_code,
        title,
        attributes,
        weight_gram,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        'DEMO-SKU-001',
        'Black Frame / Clear Lens',
        '{"rating":4.8,"reviews":128,"badge":"Demo","origin":"US","shipsIn":"Ships in 48h","frame_material":"TR90","lens_type":"Blue light"}'::jsonb,
        120,
        'active'
      )
      ON CONFLICT (id)
      DO UPDATE SET
        site_id = EXCLUDED.site_id,
        vertical_id = EXCLUDED.vertical_id,
        brand_id = EXCLUDED.brand_id,
        product_id = EXCLUDED.product_id,
        title = EXCLUDED.title,
        attributes = EXCLUDED.attributes,
        weight_gram = EXCLUDED.weight_gram,
        status = 'active',
        updated_at = now()
    `,
		[ids.skuId, ids.siteId, ids.verticalId, ids.brandId, ids.productId],
	);

	await client.query(
		`
      INSERT INTO product_media (
        id,
        site_id,
        vertical_id,
        brand_id,
        product_id,
        sku_id,
        media_type,
        url,
        alt_text,
        sort_order
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        'image',
        'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=1200&q=85',
        'Demo blue light glasses',
        1
      )
      ON CONFLICT (id)
      DO UPDATE SET
        site_id = EXCLUDED.site_id,
        vertical_id = EXCLUDED.vertical_id,
        brand_id = EXCLUDED.brand_id,
        product_id = EXCLUDED.product_id,
        sku_id = EXCLUDED.sku_id,
        url = EXCLUDED.url,
        alt_text = EXCLUDED.alt_text,
        sort_order = EXCLUDED.sort_order
    `,
		[
			ids.mediaId,
			ids.siteId,
			ids.verticalId,
			ids.brandId,
			ids.productId,
			ids.skuId,
		],
	);

	await client.query(
		`
      INSERT INTO sku_prices (
        id,
        site_id,
        vertical_id,
        brand_id,
        sku_id,
        currency,
        list_price,
        sale_price
      )
      VALUES ($1, $2, $3, $4, $5, 'USD', 79.00, 49.00)
      ON CONFLICT (id)
      DO UPDATE SET
        site_id = EXCLUDED.site_id,
        vertical_id = EXCLUDED.vertical_id,
        brand_id = EXCLUDED.brand_id,
        sku_id = EXCLUDED.sku_id,
        currency = EXCLUDED.currency,
        list_price = EXCLUDED.list_price,
        sale_price = EXCLUDED.sale_price
    `,
		[ids.priceId, ids.siteId, ids.verticalId, ids.brandId, ids.skuId],
	);

	await client.query(
		`
      INSERT INTO warehouses (
        id,
        site_id,
        vertical_id,
        brand_id,
        code,
        name,
        country_code,
        status
      )
      VALUES ($1, $2, $3, $4, 'DEMO-WH-US', 'Demo US Warehouse', 'US', 'active')
      ON CONFLICT (id)
      DO UPDATE SET
        site_id = EXCLUDED.site_id,
        vertical_id = EXCLUDED.vertical_id,
        brand_id = EXCLUDED.brand_id,
        name = EXCLUDED.name,
        country_code = EXCLUDED.country_code,
        status = 'active',
        updated_at = now()
    `,
		[ids.warehouseId, ids.siteId, ids.verticalId, ids.brandId],
	);

	await client.query(
		`
      INSERT INTO sku_inventory (
        site_id,
        vertical_id,
        brand_id,
        sku_id,
        warehouse_id,
        available_qty,
        locked_qty,
        physical_qty,
        inbound_qty,
        safety_qty
      )
      VALUES ($1, $2, $3, $4, $5, 25, 0, 25, 0, 2)
      ON CONFLICT (sku_id, warehouse_id)
      DO UPDATE SET
        site_id = EXCLUDED.site_id,
        vertical_id = EXCLUDED.vertical_id,
        brand_id = EXCLUDED.brand_id,
        safety_qty = EXCLUDED.safety_qty,
        updated_at = now()
    `,
		[ids.siteId, ids.verticalId, ids.brandId, ids.skuId, ids.warehouseId],
	);

	await client.query(
		`
      INSERT INTO payment_channels (
        id,
        channel_code,
        name,
        status,
        config
      )
      VALUES (
        $1,
        'stripe',
        'Stripe Demo',
        'active',
        '{"mode":"demo"}'::jsonb
      )
      ON CONFLICT (channel_code)
      DO UPDATE SET
        name = EXCLUDED.name,
        status = 'active',
        config = EXCLUDED.config,
        updated_at = now()
    `,
		[ids.paymentChannelId],
	);

	await client.query(
		`
      INSERT INTO admin_users (
        id,
        email,
        password_hash,
        display_name,
        status
      )
      VALUES
        ($1, 'admin@example.com', 'demo-password-hash-not-for-production', 'Global Admin', 'active'),
        ($2, 'site-ops@example.com', 'demo-password-hash-not-for-production', 'Default Site Operator', 'active')
      ON CONFLICT (id)
      DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        status = 'active',
        updated_at = now()
    `,
		[ids.globalAdminId, ids.siteAdminId],
	);

	await client.query(
		`
      INSERT INTO admin_roles (
        id,
        code,
        name,
        description
      )
      VALUES
        ($1, 'admin_manager', 'Admin Manager', 'Can manage admin scopes and inspect audit logs.'),
        ($2, 'site_operator', 'Site Operator', 'Can operate scoped commerce data for the default site.')
      ON CONFLICT (id)
      DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        updated_at = now()
    `,
		[ids.adminManagerRoleId, ids.siteOperatorRoleId],
	);

	await client.query(
		`
      INSERT INTO admin_permissions (
        id,
        code,
        name,
        type,
        resource,
        action
      )
      VALUES
        ($1, 'admin.rbac.manage', 'Manage RBAC Scope', 'action', 'admin_rbac', 'manage'),
        ($2, 'admin.audit.read', 'Read Audit Logs', 'data', 'audit_logs', 'read'),
        ($3, 'admin.orders.operate', 'Operate Orders', 'action', 'orders', 'operate')
      ON CONFLICT (id)
      DO UPDATE SET
        code = EXCLUDED.code,
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        resource = EXCLUDED.resource,
        action = EXCLUDED.action
    `,
		[
			ids.rbacPermissionId,
			ids.auditPermissionId,
			ids.ordersPermissionId,
		],
	);

	await client.query(
		`
      INSERT INTO admin_user_roles (admin_user_id, role_id)
      VALUES
        ($1, $3),
        ($2, $4)
      ON CONFLICT DO NOTHING
    `,
		[
			ids.globalAdminId,
			ids.siteAdminId,
			ids.adminManagerRoleId,
			ids.siteOperatorRoleId,
		],
	);

	await client.query(
		`
      INSERT INTO admin_role_permissions (role_id, permission_id)
      VALUES
        ($1, $3),
        ($1, $4),
        ($2, $4),
        ($2, $5)
      ON CONFLICT DO NOTHING
    `,
		[
			ids.adminManagerRoleId,
			ids.siteOperatorRoleId,
			ids.rbacPermissionId,
			ids.auditPermissionId,
			ids.ordersPermissionId,
		],
	);

	await client.query(
		`
      DELETE FROM admin_user_scopes
      WHERE admin_user_id IN ($1, $2)
    `,
		[ids.globalAdminId, ids.siteAdminId],
	);

	await client.query(
		`
      INSERT INTO admin_user_scopes (
        admin_user_id,
        scope_type,
        scope_id
      )
      VALUES
        ($1, 'global', NULL),
        ($2, 'site', $3)
      ON CONFLICT DO NOTHING
    `,
		[ids.globalAdminId, ids.siteAdminId, ids.siteId],
	);

	await client.query("COMMIT");

	console.log(
		JSON.stringify(
			{
				seeded: true,
				siteId: ids.siteId,
				productId: ids.productId,
				skuId: ids.skuId,
				warehouseId: ids.warehouseId,
				globalAdminId: ids.globalAdminId,
				siteAdminId: ids.siteAdminId,
				currency: "USD",
			},
			null,
			2,
		),
	);
} catch (error) {
	await client.query("ROLLBACK");
	throw error;
} finally {
	await client.end();
}
