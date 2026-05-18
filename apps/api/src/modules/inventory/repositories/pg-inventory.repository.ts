import { Injectable } from "@nestjs/common";
import type { InventoryLockStatus } from "@cross-border/shared";
import type { AdminScope } from "../../../common/admin/admin-access.js";
import { hasGlobalAdminScope } from "../../../common/admin/admin-access.js";
import type { TransactionContext } from "../../../common/application/application-ports.js";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import { getPgClient } from "../../database/pg/pg-transaction-manager.js";
import type {
	AdminInventoryBalanceListItem,
	AdminInventoryLockListItem,
	AdminInventoryScopeQuery,
	AdminInventoryTransactionListItem,
	InventoryAdminReadRepositoryPort,
	InventoryLockWithSnapshot,
	InventoryWriteRepositoryPort,
} from "../inventory.ports.js";
import type {
	ExistingInventoryLock,
	InventoryMutation,
	InventorySnapshot,
	LockInventoryPlan,
} from "../inventory.types.js";

type InventoryRow = {
	site_id: string;
	vertical_id: string;
	brand_id: string;
	sku_id: string;
	warehouse_id: string;
	available_qty: number;
	locked_qty: number;
	physical_qty: number;
	inbound_qty: number;
	safety_qty: number;
	version: number;
};

type InventoryLockRow = {
	lock_site_id: string;
	lock_vertical_id: string;
	lock_brand_id: string;
	inventory_site_id: string;
	inventory_vertical_id: string;
	inventory_brand_id: string;
	order_id: string;
	order_item_id: string;
	sku_id: string;
	warehouse_id: string;
	quantity: number;
	status: InventoryLockStatus;
	idempotency_key: string;
	available_qty: number;
	locked_qty: number;
	physical_qty: number;
	inbound_qty: number;
	safety_qty: number;
	version: number;
};

type AdminInventoryBalanceListRow = {
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	sku_id: string;
	sku_code: string;
	sku_title: string | null;
	product_id: string;
	product_title: string;
	warehouse_id: string;
	warehouse_code: string;
	warehouse_name: string;
	available_qty: number;
	locked_qty: number;
	physical_qty: number;
	inbound_qty: number;
	safety_qty: number;
	updated_at: Date | string;
};

type AdminInventoryLockListRow = {
	inventory_lock_id: string;
	order_id: string;
	order_no: string | null;
	order_item_id: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	sku_id: string;
	sku_code: string | null;
	warehouse_id: string;
	warehouse_code: string | null;
	quantity: number;
	status: string;
	idempotency_key: string;
	expires_at: Date | string;
	released_at: Date | string | null;
	deducted_at: Date | string | null;
	created_at: Date | string;
};

type AdminInventoryTransactionListRow = {
	inventory_transaction_id: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	sku_id: string;
	sku_code: string | null;
	warehouse_id: string;
	warehouse_code: string | null;
	order_id: string | null;
	order_no: string | null;
	transaction_type: string;
	quantity: number;
	before_available: number;
	after_available: number;
	before_locked: number;
	after_locked: number;
	before_physical: number;
	after_physical: number;
	idempotency_key: string;
	created_at: Date | string;
};

function appendParam(params: unknown[], value: unknown): string {
	params.push(value);

	return `$${params.length}`;
}

function toIsoString(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value;
}

function dimensionFields(row: {
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
}) {
	return {
		siteId: row.site_id ?? defaultSiteContext.siteId,
		verticalId: row.vertical_id ?? defaultSiteContext.verticalId,
		brandId: row.brand_id ?? defaultSiteContext.brandId,
	};
}

function buildDimensionPredicate(
	scope: AdminScope,
	alias: string,
	params: unknown[],
): string {
	if (scope.scopeType === "global") {
		return "TRUE";
	}

	if (!scope.scopeId) {
		return "FALSE";
	}

	const placeholder = appendParam(params, scope.scopeId);

	if (scope.scopeType === "site") {
		return `(${alias}.site_id = ${placeholder} OR (${placeholder} = '${defaultSiteContext.siteId}' AND ${alias}.site_id IS NULL))`;
	}

	if (scope.scopeType === "vertical") {
		return `(${alias}.vertical_id = ${placeholder} OR (${placeholder} = '${defaultSiteContext.verticalId}' AND ${alias}.vertical_id IS NULL))`;
	}

	return `(${alias}.brand_id = ${placeholder} OR (${placeholder} = '${defaultSiteContext.brandId}' AND ${alias}.brand_id IS NULL))`;
}

