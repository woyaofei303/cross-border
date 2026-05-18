import type {
	AdminAccessContext,
	AdminScope,
} from "../../common/admin/admin-access.js";
import type { TransactionContext } from "../../common/application/application-ports.js";
import type { SiteDimensions } from "../../common/site/site-context.js";
import type {
	ExistingInventoryLock,
	InventoryMutation,
	InventorySnapshot,
	LockInventoryPlan,
} from "./inventory.types.js";

export type InventoryLockWithSnapshot = {
	lock: ExistingInventoryLock;
	inventory: InventorySnapshot;
};

export interface InventoryWriteRepositoryPort {
	getInventoryForUpdate(
		input: SiteDimensions & {
			skuId: string;
			warehouseId: string;
			allowLegacyNullScope?: boolean;
			transaction: TransactionContext;
		},
	): Promise<InventorySnapshot>;

	saveLock(
		lock: LockInventoryPlan["lock"],
		transaction: TransactionContext,
	): Promise<void>;

	getLocksForOrderForUpdate(
		input: SiteDimensions & {
			orderId: string;
			allowLegacyNullScope?: boolean;
			transaction: TransactionContext;
		},
	): Promise<InventoryLockWithSnapshot[]>;

	updateInventory(
		snapshot: InventorySnapshot,
		transaction: TransactionContext,
	): Promise<void>;

	appendTransaction(
		transactionRecord: InventoryMutation["transaction"],
		transaction: TransactionContext,
	): Promise<void>;

	updateLockStatus(input: {
		lockIdempotencyKey: string;
		status: "released" | "deducted";
		transaction: TransactionContext;
	}): Promise<void>;
}

export type AdminInventoryScopeQuery = {
	adminAccess: AdminAccessContext;
	selectedScope?: AdminScope;
	limit: number;
};

export type AdminInventoryBalanceListItem = SiteDimensions & {
	skuId: string;
	skuCode: string;
	skuTitle?: string;
	productId: string;
	productTitle: string;
	warehouseId: string;
	warehouseCode: string;
	warehouseName: string;
	availableQty: number;
	lockedQty: number;
	physicalQty: number;
	inboundQty: number;
	safetyQty: number;
	updatedAt: string;
};

export type AdminInventoryLockListItem = SiteDimensions & {
	inventoryLockId: string;
	orderId: string;
	orderNo?: string;
	orderItemId: string;
	skuId: string;
	skuCode?: string;
	warehouseId: string;
	warehouseCode?: string;
	quantity: number;
	status: string;
	idempotencyKey: string;
	expiresAt: string;
	releasedAt?: string;
	deductedAt?: string;
	createdAt: string;
};

export type AdminInventoryTransactionListItem = SiteDimensions & {
	inventoryTransactionId: string;
	skuId: string;
	skuCode?: string;
	warehouseId: string;
	warehouseCode?: string;
	orderId?: string;
	orderNo?: string;
	type: string;
	quantity: number;
	beforeAvailable: number;
	afterAvailable: number;
	beforeLocked: number;
	afterLocked: number;
	beforePhysical: number;
	afterPhysical: number;
	idempotencyKey: string;
	createdAt: string;
};

export interface InventoryAdminReadRepositoryPort {
	listAdminInventoryBalances(
		query: AdminInventoryScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminInventoryBalanceListItem[]>;

	listAdminInventoryLocks(
		query: AdminInventoryScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminInventoryLockListItem[]>;

	listAdminInventoryTransactions(
		query: AdminInventoryScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminInventoryTransactionListItem[]>;
}
