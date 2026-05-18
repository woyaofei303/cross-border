import { describe, expect, it, vi } from "vitest";
import type { TransactionContext } from "../../../common/application/application-ports.js";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import { PgInventoryRepository } from "./pg-inventory.repository.js";

function createTransaction(
	queryImpl: (sql: string, params?: unknown[]) => Promise<unknown>,
) {
	const query = vi.fn(queryImpl);

	return {
		query,
		transaction: {
			transactionId: Symbol("test"),
			client: { query },
		} as unknown as TransactionContext,
	};
}

describe("PgInventoryRepository", () => {
	it("loads inventory with site scope and legacy null fallback", async () => {
		const { query, transaction } = createTransaction(async () => ({
			rows: [
				{
					site_id: defaultSiteContext.siteId,
					vertical_id: defaultSiteContext.verticalId,
					brand_id: defaultSiteContext.brandId,
					sku_id: "sku-1",
					warehouse_id: "wh-1",
					available_qty: 10,
					locked_qty: 0,
					physical_qty: 10,
					inbound_qty: 0,
					safety_qty: 1,
					version: 0,
				},
			],
			rowCount: 1,
		}));
		const repository = new PgInventoryRepository();

		const result = await repository.getInventoryForUpdate({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			skuId: "sku-1",
			warehouseId: "wh-1",
			allowLegacyNullScope: true,
			transaction,
		});

		expect(result).toMatchObject({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			skuId: "sku-1",
		});
		expect(query.mock.calls[0]?.[0]).toContain("site_id = $3");
		expect(query.mock.calls[0]?.[0]).toContain("site_id IS NULL");
		expect(query.mock.calls[0]?.[1]).toEqual([
			"sku-1",
			"wh-1",
			defaultSiteContext.siteId,
			defaultSiteContext.verticalId,
			defaultSiteContext.brandId,
			true,
		]);
	});

	it("persists inventory locks with site dimensions", async () => {
		const { query, transaction } = createTransaction(async () => ({
			rows: [],
			rowCount: 1,
		}));
		const repository = new PgInventoryRepository();

		await repository.saveLock(
			{
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				orderId: "order-1",
				orderItemId: "item-1",
				skuId: "sku-1",
				warehouseId: "wh-1",
				quantity: 2,
				status: "locked",
				expiresAt: "2026-05-16T01:00:00.000Z",
				idempotencyKey: "lock-1",
			},
			transaction,
		);

		expect(query.mock.calls[0]?.[0]).toContain("site_id");
		expect(query.mock.calls[0]?.[1]?.slice(0, 3)).toEqual([
			defaultSiteContext.siteId,
			defaultSiteContext.verticalId,
			defaultSiteContext.brandId,
		]);
	});

	it("loads order locks and inventory snapshots within the same site scope", async () => {
		const { query, transaction } = createTransaction(async () => ({
			rows: [
				{
					lock_site_id: defaultSiteContext.siteId,
					lock_vertical_id: defaultSiteContext.verticalId,
					lock_brand_id: defaultSiteContext.brandId,
					inventory_site_id: defaultSiteContext.siteId,
					inventory_vertical_id: defaultSiteContext.verticalId,
					inventory_brand_id: defaultSiteContext.brandId,
					order_id: "order-1",
					order_item_id: "item-1",
					sku_id: "sku-1",
					warehouse_id: "wh-1",
					quantity: 2,
					status: "locked",
					idempotency_key: "lock-1",
					available_qty: 8,
					locked_qty: 2,
					physical_qty: 10,
					inbound_qty: 0,
					safety_qty: 1,
					version: 1,
				},
			],
			rowCount: 1,
		}));
		const repository = new PgInventoryRepository();

		const result = await repository.getLocksForOrderForUpdate({
			orderId: "order-1",
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			allowLegacyNullScope: true,
			transaction,
		});

		expect(result[0]).toMatchObject({
			lock: {
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				orderId: "order-1",
			},
			inventory: {
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				skuId: "sku-1",
			},
		});
		expect(query.mock.calls[0]?.[0]).toContain("inventory_locks.site_id");
		expect(query.mock.calls[0]?.[0]).toContain("sku_inventory.site_id");
	});

	it("updates inventory with scope and optimistic version check", async () => {
		const { query, transaction } = createTransaction(async () => ({
			rows: [],
			rowCount: 1,
		}));
		const repository = new PgInventoryRepository();

		await repository.updateInventory(
			{
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				skuId: "sku-1",
				warehouseId: "wh-1",
				availableQty: 8,
				lockedQty: 2,
				physicalQty: 10,
				inboundQty: 0,
				safetyQty: 1,
				version: 1,
			},
			transaction,
		);

		expect(query.mock.calls[0]?.[0]).toContain("site_id = $9");
		expect(query.mock.calls[0]?.[0]).toContain("version = $13");
		expect(query.mock.calls[0]?.[1]?.slice(8)).toEqual([
			defaultSiteContext.siteId,
			defaultSiteContext.verticalId,
			defaultSiteContext.brandId,
			true,
			0,
		]);
	});

	it("rejects inventory updates when the version has already changed", async () => {
		const { transaction } = createTransaction(async () => ({
			rows: [],
			rowCount: 0,
		}));
		const repository = new PgInventoryRepository();

		await expect(
			repository.updateInventory(
				{
					siteId: defaultSiteContext.siteId,
					verticalId: defaultSiteContext.verticalId,
					brandId: defaultSiteContext.brandId,
					skuId: "sku-1",
					warehouseId: "wh-1",
					availableQty: 8,
					lockedQty: 2,
					physicalQty: 10,
					inboundQty: 0,
					safetyQty: 1,
					version: 1,
				},
				transaction,
			),
		).rejects.toThrow("Inventory update conflict");
	});

	it("writes inventory transactions with site dimensions", async () => {
		const { query, transaction } = createTransaction(async () => ({
			rows: [],
			rowCount: 1,
		}));
		const repository = new PgInventoryRepository();

		await repository.appendTransaction(
			{
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				skuId: "sku-1",
				warehouseId: "wh-1",
				orderId: "order-1",
				type: "lock",
				quantity: 2,
				beforeAvailable: 10,
				afterAvailable: 8,
				beforeLocked: 0,
				afterLocked: 2,
				beforePhysical: 10,
				afterPhysical: 10,
				idempotencyKey: "tx-1",
			},
			transaction,
		);

		expect(query.mock.calls[0]?.[0]).toContain("site_id");
		expect(query.mock.calls[0]?.[1]?.slice(0, 3)).toEqual([
			defaultSiteContext.siteId,
			defaultSiteContext.verticalId,
			defaultSiteContext.brandId,
		]);
	});

	it("lists admin inventory balances within selected site scope", async () => {
		const { query, transaction } = createTransaction(async () => ({
			rows: [
				{
					site_id: defaultSiteContext.siteId,
					vertical_id: defaultSiteContext.verticalId,
					brand_id: defaultSiteContext.brandId,
					sku_id: "sku-1",
					sku_code: "SKU-1",
					sku_title: "Demo SKU",
					product_id: "product-1",
					product_title: "Demo Product",
					warehouse_id: "warehouse-1",
					warehouse_code: "WH-US",
					warehouse_name: "US Warehouse",
					available_qty: 8,
					locked_qty: 0,
					physical_qty: 8,
					inbound_qty: 0,
					safety_qty: 1,
					updated_at: "2026-05-16T00:00:00.000Z",
				},
			],
			rowCount: 1,
		}));
		const repository = new PgInventoryRepository();

		const result = await repository.listAdminInventoryBalances(
			{
				adminAccess: {
					source: "database",
					scopes: [
						{ scopeType: "site", scopeId: defaultSiteContext.siteId },
					],
				},
				selectedScope: {
					scopeType: "site",
					scopeId: defaultSiteContext.siteId,
				},
				limit: 20,
			},
			transaction,
		);

		expect(result[0]).toMatchObject({
			siteId: defaultSiteContext.siteId,
			skuCode: "SKU-1",
			availableQty: 8,
			lockedQty: 0,
			physicalQty: 8,
		});
		expect(query.mock.calls[0]?.[0]).toContain("FROM sku_inventory");
		expect(query.mock.calls[0]?.[0]).toContain("sku_inventory.site_id");
		expect(query.mock.calls[0]?.[1]).toEqual([
			defaultSiteContext.siteId,
			defaultSiteContext.siteId,
			20,
		]);
	});

	it("lists admin inventory locks with release and deduction timestamps", async () => {
		const { query, transaction } = createTransaction(async () => ({
			rows: [
				{
					inventory_lock_id: "lock-1",
					order_id: "order-1",
					order_no: "CB202605160001",
					order_item_id: "item-1",
					site_id: defaultSiteContext.siteId,
					vertical_id: defaultSiteContext.verticalId,
					brand_id: defaultSiteContext.brandId,
					sku_id: "sku-1",
					sku_code: "SKU-1",
					warehouse_id: "warehouse-1",
					warehouse_code: "WH-US",
					quantity: 2,
					status: "deducted",
					idempotency_key: "lock-order-1-item-1",
					expires_at: "2026-05-16T00:30:00.000Z",
					released_at: null,
					deducted_at: "2026-05-16T00:05:00.000Z",
					created_at: "2026-05-16T00:00:00.000Z",
				},
			],
			rowCount: 1,
		}));
		const repository = new PgInventoryRepository();

		const result = await repository.listAdminInventoryLocks(
			{
				adminAccess: {
					source: "fallback",
					scopes: [{ scopeType: "global" }],
				},
				selectedScope: { scopeType: "global" },
				limit: 20,
			},
			transaction,
		);

		expect(result[0]).toMatchObject({
			orderNo: "CB202605160001",
			status: "deducted",
			idempotencyKey: "lock-order-1-item-1",
			deductedAt: "2026-05-16T00:05:00.000Z",
		});
		expect(query.mock.calls[0]?.[0]).toContain("FROM inventory_locks");
	});

	it("lists admin inventory transactions with before and after quantities", async () => {
		const { query, transaction } = createTransaction(async () => ({
			rows: [
				{
					inventory_transaction_id: "txn-1",
					site_id: defaultSiteContext.siteId,
					vertical_id: defaultSiteContext.verticalId,
					brand_id: defaultSiteContext.brandId,
					sku_id: "sku-1",
					sku_code: "SKU-1",
					warehouse_id: "warehouse-1",
					warehouse_code: "WH-US",
					order_id: "order-1",
					order_no: "CB202605160001",
					transaction_type: "deduct",
					quantity: 2,
					before_available: 8,
					after_available: 8,
					before_locked: 2,
					after_locked: 0,
					before_physical: 10,
					after_physical: 8,
					idempotency_key: "deduct-order-1-item-1",
					created_at: "2026-05-16T00:05:00.000Z",
				},
			],
			rowCount: 1,
		}));
		const repository = new PgInventoryRepository();

		const result = await repository.listAdminInventoryTransactions(
			{
				adminAccess: {
					source: "fallback",
					scopes: [{ scopeType: "global" }],
				},
				limit: 20,
			},
			transaction,
		);

		expect(result[0]).toMatchObject({
			type: "deduct",
			beforeLocked: 2,
			afterLocked: 0,
			beforePhysical: 10,
			afterPhysical: 8,
			idempotencyKey: "deduct-order-1-item-1",
		});
		expect(query.mock.calls[0]?.[0]).toContain("FROM inventory_transactions");
	});
});
