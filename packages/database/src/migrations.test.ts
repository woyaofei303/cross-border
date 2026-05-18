import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	calculateChecksum,
	defaultMigrationsDir,
	listMigrationFiles,
	parseMigrationFilename,
	validateMigrationFiles,
} from "./index.js";

describe("database migrations", () => {
	it("discovers ordered up and down migration files", async () => {
		const upMigrations = await listMigrationFiles("up");
		const downMigrations = await listMigrationFiles("down");

		expect(upMigrations.map((migration) => migration.id)).toEqual([
			"0001_mvp_core_schema",
			"0002_site_foundation",
			"0003_site_dimensions_nullable",
			"0004_backfill_default_site_dimensions",
			"0005_admin_scope_foundation",
			"0006_product_dynamic_attributes",
			"0007_analytics_multidimensional_stats",
			"0008_aftersales_refund_workflow",
			"0009_site_customers_addresses",
		]);
		expect(downMigrations.map((migration) => migration.id)).toEqual([
			"0001_mvp_core_schema",
			"0002_site_foundation",
			"0003_site_dimensions_nullable",
			"0004_backfill_default_site_dimensions",
			"0005_admin_scope_foundation",
			"0006_product_dynamic_attributes",
			"0007_analytics_multidimensional_stats",
			"0008_aftersales_refund_workflow",
			"0009_site_customers_addresses",
		]);
	});

	it("rejects filenames outside the migration convention", () => {
		expect(parseMigrationFilename("0001_mvp_core_schema.up.sql")).toEqual({
			id: "0001_mvp_core_schema",
			direction: "up",
		});
		expect(parseMigrationFilename("001_invalid.sql")).toBeNull();
	});

	it("validates migration naming and up/down pairing", async () => {
		const result = await validateMigrationFiles();

		expect(result).toEqual({
			valid: true,
			ids: [
				"0001_mvp_core_schema",
				"0002_site_foundation",
				"0003_site_dimensions_nullable",
				"0004_backfill_default_site_dimensions",
				"0005_admin_scope_foundation",
				"0006_product_dynamic_attributes",
				"0007_analytics_multidimensional_stats",
				"0008_aftersales_refund_workflow",
				"0009_site_customers_addresses",
			],
			errors: [],
		});
	});

	it("keeps stable checksums for migration immutability checks", () => {
		expect(calculateChecksum("select 1;")).toHaveLength(64);
		expect(calculateChecksum("select 1;")).toBe(calculateChecksum("select 1;"));
		expect(calculateChecksum("select 1;")).not.toBe(
			calculateChecksum("select 2;"),
		);
	});

	it("contains high-risk idempotency, audit, and state tracking constraints", async () => {
		const sql = await readFile(
			join(defaultMigrationsDir, "0001_mvp_core_schema.up.sql"),
			"utf8",
		);

		expect(sql).toContain("CREATE UNIQUE INDEX ux_orders_user_idempotency");
		expect(sql).toContain("CREATE UNIQUE INDEX ux_orders_guest_idempotency");
		expect(sql).toContain("UNIQUE (channel_code, provider_event_id)");
		expect(sql).toContain("idempotency_key VARCHAR(128) NOT NULL UNIQUE");
		expect(sql).toContain("CREATE TABLE inventory_locks");
		expect(sql).toContain("available_qty INT NOT NULL DEFAULT 0");
		expect(sql).toContain("locked_qty INT NOT NULL DEFAULT 0");
		expect(sql).toContain("physical_qty INT NOT NULL DEFAULT 0");
		expect(sql).toContain("CREATE TABLE payment_refunds");
		expect(sql).toContain("CREATE TABLE fulfillment_orders");
		expect(sql).toContain("CREATE TABLE shipment_tracking_events");
		expect(sql).toContain("CREATE TABLE audit_logs");
		expect(sql).toContain("CREATE TABLE admin_operation_logs");
		expect(sql).toContain("CREATE TABLE domain_events");
	});

	it("adds multi-site foundation tables and default site seed data", async () => {
		const sql = await readFile(
			join(defaultMigrationsDir, "0002_site_foundation.up.sql"),
			"utf8",
		);

		expect(sql).toContain("CREATE TABLE verticals");
		expect(sql).toContain("CREATE TABLE brands");
		expect(sql).toContain("CREATE TABLE sites");
		expect(sql).toContain("CREATE TABLE site_domains");
		expect(sql).toContain("CREATE TABLE site_configs");
		expect(sql).toContain("'Default Vertical'");
		expect(sql).toContain("'Default Brand'");
		expect(sql).toContain("'Default Site'");
		expect(sql).toContain("'default-site'");
		expect(sql).toContain("ux_site_domains_primary");
	});

	it("adds nullable site dimensions to existing core tables before enforcement", async () => {
		const sql = await readFile(
			join(defaultMigrationsDir, "0003_site_dimensions_nullable.up.sql"),
			"utf8",
		);

		expect(sql).toContain("ALTER TABLE orders");
		expect(sql).toContain("ADD COLUMN site_id UUID REFERENCES sites(id)");
		expect(sql).toContain("ADD COLUMN vertical_id UUID REFERENCES verticals(id)");
		expect(sql).toContain("ADD COLUMN brand_id UUID REFERENCES brands(id)");
		expect(sql).toContain("ALTER TABLE payment_webhook_events");
		expect(sql).toContain("ALTER TABLE sku_inventory");
		expect(sql).toContain("ALTER TABLE domain_events");
		expect(sql).toContain("ALTER TABLE admin_operation_logs");
		expect(sql).toContain("ix_orders_site_status_created");
		expect(sql).not.toContain("SET NOT NULL");
	});

	it("backfills existing rows to the default site without hard deleting old data", async () => {
		const sql = await readFile(
			join(defaultMigrationsDir, "0004_backfill_default_site_dimensions.up.sql"),
			"utf8",
		);

		expect(sql).toContain("WHERE sites.code = 'default-site'");
		expect(sql).toContain("Default site seed data is required");
		expect(sql).toContain("COALESCE(site_id, $1)");
		expect(sql).toContain("'orders'");
		expect(sql).toContain("'payment_orders'");
		expect(sql).toContain("'sku_inventory'");
		expect(sql).toContain("'admin_operation_logs'");
		expect(sql).not.toContain("DELETE FROM");
	});

	it("adds admin RBAC data scopes without changing existing role grants", async () => {
		const sql = await readFile(
			join(defaultMigrationsDir, "0005_admin_scope_foundation.up.sql"),
			"utf8",
		);

		expect(sql).toContain("CREATE TABLE admin_user_scopes");
		expect(sql).toContain("scope_type IN ('global', 'vertical', 'brand', 'site')");
		expect(sql).toContain("ux_admin_user_scopes_global");
		expect(sql).toContain("ux_admin_user_scopes_resource");
		expect(sql).toContain("SELECT id, 'global', NULL");
		expect(sql).not.toContain("DROP TABLE admin_roles");
	});

	it("adds vertical dynamic product attributes without removing legacy SKU JSON attributes", async () => {
		const sql = await readFile(
			join(defaultMigrationsDir, "0006_product_dynamic_attributes.up.sql"),
			"utf8",
		);

		expect(sql).toContain("CREATE TABLE vertical_attributes");
		expect(sql).toContain("CREATE TABLE vertical_attribute_options");
		expect(sql).toContain("CREATE TABLE product_attribute_values");
		expect(sql).toContain("site_id UUID NOT NULL REFERENCES sites(id)");
		expect(sql).toContain("vertical_id UUID NOT NULL REFERENCES verticals(id)");
		expect(sql).toContain("ux_product_attribute_values_sku_attribute");
		expect(sql).toContain("verticals.code = 'default'");
		expect(sql).not.toContain("DROP COLUMN attributes");
	});

	it("adds multi-dimensional BI statistics tables with site dimensions", async () => {
		const sql = await readFile(
			join(
				defaultMigrationsDir,
				"0007_analytics_multidimensional_stats.up.sql",
			),
			"utf8",
		);

		expect(sql).toContain("CREATE TABLE analytics_events");
		expect(sql).toContain("CREATE TABLE daily_sales_stats");
		expect(sql).toContain("CREATE TABLE channel_performance_stats");
		expect(sql).toContain("CREATE TABLE product_performance_stats");
		expect(sql).toContain("CREATE TABLE customer_ltv_stats");
		expect(sql).toContain("scope_type IN ('global', 'vertical', 'brand', 'site')");
		expect(sql).toContain("site_id UUID REFERENCES sites(id)");
		expect(sql).toContain("vertical_id UUID REFERENCES verticals(id)");
		expect(sql).toContain("brand_id UUID REFERENCES brands(id)");
		expect(sql).toContain("ix_daily_sales_stats_site_date");
	});

	it("adds Site Customer and address tables without removing legacy users", async () => {
		const sql = await readFile(
			join(defaultMigrationsDir, "0009_site_customers_addresses.up.sql"),
			"utf8",
		);

		expect(sql).toContain("CREATE TABLE site_customers");
		expect(sql).toContain("CREATE TABLE site_customer_addresses");
		expect(sql).toContain("global_user_id UUID REFERENCES users(id)");
		expect(sql).toContain("guest_token VARCHAR(128)");
		expect(sql).toContain("ux_site_customers_guest");
		expect(sql).toContain("ux_site_customer_addresses_default");
		expect(sql).toContain("FROM users");
		expect(sql).not.toContain("DROP TABLE users");
		expect(sql).not.toContain("DROP TABLE user_addresses");
	});
});
