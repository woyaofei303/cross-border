import { Injectable } from "@nestjs/common";
import type {
	InventoryDeductedPayload,
	InventoryLockedPayload,
	InventoryReleasedPayload,
} from "@cross-border/shared";
import { assertDomainRule } from "../../common/domain/domain-errors.js";
import { assertIdempotencyKey } from "../../common/idempotency/assert-idempotency-key.js";
import { assertInventoryLockTransition } from "./inventory-state-machine.js";
import type {
	DeductInventoryLockInput,
	DeductInventoryLockPlan,
	InventoryMutation,
	InventorySnapshot,
	LockInventoryInput,
	LockInventoryPlan,
	ReleaseInventoryLockInput,
	ReleaseInventoryLockPlan,
} from "./inventory.types.js";

function assertPositiveQuantity(quantity: number): void {
	assertDomainRule(
		Number.isInteger(quantity) && quantity > 0,
		"INVENTORY_QUANTITY_INVALID",
		"Inventory quantity must be a positive integer.",
	);
}

function assertInventoryIdentity(
	lock: {
		siteId: string;
		verticalId: string;
		brandId: string;
		skuId: string;
		warehouseId: string;
	},
	inventory: InventorySnapshot,
): void {
	assertDomainRule(
		lock.siteId === inventory.siteId &&
			lock.verticalId === inventory.verticalId &&
			lock.brandId === inventory.brandId &&
			lock.skuId === inventory.skuId &&
			lock.warehouseId === inventory.warehouseId,
		"INVENTORY_LOCK_SNAPSHOT_MISMATCH",
		"Inventory lock must match the inventory snapshot.",
	);
}

function buildMutation(input: {
	before: InventorySnapshot;
	after: InventorySnapshot;
	orderId?: string;
	type: "lock" | "release" | "deduct";
	quantity: number;
	idempotencyKey: string;
}): InventoryMutation {
	return {
		before: input.before,
		after: input.after,
		transaction: {
			siteId: input.before.siteId,
			verticalId: input.before.verticalId,
			brandId: input.before.brandId,
			skuId: input.before.skuId,
			warehouseId: input.before.warehouseId,
			...(input.orderId ? { orderId: input.orderId } : {}),
			type: input.type,
			quantity: input.quantity,
			beforeAvailable: input.before.availableQty,
			afterAvailable: input.after.availableQty,
			beforeLocked: input.before.lockedQty,
			afterLocked: input.after.lockedQty,
			beforePhysical: input.before.physicalQty,
			afterPhysical: input.after.physicalQty,
			idempotencyKey: input.idempotencyKey,
		},
	};
}

@Injectable()
export class InventoryWorkflowService {
	planLockInventory(input: LockInventoryInput): LockInventoryPlan {
		assertIdempotencyKey(input.idempotencyKey);
		assertPositiveQuantity(input.quantity);
		assertDomainRule(
			input.inventory.availableQty - input.inventory.safetyQty >= input.quantity,
			"INVENTORY_AVAILABLE_QUANTITY_INSUFFICIENT",
			"Available inventory minus safety stock is insufficient.",
		);

		const after: InventorySnapshot = {
			...input.inventory,
			availableQty: input.inventory.availableQty - input.quantity,
			lockedQty: input.inventory.lockedQty + input.quantity,
			version: input.inventory.version + 1,
		};

		const payload: InventoryLockedPayload = {
			orderId: input.orderId,
			locks: [
				{
					orderItemId: input.orderItemId,
					skuId: input.inventory.skuId,
					warehouseId: input.inventory.warehouseId,
					quantity: input.quantity,
					expiresAt: input.expiresAt,
				},
			],
		};

		return {
			...buildMutation({
				before: input.inventory,
				after,
				orderId: input.orderId,
				type: "lock",
				quantity: input.quantity,
				idempotencyKey: input.idempotencyKey,
			}),
			lock: {
				siteId: input.inventory.siteId,
				verticalId: input.inventory.verticalId,
				brandId: input.inventory.brandId,
				orderId: input.orderId,
				orderItemId: input.orderItemId,
				skuId: input.inventory.skuId,
				warehouseId: input.inventory.warehouseId,
				quantity: input.quantity,
				status: "locked",
				expiresAt: input.expiresAt,
				idempotencyKey: input.idempotencyKey,
			},
			events: [
				{
					eventType: "InventoryLocked",
					aggregateType: "order",
					aggregateId: input.orderId,
					payload,
				},
			],
		};
	}

	planReleaseLock(
		input: ReleaseInventoryLockInput,
	): ReleaseInventoryLockPlan {
		assertIdempotencyKey(input.idempotencyKey);
		assertPositiveQuantity(input.lock.quantity);
		assertInventoryIdentity(input.lock, input.inventory);
		assertInventoryLockTransition(input.lock.status, "released");

		const after: InventorySnapshot = {
			...input.inventory,
			availableQty: input.inventory.availableQty + input.lock.quantity,
			lockedQty: input.inventory.lockedQty - input.lock.quantity,
			version: input.inventory.version + 1,
		};

		assertDomainRule(
			after.lockedQty >= 0,
			"INVENTORY_LOCKED_QUANTITY_NEGATIVE",
			"Locked inventory cannot become negative.",
		);

		const payload: InventoryReleasedPayload = {
			orderId: input.lock.orderId,
			locks: [
				{
					skuId: input.lock.skuId,
					warehouseId: input.lock.warehouseId,
					quantity: input.lock.quantity,
				},
			],
			reason: input.reason,
		};

		return {
			...buildMutation({
				before: input.inventory,
				after,
				orderId: input.lock.orderId,
				type: "release",
				quantity: input.lock.quantity,
				idempotencyKey: input.idempotencyKey,
			}),
			nextLockStatus: "released",
			events: [
				{
					eventType: "InventoryReleased",
					aggregateType: "order",
					aggregateId: input.lock.orderId,
					payload,
				},
			],
		};
	}

	planDeductLock(input: DeductInventoryLockInput): DeductInventoryLockPlan {
		assertIdempotencyKey(input.idempotencyKey);
		assertPositiveQuantity(input.lock.quantity);
		assertInventoryIdentity(input.lock, input.inventory);
		assertInventoryLockTransition(input.lock.status, "deducted");

		const after: InventorySnapshot = {
			...input.inventory,
			lockedQty: input.inventory.lockedQty - input.lock.quantity,
			physicalQty: input.inventory.physicalQty - input.lock.quantity,
			version: input.inventory.version + 1,
		};

		assertDomainRule(
			after.lockedQty >= 0,
			"INVENTORY_LOCKED_QUANTITY_NEGATIVE",
			"Locked inventory cannot become negative.",
		);
		assertDomainRule(
			after.physicalQty >= 0,
			"INVENTORY_PHYSICAL_QUANTITY_NEGATIVE",
			"Physical inventory cannot become negative.",
		);

		const payload: InventoryDeductedPayload = {
			orderId: input.lock.orderId,
			locks: [
				{
					skuId: input.lock.skuId,
					warehouseId: input.lock.warehouseId,
					quantity: input.lock.quantity,
				},
			],
		};

		return {
			...buildMutation({
				before: input.inventory,
				after,
				orderId: input.lock.orderId,
				type: "deduct",
				quantity: input.lock.quantity,
				idempotencyKey: input.idempotencyKey,
			}),
			nextLockStatus: "deducted",
			events: [
				{
					eventType: "InventoryDeducted",
					aggregateType: "order",
					aggregateId: input.lock.orderId,
					payload,
				},
			],
		};
	}
}
