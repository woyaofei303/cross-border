import { Injectable } from "@nestjs/common";
import type {
	AdminAccessContext,
	AdminScope,
} from "../../../common/admin/admin-access.js";
import { hasGlobalAdminScope } from "../../../common/admin/admin-access.js";
import { PgPoolService } from "../../database/pg/pg-pool.service.js";
import type {
	OperationsDashboardQuery,
	OperationsAfterSalesRequestRow,
	OperationsAuditLogRow,
	OperationsInventoryLockRow,
	OperationsInventoryTransactionRow,
	OperationsOrderRiskRow,
	OperationsPaymentRefundRow,
	OperationsPaymentWebhookRow,
	OperationsRiskDashboard,
} from "../operations.types.js";

type SqlPredicate = {
	sql: string;
	params: unknown[];
};

type OrderRiskDbRow = {
	id: string;
	order_no: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	order_status: OperationsOrderRiskRow["orderStatus"];
	payment_status: OperationsOrderRiskRow["paymentStatus"];
	fulfillment_status: OperationsOrderRiskRow["fulfillmentStatus"];
	aftersales_status: OperationsOrderRiskRow["aftersalesStatus"];
	currency: string;
	total_amount: string;
	payment_no: string | null;
	payment_order_status: OperationsOrderRiskRow["paymentOrderStatus"] | null;
	payment_channel_code: string | null;
	item_count: number | string;
	status_log_count: number | string;
	created_at: Date | string;
	updated_at: Date | string;
	paid_at: Date | string | null;
	cancelled_at: Date | string | null;
};

type PaymentWebhookDbRow = {
	id: string;
	payment_order_id: string | null;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	channel_code: string;
	provider_event_id: string;
	event_type: string;
	provider_object_id: string | null;
	status: OperationsPaymentWebhookRow["status"];
	error_message: string | null;
	received_at: Date | string;
	processed_at: Date | string | null;
};

type InventoryLockDbRow = {
	id: string;
	order_id: string;
	order_item_id: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	sku_id: string;
	warehouse_id: string;
	quantity: number;
	status: OperationsInventoryLockRow["status"];
	expires_at: Date | string;
	released_at: Date | string | null;
	deducted_at: Date | string | null;
	created_at: Date | string;
};

