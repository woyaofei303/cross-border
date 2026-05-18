import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import type { AdminAccessService } from "../../admin-access/admin-access.service.js";
import type {
	ListAdminInventoryBalancesUseCase,
	ListAdminInventoryLocksUseCase,
	ListAdminInventoryTransactionsUseCase,
} from "../inventory.use-cases.js";
import { AdminInventoryController } from "./admin-inventory.controller.js";

function createController(input: {
	access?: unknown;
	balances?: unknown;
	locks?: unknown;
	transactions?: unknown;
}) {
	return new AdminInventoryController(
		input.access as AdminAccessService,
		input.balances as ListAdminInventoryBalancesUseCase,
		input.locks as ListAdminInventoryLocksUseCase,
		input.transactions as ListAdminInventoryTransactionsUseCase,
	);
}

describe("AdminInventoryController", () => {
	it("lists scoped SKU inventory balances", async () => {
		const access = {
			source: "database" as const,
			adminUserId: "admin-1",
			scopes: [{ scopeType: "site" as const, scopeId: defaultSiteContext.siteId }],
		};
		const resolveForRequest = vi.fn(async () => access);
		const execute = vi.fn(async () => [
			{
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				skuId: "sku-1",
				skuCode: "SKU-1",
				productId: "product-1",
				productTitle: "Demo Product",
				warehouseId: "warehouse-1",
				warehouseCode: "WH-US",
				warehouseName: "US Warehouse",
				availableQty: 8,
				lockedQty: 0,
				physicalQty: 8,
				inboundQty: 0,
				safetyQty: 1,
				updatedAt: "2026-05-16T00:00:00.000Z",
			},
		]);
		const controller = createController({
			access: { resolveForRequest },
			balances: { execute },
			locks: { execute: async () => [] },
			transactions: { execute: async () => [] },
		});

		const response = await controller.listInventoryBalances(
			{ headers: { "x-admin-user-id": "admin-1" } },
			{ scopeType: "site", scopeId: defaultSiteContext.siteId, limit: 20 },
		);

		expect(execute).toHaveBeenCalledWith({
			adminAccess: access,
			selectedScope: {
				scopeType: "site",
				scopeId: defaultSiteContext.siteId,
			},
			limit: 20,
		});
		expect(response.inventoryBalances[0]).toMatchObject({
			skuCode: "SKU-1",
			availableQty: 8,
			lockedQty: 0,
			physicalQty: 8,
		});
	});

	it("lists scoped inventory locks with expiry and idempotency", async () => {
		const execute = vi.fn(async () => [
			{
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				inventoryLockId: "lock-1",
				orderId: "order-1",
				orderNo: "CB202605160001",
				orderItemId: "item-1",
				skuId: "sku-1",
				skuCode: "SKU-1",
				warehouseId: "warehouse-1",
				warehouseCode: "WH-US",
				quantity: 2,
				status: "deducted",
				idempotencyKey: "lock-order-1-item-1",
				expiresAt: "2026-05-16T00:30:00.000Z",
				deductedAt: "2026-05-16T00:05:00.000Z",
				createdAt: "2026-05-16T00:00:00.000Z",
			},
		]);
		const controller = createController({
			access: {
				resolveForRequest: async () => ({
					source: "fallback",
					scopes: [{ scopeType: "global" }],
				}),
			},
			balances: { execute: async () => [] },
			locks: { execute },
			transactions: { execute: async () => [] },
		});

		const response = await controller.listInventoryLocks(
			{ headers: {} },
			{ scopeType: "global", limit: 10 },
		);

		expect(response.inventoryLocks[0]).toMatchObject({
			orderNo: "CB202605160001",
			status: "deducted",
			idempotencyKey: "lock-order-1-item-1",
		});
		expect(execute).toHaveBeenCalledWith({
			adminAccess: {
				source: "fallback",
				scopes: [{ scopeType: "global" }],
			},
			selectedScope: { scopeType: "global" },
			limit: 10,
		});
	});

	it("lists scoped inventory transactions with before and after quantities", async () => {
		const execute = vi.fn(async () => [
			{
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				inventoryTransactionId: "txn-1",
				skuId: "sku-1",
				skuCode: "SKU-1",
				warehouseId: "warehouse-1",
				warehouseCode: "WH-US",
				orderId: "order-1",
				orderNo: "CB202605160001",
				type: "deduct",
				quantity: 2,
				beforeAvailable: 8,
				afterAvailable: 8,
				beforeLocked: 2,
				afterLocked: 0,
				beforePhysical: 10,
				afterPhysical: 8,
				idempotencyKey: "deduct-order-1-item-1",
				createdAt: "2026-05-16T00:05:00.000Z",
			},
		]);
		const controller = createController({
			access: {
				resolveForRequest: async () => ({
					source: "database",
					scopes: [
						{ scopeType: "site", scopeId: defaultSiteContext.siteId },
					],
				}),
			},
			balances: { execute: async () => [] },
			locks: { execute: async () => [] },
			transactions: { execute },
		});

		const response = await controller.listInventoryTransactions(
			{ headers: {} },
			{ scopeType: "site", scopeId: defaultSiteContext.siteId },
		);

		expect(response.inventoryTransactions[0]).toMatchObject({
			type: "deduct",
			beforeLocked: 2,
			afterLocked: 0,
			idempotencyKey: "deduct-order-1-item-1",
		});
	});

	it("rejects non-global selected scope without scope id", async () => {
		const controller = createController({
			access: {
				resolveForRequest: async () => ({
					source: "fallback",
					scopes: [{ scopeType: "global" }],
				}),
			},
			balances: {
				execute: async () => {
					throw new Error("Should not list without scope id.");
				},
			},
			locks: { execute: async () => [] },
			transactions: { execute: async () => [] },
		});

		await expect(
			controller.listInventoryBalances({ headers: {} }, { scopeType: "site" }),
		).rejects.toBeInstanceOf(BadRequestException);
	});
});
