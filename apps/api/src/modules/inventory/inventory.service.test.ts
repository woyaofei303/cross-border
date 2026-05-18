import { describe, expect, it } from "vitest";
import { DomainRuleViolationError } from "../../common/domain/domain-errors.js";
import { defaultSiteContext } from "../../common/site/site-context.js";
import { InventoryWorkflowService } from "./inventory.service.js";
import type { ExistingInventoryLock, InventorySnapshot } from "./inventory.types.js";

describe("InventoryWorkflowService", () => {
	const service = new InventoryWorkflowService();
	const inventory: InventorySnapshot = {
		siteId: defaultSiteContext.siteId,
		verticalId: defaultSiteContext.verticalId,
		brandId: defaultSiteContext.brandId,
		skuId: "sku-1",
		warehouseId: "wh-1",
		availableQty: 10,
		lockedQty: 0,
		physicalQty: 10,
		inboundQty: 0,
		safetyQty: 2,
		version: 0,
	};

	it("locks available inventory above safety stock and emits InventoryLocked", () => {
		const plan = service.planLockInventory({
			orderId: "order-1",
			orderItemId: "item-1",
			quantity: 3,
			expiresAt: "2026-05-16T01:00:00.000Z",
			idempotencyKey: "lock-order-1-item-1",
			inventory,
		});

		expect(plan.after.availableQty).toBe(7);
		expect(plan.after.lockedQty).toBe(3);
		expect(plan.transaction.type).toBe("lock");
		expect(plan.transaction).toMatchObject({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
		});
		expect(plan.lock.status).toBe("locked");
		expect(plan.lock).toMatchObject({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
		});
		expect(plan.events[0]?.eventType).toBe("InventoryLocked");
	});

	it("rejects locking inventory that would consume safety stock", () => {
		expect(() =>
			service.planLockInventory({
				orderId: "order-1",
				orderItemId: "item-1",
				quantity: 9,
				expiresAt: "2026-05-16T01:00:00.000Z",
				idempotencyKey: "lock-order-1-item-1",
				inventory,
			}),
		).toThrow(DomainRuleViolationError);
	});

	it("releases locked inventory back to available quantity", () => {
		const lockedInventory: InventorySnapshot = {
			...inventory,
			availableQty: 7,
			lockedQty: 3,
			version: 1,
		};
		const lock: ExistingInventoryLock = {
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			orderId: "order-1",
			orderItemId: "item-1",
			skuId: "sku-1",
			warehouseId: "wh-1",
			quantity: 3,
			status: "locked",
			idempotencyKey: "lock-order-1-item-1",
		};

		const plan = service.planReleaseLock({
			lock,
			inventory: lockedInventory,
			reason: "payment_timeout",
			idempotencyKey: "release-order-1-item-1",
		});

		expect(plan.after.availableQty).toBe(10);
		expect(plan.after.lockedQty).toBe(0);
		expect(plan.nextLockStatus).toBe("released");
		expect(plan.events[0]?.eventType).toBe("InventoryReleased");
	});

	it("deducts locked inventory from physical quantity after payment succeeds", () => {
		const lockedInventory: InventorySnapshot = {
			...inventory,
			availableQty: 7,
			lockedQty: 3,
			version: 1,
		};
		const lock: ExistingInventoryLock = {
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			orderId: "order-1",
			orderItemId: "item-1",
			skuId: "sku-1",
			warehouseId: "wh-1",
			quantity: 3,
			status: "locked",
			idempotencyKey: "lock-order-1-item-1",
		};

		const plan = service.planDeductLock({
			lock,
			inventory: lockedInventory,
			idempotencyKey: "deduct-order-1-item-1",
		});

		expect(plan.after.availableQty).toBe(7);
		expect(plan.after.lockedQty).toBe(0);
		expect(plan.after.physicalQty).toBe(7);
		expect(plan.nextLockStatus).toBe("deducted");
		expect(plan.events[0]?.eventType).toBe("InventoryDeducted");
	});

	it("rejects deducting a released lock", () => {
		const lock: ExistingInventoryLock = {
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			orderId: "order-1",
			orderItemId: "item-1",
			skuId: "sku-1",
			warehouseId: "wh-1",
			quantity: 3,
			status: "released",
			idempotencyKey: "lock-order-1-item-1",
		};

		expect(() =>
			service.planDeductLock({
				lock,
				inventory,
				idempotencyKey: "deduct-order-1-item-1",
			}),
		).toThrow(DomainRuleViolationError);
	});

	it("rejects deducting a lock from another site scope", () => {
		const lock: ExistingInventoryLock = {
			siteId: "00000000-0000-4000-8000-000000009999",
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			orderId: "order-1",
			orderItemId: "item-1",
			skuId: "sku-1",
			warehouseId: "wh-1",
			quantity: 3,
			status: "locked",
			idempotencyKey: "lock-order-1-item-1",
		};

		expect(() =>
			service.planDeductLock({
				lock,
				inventory,
				idempotencyKey: "deduct-order-1-item-1",
			}),
		).toThrow(DomainRuleViolationError);
	});
});
