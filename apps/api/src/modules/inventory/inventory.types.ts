import type { DomainEventType, InventoryLockStatus } from "@cross-border/shared";
import type { SiteDimensions } from "../../common/site/site-context.js";

export type DomainEventDraft<TPayload> = {
	eventType: DomainEventType;
	aggregateType: string;
	aggregateId: string;
	payload: TPayload;
};

export type InventorySnapshot = SiteDimensions & {
	skuId: string;
	warehouseId: string;
	availableQty: number;
	lockedQty: number;
	physicalQty: number;
	inboundQty: number;
	safetyQty: number;
	version: number;
};

export type InventoryMutation = {
	before: InventorySnapshot;
	after: InventorySnapshot;
	transaction: {
		siteId: string;
		verticalId: string;
		brandId: string;
		skuId: string;
		warehouseId: string;
		orderId?: string;
		type: "lock" | "release" | "deduct";
		quantity: number;
		beforeAvailable: number;
		afterAvailable: number;
		beforeLocked: number;
		afterLocked: number;
		beforePhysical: number;
		afterPhysical: number;
		idempotencyKey: string;
	};
};

export type LockInventoryInput = {
	orderId: string;
	orderItemId: string;
	quantity: number;
	expiresAt: string;
	idempotencyKey: string;
	inventory: InventorySnapshot;
};

export type LockInventoryPlan = InventoryMutation & {
	lock: {
		siteId: string;
		verticalId: string;
		brandId: string;
		orderId: string;
		orderItemId: string;
		skuId: string;
		warehouseId: string;
		quantity: number;
		status: "locked";
		expiresAt: string;
		idempotencyKey: string;
	};
	events: DomainEventDraft<Record<string, unknown>>[];
};

export type ExistingInventoryLock = SiteDimensions & {
	orderId: string;
	orderItemId: string;
	skuId: string;
	warehouseId: string;
	quantity: number;
	status: InventoryLockStatus;
	idempotencyKey: string;
};

export type ReleaseInventoryLockInput = {
	lock: ExistingInventoryLock;
	inventory: InventorySnapshot;
	reason: string;
	idempotencyKey: string;
};

export type ReleaseInventoryLockPlan = InventoryMutation & {
	nextLockStatus: "released";
	events: DomainEventDraft<Record<string, unknown>>[];
};

export type DeductInventoryLockInput = {
	lock: ExistingInventoryLock;
	inventory: InventorySnapshot;
	idempotencyKey: string;
};

export type DeductInventoryLockPlan = InventoryMutation & {
	nextLockStatus: "deducted";
	events: DomainEventDraft<Record<string, unknown>>[];
};
