import { describe, expect, it, vi } from "vitest";
import type { TransactionContext } from "../../common/application/application-ports.js";
import { defaultSiteContext } from "../../common/site/site-context.js";
import {
	ListAdminInventoryBalancesUseCase,
	ListAdminInventoryLocksUseCase,
	ListAdminInventoryTransactionsUseCase,
} from "./inventory.use-cases.js";

const transaction = {
	transactionId: Symbol("test"),
} as unknown as TransactionContext;

function createTransactions() {
	return {
		runInTransaction: vi.fn(async (callback) => callback(transaction)),
	};
}

describe("admin inventory read use cases", () => {
	const adminAccess = {
		source: "fallback" as const,
		scopes: [{ scopeType: "global" as const }],
	};

	it("lists inventory balances with normalized limit", async () => {
		const transactions = createTransactions();
		const listAdminInventoryBalances = vi.fn(async () => [
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
		const useCase = new ListAdminInventoryBalancesUseCase({
			transactions,
			inventory: {
				listAdminInventoryBalances,
				listAdminInventoryLocks: async () => [],
				listAdminInventoryTransactions: async () => [],
			},
		});

		const result = await useCase.execute({
			adminAccess,
			limit: 200,
		});

		expect(result[0]?.skuCode).toBe("SKU-1");
		expect(listAdminInventoryBalances).toHaveBeenCalledWith(
			{
				adminAccess,
				limit: 100,
			},
			transaction,
		);
	});

	it("lists inventory locks with selected scope", async () => {
		const transactions = createTransactions();
		const listAdminInventoryLocks = vi.fn(async () => [
			{
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				inventoryLockId: "lock-1",
				orderId: "order-1",
				orderItemId: "item-1",
				skuId: "sku-1",
				warehouseId: "warehouse-1",
				quantity: 2,
				status: "locked",
				idempotencyKey: "lock-1",
				expiresAt: "2026-05-16T00:30:00.000Z",
				createdAt: "2026-05-16T00:00:00.000Z",
			},
		]);
		const useCase = new ListAdminInventoryLocksUseCase({
			transactions,
			inventory: {
				listAdminInventoryBalances: async () => [],
				listAdminInventoryLocks,
				listAdminInventoryTransactions: async () => [],
			},
		});

		await useCase.execute({
			adminAccess,
			selectedScope: {
				scopeType: "site",
				scopeId: defaultSiteContext.siteId,
			},
		});

		expect(listAdminInventoryLocks).toHaveBeenCalledWith(
			{
				adminAccess,
				selectedScope: {
					scopeType: "site",
					scopeId: defaultSiteContext.siteId,
				},
				limit: 50,
			},
			transaction,
		);
	});

	it("lists inventory transactions for trace display", async () => {
		const transactions = createTransactions();
		const listAdminInventoryTransactions = vi.fn(async () => [
			{
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				inventoryTransactionId: "txn-1",
				skuId: "sku-1",
				warehouseId: "warehouse-1",
				type: "deduct",
				quantity: 2,
				beforeAvailable: 8,
				afterAvailable: 8,
				beforeLocked: 2,
				afterLocked: 0,
				beforePhysical: 10,
				afterPhysical: 8,
				idempotencyKey: "deduct-1",
				createdAt: "2026-05-16T00:05:00.000Z",
			},
		]);
		const useCase = new ListAdminInventoryTransactionsUseCase({
			transactions,
			inventory: {
				listAdminInventoryBalances: async () => [],
				listAdminInventoryLocks: async () => [],
				listAdminInventoryTransactions,
			},
		});

		const result = await useCase.execute({ adminAccess });

		expect(result[0]).toMatchObject({
			type: "deduct",
			beforeLocked: 2,
			afterLocked: 0,
		});
	});
});