type InventoryTransactionDbRow = {
	id: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	sku_id: string;
	warehouse_id: string;
	order_id: string | null;
	type: OperationsInventoryTransactionRow["type"];
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

type AfterSalesRequestDbRow = {
	id: string;
	request_no: string;
	order_id: string;
	order_no: string | null;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	type: OperationsAfterSalesRequestRow["type"];
	status: OperationsAfterSalesRequestRow["status"];
	reason: string;
	requested_amount: string | null;
	approved_amount: string | null;
	created_at: Date | string;
	updated_at: Date | string;
};

type PaymentRefundDbRow = {
	id: string;
	refund_no: string;
	after_sales_request_id: string | null;
	request_no: string | null;
	payment_order_id: string;
	order_id: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	status: OperationsPaymentRefundRow["status"];
	amount: string;
	currency: string;
	provider_refund_id: string | null;
	created_at: Date | string;
	updated_at: Date | string;
	succeeded_at: Date | string | null;
	failed_at: Date | string | null;
};

type AuditLogDbRow = {
	id: string;
	source: OperationsAuditLogRow["source"];
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	actor_type: OperationsAuditLogRow["actorType"];
	actor_id: string | null;
	action: string;
	resource_type: string;
	resource_id: string | null;
	ip_address: string | null;
	request_id: string | null;
	created_at: Date | string;
};

function appendParam(params: unknown[], value: unknown): string {
	params.push(value);

	return `$${params.length}`;
}

function normalizeLimit(limit: number | undefined): number {
	if (!limit || !Number.isInteger(limit)) {
		return 50;
	}

	return Math.min(Math.max(limit, 1), 100);
}

function toIsoString(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value;
}

function toNumber(value: number | string): number {
	return typeof value === "number" ? value : Number(value);
}

function buildAdminScopePredicate(
	scopes: readonly AdminScope[],
	alias: string,
	params: unknown[],
): SqlPredicate {
	if (hasGlobalAdminScope(scopes)) {
		return {
			sql: "TRUE",
			params,
		};
	}

	const clauses = scopes.flatMap((scope) => {
		if (!scope.scopeId) {
			return [];
		}

		const placeholder = appendParam(params, scope.scopeId);

		if (scope.scopeType === "site") {
			return [`${alias}.site_id = ${placeholder}`];
		}

		if (scope.scopeType === "vertical") {
			return [`${alias}.vertical_id = ${placeholder}`];
		}

		if (scope.scopeType === "brand") {
			return [`${alias}.brand_id = ${placeholder}`];
		}

		return [];
	});

	return {
		sql: clauses.length > 0 ? `(${clauses.join(" OR ")})` : "FALSE",
		params,
	};
}

function siteDimensionFields(row: {
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
}) {
	return {
		...(row.site_id ? { siteId: row.site_id } : {}),
		...(row.vertical_id ? { verticalId: row.vertical_id } : {}),
		...(row.brand_id ? { brandId: row.brand_id } : {}),
	};
}

function mapOrderRisk(row: OrderRiskDbRow): OperationsOrderRiskRow {
	return {
		id: row.id,
		orderNo: row.order_no,
		...siteDimensionFields(row),
		orderStatus: row.order_status,
		paymentStatus: row.payment_status,
		fulfillmentStatus: row.fulfillment_status,
		aftersalesStatus: row.aftersales_status,
		currency: row.currency,
		totalAmount: row.total_amount,
		...(row.payment_no ? { paymentNo: row.payment_no } : {}),
		...(row.payment_order_status
			? { paymentOrderStatus: row.payment_order_status }
			: {}),
		...(row.payment_channel_code
			? { paymentChannelCode: row.payment_channel_code }
			: {}),
		itemCount: toNumber(row.item_count),
		statusLogCount: toNumber(row.status_log_count),
		createdAt: toIsoString(row.created_at),
		updatedAt: toIsoString(row.updated_at),
		...(row.paid_at ? { paidAt: toIsoString(row.paid_at) } : {}),
		...(row.cancelled_at
			? { cancelledAt: toIsoString(row.cancelled_at) }
			: {}),
	};
}

function mapPaymentWebhook(
	row: PaymentWebhookDbRow,
): OperationsPaymentWebhookRow {
	return {
		id: row.id,
		...(row.payment_order_id ? { paymentOrderId: row.payment_order_id } : {}),
		...siteDimensionFields(row),
		channelCode: row.channel_code,
		providerEventId: row.provider_event_id,
		eventType: row.event_type,
		...(row.provider_object_id
			? { providerObjectId: row.provider_object_id }
			: {}),
		status: row.status,
		...(row.error_message ? { errorMessage: row.error_message } : {}),
		receivedAt: toIsoString(row.received_at),
		...(row.processed_at ? { processedAt: toIsoString(row.processed_at) } : {}),
	};
}

function mapInventoryLock(row: InventoryLockDbRow): OperationsInventoryLockRow {
	return {
		id: row.id,
		orderId: row.order_id,
		orderItemId: row.order_item_id,
		...siteDimensionFields(row),
		skuId: row.sku_id,
		warehouseId: row.warehouse_id,
		quantity: row.quantity,
		status: row.status,
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

function mapInventoryTransaction(
	row: InventoryTransactionDbRow,
): OperationsInventoryTransactionRow {
	return {
		id: row.id,
		...siteDimensionFields(row),
		skuId: row.sku_id,
		warehouseId: row.warehouse_id,
		...(row.order_id ? { orderId: row.order_id } : {}),
		type: row.type,
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

function mapAfterSalesRequest(
	row: AfterSalesRequestDbRow,
): OperationsAfterSalesRequestRow {
	return {
		id: row.id,
		requestNo: row.request_no,
		orderId: row.order_id,
		...(row.order_no ? { orderNo: row.order_no } : {}),
		...siteDimensionFields(row),
		type: row.type,
		status: row.status,
		reason: row.reason,
		...(row.requested_amount ? { requestedAmount: row.requested_amount } : {}),
		...(row.approved_amount ? { approvedAmount: row.approved_amount } : {}),
		createdAt: toIsoString(row.created_at),
		updatedAt: toIsoString(row.updated_at),
	};
}

function mapPaymentRefund(row: PaymentRefundDbRow): OperationsPaymentRefundRow {
	return {
		id: row.id,
		refundNo: row.refund_no,
		...(row.after_sales_request_id
			? { requestId: row.after_sales_request_id }
			: {}),
		...(row.request_no ? { requestNo: row.request_no } : {}),
		paymentOrderId: row.payment_order_id,
		orderId: row.order_id,
		...siteDimensionFields(row),
		status: row.status,
		amount: row.amount,
		currency: row.currency,
		...(row.provider_refund_id
			? { providerRefundId: row.provider_refund_id }
			: {}),
		createdAt: toIsoString(row.created_at),
		updatedAt: toIsoString(row.updated_at),
		...(row.succeeded_at
			? { succeededAt: toIsoString(row.succeeded_at) }
			: {}),
		...(row.failed_at ? { failedAt: toIsoString(row.failed_at) } : {}),
	};
}

function mapAuditLog(row: AuditLogDbRow): OperationsAuditLogRow {
	return {
		id: row.id,
		source: row.source,
		...siteDimensionFields(row),
		actorType: row.actor_type,
		...(row.actor_id ? { actorId: row.actor_id } : {}),
		action: row.action,
		resourceType: row.resource_type,
		...(row.resource_id ? { resourceId: row.resource_id } : {}),
		...(row.ip_address ? { ipAddress: row.ip_address } : {}),
		...(row.request_id ? { requestId: row.request_id } : {}),
		createdAt: toIsoString(row.created_at),
	};
}

@Injectable()
export class PgOperationsRepository {
	constructor(private readonly pool: PgPoolService) {}

	async listRiskDashboard(
		query: OperationsDashboardQuery,
		access: AdminAccessContext,
	): Promise<OperationsRiskDashboard> {
		const limit = normalizeLimit(query.limit);
		const [
			orders,
			paymentWebhooks,
			inventoryLocks,
			inventoryTransactions,
			afterSalesRequests,
			paymentRefunds,
			auditLogs,
		] =
			await Promise.all([
				this.listOrderRisks(limit, access),
				this.listPaymentWebhooks(limit, access),
				this.listInventoryLocks(limit, access),
				this.listInventoryTransactions(limit, access),
				this.listAfterSalesRequests(limit, access),
				this.listPaymentRefunds(limit, access),
				this.listAuditLogs(limit, access),
			]);

		return {
			orders,
			paymentWebhooks,
			inventoryLocks,
			inventoryTransactions,
			afterSalesRequests,
			paymentRefunds,
			auditLogs,
		};
	}

	private async listOrderRisks(
		limit: number,
		access: AdminAccessContext,
	): Promise<OperationsOrderRiskRow[]> {
		const params: unknown[] = [];
		const scope = buildAdminScopePredicate(access.scopes, "orders", params);
		const limitPlaceholder = appendParam(params, limit);
		const result = await this.pool.getPool().query<OrderRiskDbRow>(
			`
        SELECT
          orders.id,
          orders.order_no,
          orders.site_id,
          orders.vertical_id,
          orders.brand_id,
          orders.order_status,
          orders.payment_status,
          orders.fulfillment_status,
          orders.aftersales_status,
          orders.currency,
          orders.total_amount,
          latest_payment.payment_no,
          latest_payment.status AS payment_order_status,
          latest_payment.channel_code AS payment_channel_code,
          COUNT(DISTINCT order_items.id)::int AS item_count,
          COUNT(DISTINCT order_status_logs.id)::int AS status_log_count,
          orders.created_at,
          orders.updated_at,
          orders.paid_at,
          orders.cancelled_at
        FROM orders
        LEFT JOIN LATERAL (
          SELECT
            payment_orders.payment_no,
            payment_orders.status,
            payment_orders.channel_code
          FROM payment_orders
          WHERE payment_orders.order_id = orders.id
          ORDER BY payment_orders.created_at DESC
          LIMIT 1
        ) latest_payment ON TRUE
        LEFT JOIN order_items
          ON order_items.order_id = orders.id
        LEFT JOIN order_status_logs
          ON order_status_logs.order_id = orders.id
        WHERE ${scope.sql}
        GROUP BY
          orders.id,
          latest_payment.payment_no,
          latest_payment.status,
          latest_payment.channel_code
        ORDER BY orders.created_at DESC
        LIMIT ${limitPlaceholder}
      `,
			params,
		);

		return result.rows.map(mapOrderRisk);
	}

	private async listPaymentWebhooks(
		limit: number,
		access: AdminAccessContext,
	): Promise<OperationsPaymentWebhookRow[]> {
		const params: unknown[] = [];
		const scope = buildAdminScopePredicate(
			access.scopes,
			"payment_webhook_events",
			params,
		);
		const limitPlaceholder = appendParam(params, limit);
		const result = await this.pool
			.getPool()
			.query<PaymentWebhookDbRow>(
				`
          SELECT
            id,
            payment_order_id,
            site_id,
            vertical_id,
            brand_id,
            channel_code,
            provider_event_id,
            event_type,
            provider_object_id,
            status,
            error_message,
            received_at,
            processed_at
          FROM payment_webhook_events
          WHERE ${scope.sql}
          ORDER BY received_at DESC
          LIMIT ${limitPlaceholder}
        `,
				params,
			);

		return result.rows.map(mapPaymentWebhook);
	}

	private async listInventoryLocks(
		limit: number,
		access: AdminAccessContext,
	): Promise<OperationsInventoryLockRow[]> {
		const params: unknown[] = [];
		const scope = buildAdminScopePredicate(access.scopes, "inventory_locks", params);
		const limitPlaceholder = appendParam(params, limit);
		const result = await this.pool.getPool().query<InventoryLockDbRow>(
			`
        SELECT
          id,
          order_id,
          order_item_id,
          site_id,
          vertical_id,
          brand_id,
          sku_id,
          warehouse_id,
          quantity,
          status,
          expires_at,
          released_at,
          deducted_at,
          created_at
        FROM inventory_locks
        WHERE ${scope.sql}
        ORDER BY created_at DESC
        LIMIT ${limitPlaceholder}
      `,
			params,
		);

		return result.rows.map(mapInventoryLock);
	}

	private async listInventoryTransactions(
		limit: number,
		access: AdminAccessContext,
	): Promise<OperationsInventoryTransactionRow[]> {
		const params: unknown[] = [];
		const scope = buildAdminScopePredicate(
			access.scopes,
			"inventory_transactions",
			params,
		);
		const limitPlaceholder = appendParam(params, limit);
		const result = await this.pool
			.getPool()
			.query<InventoryTransactionDbRow>(
				`
          SELECT
            id,
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
            idempotency_key,
            created_at
          FROM inventory_transactions
          WHERE ${scope.sql}
          ORDER BY created_at DESC
          LIMIT ${limitPlaceholder}
        `,
				params,
			);

		return result.rows.map(mapInventoryTransaction);
	}

	private async listAfterSalesRequests(
		limit: number,
		access: AdminAccessContext,
	): Promise<OperationsAfterSalesRequestRow[]> {
		const params: unknown[] = [];
		const scope = buildAdminScopePredicate(
			access.scopes,
			"after_sales_requests",
			params,
		);
		const limitPlaceholder = appendParam(params, limit);
		const result = await this.pool.getPool().query<AfterSalesRequestDbRow>(
			`
        SELECT
          after_sales_requests.id,
          after_sales_requests.request_no,
          after_sales_requests.order_id,
          orders.order_no,
          after_sales_requests.site_id,
          after_sales_requests.vertical_id,
          after_sales_requests.brand_id,
          after_sales_requests.type,
          after_sales_requests.status,
          after_sales_requests.reason,
          after_sales_requests.requested_amount::text,
          after_sales_requests.approved_amount::text,
          after_sales_requests.created_at,
          after_sales_requests.updated_at
        FROM after_sales_requests
        LEFT JOIN orders ON orders.id = after_sales_requests.order_id
        WHERE ${scope.sql}
        ORDER BY after_sales_requests.created_at DESC
        LIMIT ${limitPlaceholder}
      `,
			params,
		);

		return result.rows.map(mapAfterSalesRequest);
	}

	private async listPaymentRefunds(
		limit: number,
		access: AdminAccessContext,
	): Promise<OperationsPaymentRefundRow[]> {
		const params: unknown[] = [];
		const scope = buildAdminScopePredicate(access.scopes, "payment_refunds", params);
		const limitPlaceholder = appendParam(params, limit);
		const result = await this.pool.getPool().query<PaymentRefundDbRow>(
			`
        SELECT
          payment_refunds.id,
          payment_refunds.refund_no,
          payment_refunds.after_sales_request_id,
          after_sales_requests.request_no,
          payment_refunds.payment_order_id,
          payment_refunds.order_id,
          payment_refunds.site_id,
          payment_refunds.vertical_id,
          payment_refunds.brand_id,
          payment_refunds.status,
          payment_refunds.amount::text,
          payment_refunds.currency,
          payment_refunds.provider_refund_id,
          payment_refunds.created_at,
          payment_refunds.updated_at,
          payment_refunds.succeeded_at,
          payment_refunds.failed_at
        FROM payment_refunds
        LEFT JOIN after_sales_requests
          ON after_sales_requests.id = payment_refunds.after_sales_request_id
        WHERE ${scope.sql}
        ORDER BY payment_refunds.created_at DESC
        LIMIT ${limitPlaceholder}
      `,
			params,
		);

		return result.rows.map(mapPaymentRefund);
	}

	private async listAuditLogs(
		limit: number,
		access: AdminAccessContext,
	): Promise<OperationsAuditLogRow[]> {
		const params: unknown[] = [];
		const auditScope = buildAdminScopePredicate(
			access.scopes,
			"audit_logs",
			params,
		);
		const adminScope = buildAdminScopePredicate(
			access.scopes,
			"admin_operation_logs",
			params,
		);
		const limitPlaceholder = appendParam(params, limit);
		const result = await this.pool.getPool().query<AuditLogDbRow>(
			`
        WITH scoped_audit_logs AS (
          SELECT
            id,
            'audit'::text AS source,
            site_id,
            vertical_id,
            brand_id,
            actor_type,
            actor_id,
            action,
            resource_type,
            resource_id,
            ip_address,
            request_id,
            created_at
          FROM audit_logs
          WHERE ${auditScope.sql}
        ),
        scoped_admin_operation_logs AS (
          SELECT
            id,
            'admin_operation'::text AS source,
            site_id,
            vertical_id,
            brand_id,
            'admin'::text AS actor_type,
            admin_user_id AS actor_id,
            action,
            resource_type,
            resource_id,
            ip_address,
            request_id,
            created_at
          FROM admin_operation_logs
          WHERE ${adminScope.sql}
        )
        SELECT *
        FROM (
          SELECT * FROM scoped_audit_logs
          UNION ALL
          SELECT * FROM scoped_admin_operation_logs
        ) logs
        ORDER BY created_at DESC
        LIMIT ${limitPlaceholder}
      `,
			params,
		);

		return result.rows.map(mapAuditLog);
	}
}