function buildAdminAccessPredicate(
	scopes: readonly AdminScope[],
	alias: string,
	params: unknown[],
): string {
	if (hasGlobalAdminScope(scopes)) {
		return "TRUE";
	}

	const clauses = scopes.map((scope) =>
		buildDimensionPredicate(scope, alias, params),
	);

	return clauses.length > 0 ? `(${clauses.join(" OR ")})` : "FALSE";
}

function buildSelectedScopePredicate(
	selectedScope: AdminScope | undefined,
	alias: string,
	params: unknown[],
): string {
	return selectedScope
		? buildDimensionPredicate(selectedScope, alias, params)
		: "TRUE";
}

function mapInventory(row: InventoryRow): InventorySnapshot {
	return {
		siteId: row.site_id,
		verticalId: row.vertical_id,
		brandId: row.brand_id,
		skuId: row.sku_id,
		warehouseId: row.warehouse_id,
		availableQty: row.available_qty,
		lockedQty: row.locked_qty,
		physicalQty: row.physical_qty,
		inboundQty: row.inbound_qty,
		safetyQty: row.safety_qty,
		version: row.version,
	};
}

function mapAdminInventoryBalance(
	row: AdminInventoryBalanceListRow,
): AdminInventoryBalanceListItem {
	return {
		...dimensionFields(row),
		skuId: row.sku_id,
		skuCode: row.sku_code,
		...(row.sku_title ? { skuTitle: row.sku_title } : {}),
		productId: row.product_id,
		productTitle: row.product_title,
		warehouseId: row.warehouse_id,
		warehouseCode: row.warehouse_code,
		warehouseName: row.warehouse_name,
		availableQty: row.available_qty,
		lockedQty: row.locked_qty,
		physicalQty: row.physical_qty,
		inboundQty: row.inbound_qty,
		safetyQty: row.safety_qty,
		updatedAt: toIsoString(row.updated_at),
	};
}

function mapAdminInventoryLock(
	row: AdminInventoryLockListRow,
): AdminInventoryLockListItem {
	return {
		...dimensionFields(row),
		inventoryLockId: row.inventory_lock_id,
		orderId: row.order_id,
		...(row.order_no ? { orderNo: row.order_no } : {}),
		orderItemId: row.order_item_id,
		skuId: row.sku_id,
		...(row.sku_code ? { skuCode: row.sku_code } : {}),
		warehouseId: row.warehouse_id,
		...(row.warehouse_code ? { warehouseCode: row.warehouse_code } : {}),
		quantity: row.quantity,
		status: row.status,
		idempotencyKey: row.idempotency_key,
		expiresAt: toIsoString(row.expires_at),
		...(row.released_at
			? { releasedAt: toIsoString(row.released_at) }
			: {}),
		...(row.deducted_at
			? { deductedAt: toIsoString(row.deducted_at) }
			: {}),
		createdAt: toIsoString(row.created_at),
	};
}

function mapAdminInventoryTransaction(
	row: AdminInventoryTransactionListRow,
): AdminInventoryTransactionListItem {
	return {
		...dimensionFields(row),
		inventoryTransactionId: row.inventory_transaction_id,
		skuId: row.sku_id,
		...(row.sku_code ? { skuCode: row.sku_code } : {}),
		warehouseId: row.warehouse_id,
		...(row.warehouse_code ? { warehouseCode: row.warehouse_code } : {}),
		...(row.order_id ? { orderId: row.order_id } : {}),
		...(row.order_no ? { orderNo: row.order_no } : {}),
		type: row.transaction_type,
		quantity: row.quantity,
		beforeAvailable: row.before_available,
		afterAvailable: row.after_available,
		beforeLocked: row.before_locked,
		afterLocked: row.after_locked,
		beforePhysical: row.before_physical,
		afterPhysical: row.after_physical,
		idempotencyKey: row.idempotency_key,
		createdAt: toIsoString(row.created_at),
	};
}

@Injectable()
export class PgInventoryRepository
	implements InventoryWriteRepositoryPort, InventoryAdminReadRepositoryPort
{
	async getInventoryForUpdate(input: {
		siteId: string;
		verticalId: string;
		brandId: string;
		skuId: string;
		warehouseId: string;
		allowLegacyNullScope?: boolean;
		transaction: TransactionContext;
	}): Promise<InventorySnapshot> {
		const allowLegacyNullScope = input.allowLegacyNullScope ?? false;
		const result = await getPgClient(input.transaction).query<InventoryRow>(
			`
        SELECT
          COALESCE(site_id, $3::uuid) AS site_id,
          COALESCE(vertical_id, $4::uuid) AS vertical_id,
          COALESCE(brand_id, $5::uuid) AS brand_id,
          sku_id,
          warehouse_id,
          available_qty,
          locked_qty,
          physical_qty,
          inbound_qty,
          safety_qty,
          version
        FROM sku_inventory
        WHERE sku_id = $1
          AND warehouse_id = $2
          AND (site_id = $3 OR ($6::boolean AND site_id IS NULL))
          AND (vertical_id = $4 OR ($6::boolean AND vertical_id IS NULL))
          AND (brand_id = $5 OR ($6::boolean AND brand_id IS NULL))
        FOR UPDATE
      `,
			[
				input.skuId,
				input.warehouseId,
				input.siteId,
				input.verticalId,
				input.brandId,
				allowLegacyNullScope,
			],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error(
				`Inventory not found for sku ${input.skuId} warehouse ${input.warehouseId}.`,
			);
		}

		return mapInventory(row);
	}

	async saveLock(
		lock: LockInventoryPlan["lock"],
		transaction: TransactionContext,
	): Promise<void> {
		await getPgClient(transaction).query(
			`
        INSERT INTO inventory_locks (
          site_id,
          vertical_id,
          brand_id,
          order_id,
          order_item_id,
          sku_id,
          warehouse_id,
          quantity,
          status,
          expires_at,
          idempotency_key
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
			[
				lock.siteId,
				lock.verticalId,
				lock.brandId,
				lock.orderId,
				lock.orderItemId,
				lock.skuId,
				lock.warehouseId,
				lock.quantity,
				lock.status,
				lock.expiresAt,
				lock.idempotencyKey,
			],
		);
	}

	async getLocksForOrderForUpdate(
		input: {
			orderId: string;
			siteId: string;
			verticalId: string;
			brandId: string;
			allowLegacyNullScope?: boolean;
			transaction: TransactionContext;
		},
	): Promise<InventoryLockWithSnapshot[]> {
		const allowLegacyNullScope = input.allowLegacyNullScope ?? false;
		const result = await getPgClient(input.transaction).query<InventoryLockRow>(
			`
        SELECT
          COALESCE(inventory_locks.site_id, $2::uuid) AS lock_site_id,
          COALESCE(inventory_locks.vertical_id, $3::uuid) AS lock_vertical_id,
          COALESCE(inventory_locks.brand_id, $4::uuid) AS lock_brand_id,
          COALESCE(sku_inventory.site_id, $2::uuid) AS inventory_site_id,
          COALESCE(sku_inventory.vertical_id, $3::uuid) AS inventory_vertical_id,
          COALESCE(sku_inventory.brand_id, $4::uuid) AS inventory_brand_id,
          inventory_locks.order_id,
          inventory_locks.order_item_id,
          inventory_locks.sku_id,
          inventory_locks.warehouse_id,
          inventory_locks.quantity,
          inventory_locks.status,
          inventory_locks.idempotency_key,
          sku_inventory.available_qty,
          sku_inventory.locked_qty,
          sku_inventory.physical_qty,
          sku_inventory.inbound_qty,
          sku_inventory.safety_qty,
          sku_inventory.version
        FROM inventory_locks
        JOIN sku_inventory
          ON sku_inventory.sku_id = inventory_locks.sku_id
         AND sku_inventory.warehouse_id = inventory_locks.warehouse_id
         AND (sku_inventory.site_id = $2 OR ($5::boolean AND sku_inventory.site_id IS NULL))
         AND (sku_inventory.vertical_id = $3 OR ($5::boolean AND sku_inventory.vertical_id IS NULL))
         AND (sku_inventory.brand_id = $4 OR ($5::boolean AND sku_inventory.brand_id IS NULL))
        WHERE inventory_locks.order_id = $1
          AND (inventory_locks.site_id = $2 OR ($5::boolean AND inventory_locks.site_id IS NULL))
          AND (inventory_locks.vertical_id = $3 OR ($5::boolean AND inventory_locks.vertical_id IS NULL))
          AND (inventory_locks.brand_id = $4 OR ($5::boolean AND inventory_locks.brand_id IS NULL))
        FOR UPDATE OF inventory_locks, sku_inventory
      `,
			[
				input.orderId,
				input.siteId,
				input.verticalId,
				input.brandId,
				allowLegacyNullScope,
			],
		);

		return result.rows.map((row) => {
			const lock: ExistingInventoryLock = {
				siteId: row.lock_site_id,
				verticalId: row.lock_vertical_id,
				brandId: row.lock_brand_id,
				orderId: row.order_id,
				orderItemId: row.order_item_id,
				skuId: row.sku_id,
				warehouseId: row.warehouse_id,
				quantity: row.quantity,
				status: row.status,
				idempotencyKey: row.idempotency_key,
			};

			return {
				lock,
				inventory: mapInventory({
					site_id: row.inventory_site_id,
					vertical_id: row.inventory_vertical_id,
					brand_id: row.inventory_brand_id,
					sku_id: row.sku_id,
					warehouse_id: row.warehouse_id,
					available_qty: row.available_qty,
					locked_qty: row.locked_qty,
					physical_qty: row.physical_qty,
					inbound_qty: row.inbound_qty,
					safety_qty: row.safety_qty,
					version: row.version,
				}),
			};
		});
	}

	async updateInventory(
		snapshot: InventorySnapshot,
		transaction: TransactionContext,
	): Promise<void> {
		const allowLegacyNullScope = snapshot.siteId === defaultSiteContext.siteId;
		const result = await getPgClient(transaction).query(
			`
        UPDATE sku_inventory
        SET
          available_qty = $3,
          locked_qty = $4,
          physical_qty = $5,
          inbound_qty = $6,
          safety_qty = $7,
          version = $8,
          updated_at = now()
        WHERE sku_id = $1
          AND warehouse_id = $2
          AND (site_id = $9 OR ($12::boolean AND site_id IS NULL))
          AND (vertical_id = $10 OR ($12::boolean AND vertical_id IS NULL))
          AND (brand_id = $11 OR ($12::boolean AND brand_id IS NULL))
          AND version = $13
      `,
			[
				snapshot.skuId,
				snapshot.warehouseId,
				snapshot.availableQty,
				snapshot.lockedQty,
				snapshot.physicalQty,
				snapshot.inboundQty,
				snapshot.safetyQty,
				snapshot.version,
				snapshot.siteId,
				snapshot.verticalId,
				snapshot.brandId,
				allowLegacyNullScope,
				snapshot.version - 1,
			],
		);

		if (result.rowCount !== 1) {
			throw new Error(
				`Inventory update conflict for sku ${snapshot.skuId} warehouse ${snapshot.warehouseId}.`,
			);
		}
	}

	async appendTransaction(
		transactionRecord: InventoryMutation["transaction"],
		transaction: TransactionContext,
	): Promise<void> {
		await getPgClient(transaction).query(
			`
        INSERT INTO inventory_transactions (
          site_id,
          vertical_id,
          brand_id,
          sku_id,
          warehouse_id,
          order_id,
          type,
          quantity,
          before_available,
          after_available,
          before_locked,
          after_locked,
          before_physical,
          after_physical,
          idempotency_key
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `,
			[
				transactionRecord.siteId,
				transactionRecord.verticalId,
				transactionRecord.brandId,
				transactionRecord.skuId,
				transactionRecord.warehouseId,
				transactionRecord.orderId ?? null,
				transactionRecord.type,
				transactionRecord.quantity,
				transactionRecord.beforeAvailable,
				transactionRecord.afterAvailable,
				transactionRecord.beforeLocked,
				transactionRecord.afterLocked,
				transactionRecord.beforePhysical,
				transactionRecord.afterPhysical,
				transactionRecord.idempotencyKey,
			],
		);
	}

	async updateLockStatus(input: {
		lockIdempotencyKey: string;
		status: "released" | "deducted";
		transaction: TransactionContext;
	}): Promise<void> {
		const timestampColumn =
			input.status === "released" ? "released_at" : "deducted_at";

		await getPgClient(input.transaction).query(
			`
        UPDATE inventory_locks
        SET status = $2, ${timestampColumn} = now()
        WHERE idempotency_key = $1
      `,
			[input.lockIdempotencyKey, input.status],
		);
	}

	async listAdminInventoryBalances(
		query: AdminInventoryScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminInventoryBalanceListItem[]> {
		const params: unknown[] = [];
		const adminScope = buildAdminAccessPredicate(
			query.adminAccess.scopes,
			"sku_inventory",
			params,
		);
		const selectedScope = buildSelectedScopePredicate(
			query.selectedScope,
			"sku_inventory",
			params,
		);
		const limitPlaceholder = appendParam(params, query.limit);
		const result = await getPgClient(transaction).query<AdminInventoryBalanceListRow>(
			`
        SELECT
          sku_inventory.site_id,
          sku_inventory.vertical_id,
          sku_inventory.brand_id,
          sku_inventory.sku_id,
          product_skus.sku_code,
          product_skus.title AS sku_title,
          products.id AS product_id,
          products.title AS product_title,
          sku_inventory.warehouse_id,
          warehouses.code AS warehouse_code,
          warehouses.name AS warehouse_name,
          sku_inventory.available_qty,
          sku_inventory.locked_qty,
          sku_inventory.physical_qty,
          sku_inventory.inbound_qty,
          sku_inventory.safety_qty,
          sku_inventory.updated_at
        FROM sku_inventory
        INNER JOIN product_skus ON product_skus.id = sku_inventory.sku_id
        INNER JOIN products ON products.id = product_skus.product_id
        INNER JOIN warehouses ON warehouses.id = sku_inventory.warehouse_id
        WHERE ${adminScope}
          AND ${selectedScope}
        ORDER BY sku_inventory.updated_at DESC, product_skus.sku_code ASC
        LIMIT ${limitPlaceholder}
      `,
			params,
		);

		return result.rows.map(mapAdminInventoryBalance);
	}

	async listAdminInventoryLocks(
		query: AdminInventoryScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminInventoryLockListItem[]> {
		const params: unknown[] = [];
		const adminScope = buildAdminAccessPredicate(
			query.adminAccess.scopes,
			"inventory_locks",
			params,
		);
		const selectedScope = buildSelectedScopePredicate(
			query.selectedScope,
			"inventory_locks",
			params,
		);
		const limitPlaceholder = appendParam(params, query.limit);
		const result = await getPgClient(transaction).query<AdminInventoryLockListRow>(
			`
        SELECT
          inventory_locks.id AS inventory_lock_id,
          inventory_locks.order_id,
          orders.order_no,
          inventory_locks.order_item_id,
          inventory_locks.site_id,
          inventory_locks.vertical_id,
          inventory_locks.brand_id,
          inventory_locks.sku_id,
          product_skus.sku_code,
          inventory_locks.warehouse_id,
          warehouses.code AS warehouse_code,
          inventory_locks.quantity,
          inventory_locks.status,
          inventory_locks.idempotency_key,
          inventory_locks.expires_at,
          inventory_locks.released_at,
          inventory_locks.deducted_at,
          inventory_locks.created_at
        FROM inventory_locks
        LEFT JOIN orders ON orders.id = inventory_locks.order_id
        LEFT JOIN product_skus ON product_skus.id = inventory_locks.sku_id
        LEFT JOIN warehouses ON warehouses.id = inventory_locks.warehouse_id
        WHERE ${adminScope}
          AND ${selectedScope}
        ORDER BY inventory_locks.created_at DESC, inventory_locks.id DESC
        LIMIT ${limitPlaceholder}
      `,
			params,
		);

		return result.rows.map(mapAdminInventoryLock);
	}

	async listAdminInventoryTransactions(
		query: AdminInventoryScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminInventoryTransactionListItem[]> {
		const params: unknown[] = [];
		const adminScope = buildAdminAccessPredicate(
			query.adminAccess.scopes,
			"inventory_transactions",
			params,
		);
		const selectedScope = buildSelectedScopePredicate(
			query.selectedScope,
			"inventory_transactions",
			params,
		);
		const limitPlaceholder = appendParam(params, query.limit);
		const result = await getPgClient(transaction).query<AdminInventoryTransactionListRow>(
			`
        SELECT
          inventory_transactions.id AS inventory_transaction_id,
          inventory_transactions.site_id,
          inventory_transactions.vertical_id,
          inventory_transactions.brand_id,
          inventory_transactions.sku_id,
          product_skus.sku_code,
          inventory_transactions.warehouse_id,
          warehouses.code AS warehouse_code,
          inventory_transactions.order_id,
          orders.order_no,
          inventory_transactions.type AS transaction_type,
          inventory_transactions.quantity,
          inventory_transactions.before_available,
          inventory_transactions.after_available,
          inventory_transactions.before_locked,
          inventory_transactions.after_locked,
          inventory_transactions.before_physical,
          inventory_transactions.after_physical,
          inventory_transactions.idempotency_key,
          inventory_transactions.created_at
        FROM inventory_transactions
        LEFT JOIN product_skus ON product_skus.id = inventory_transactions.sku_id
        LEFT JOIN warehouses ON warehouses.id = inventory_transactions.warehouse_id
        LEFT JOIN orders ON orders.id = inventory_transactions.order_id
        WHERE ${adminScope}
          AND ${selectedScope}
        ORDER BY inventory_transactions.created_at DESC, inventory_transactions.id DESC
        LIMIT ${limitPlaceholder}
      `,
			params,
		);

		return result.rows.map(mapAdminInventoryTransaction);
	}
}
