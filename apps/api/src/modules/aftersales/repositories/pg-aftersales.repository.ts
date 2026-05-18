import { Injectable } from "@nestjs/common";
import type {
	AfterSalesRequestStatus,
	AfterSalesRequestType,
	PaymentRefundStatus,
	PaymentStatus,
} from "@cross-border/shared";
import type { AdminScope } from "../../../common/admin/admin-access.js";
import { hasGlobalAdminScope } from "../../../common/admin/admin-access.js";
import type { TransactionContext } from "../../../common/application/application-ports.js";
import {
	defaultSiteContext,
	type SiteDimensions,
} from "../../../common/site/site-context.js";
import { getPgClient } from "../../database/pg/pg-transaction-manager.js";
import type {
	AdminAfterSalesScopeQuery,
	AfterSalesAdminReadRepositoryPort,
	AfterSalesWriteRepositoryPort,
} from "../aftersales.ports.js";
import type {
	AdminAfterSalesItem,
	AdminAfterSalesLog,
	AdminAfterSalesRefund,
	AdminAfterSalesRequestDetail,
	AdminAfterSalesRequestListItem,
	AfterSalesOrderSnapshot,
	AfterSalesRequestSummary,
	ApprovalSnapshot,
	ApproveRefundPlan,
	CreateAfterSalesRequestPlan,
	MarkRefundSucceededPlan,
	PaymentRefundSummary,
	RejectAfterSalesRequestPlan,
	RefundSucceededSnapshot,
} from "../aftersales.types.js";

type RequestSummaryRow = {
	id: string;
	request_no: string;
	order_id: string;
	status: AfterSalesRequestStatus;
	requested_amount: string | null;
	approved_amount: string | null;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
};

type OrderSnapshotRow = {
	order_id: string;
	user_id: string | null;
	guest_token: string | null;
	payment_status: PaymentStatus;
	aftersales_status: AfterSalesRequestStatus | "none";
	currency: string;
	total_amount: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
};

type ApprovalSnapshotRow = RequestSummaryRow & {
	type: AfterSalesRequestType;
	reason: string;
	payment_order_id: string;
	payment_status: PaymentStatus;
	order_aftersales_status: AfterSalesRequestStatus | "none";
	currency: string;
	order_total_amount: string;
	already_refunded_amount: string;
};

type RefundRow = {
	id: string;
	refund_no: string;
	after_sales_request_id: string | null;
	payment_order_id: string;
	order_id: string;
	status: PaymentRefundStatus;
	amount: string;
	currency: string;
	idempotency_key: string;
	provider_refund_id: string | null;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
};

type RefundSucceededSnapshotRow = RefundRow & {
	request_status: AfterSalesRequestStatus | null;
	payment_status: PaymentStatus;
	order_aftersales_status: AfterSalesRequestStatus | "none";
	order_total_amount: string;
	already_refunded_amount: string;
};

type AdminAfterSalesRequestRow = {
	after_sales_request_id: string;
	request_no: string;
	order_id: string;
	order_no: string;
	request_type: AfterSalesRequestType;
	request_status: AfterSalesRequestStatus;
	reason: string;
	requested_amount: string | null;
	approved_amount: string | null;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	currency: string;
	order_status: string;
	payment_status: PaymentStatus;
	fulfillment_status: string;
	order_aftersales_status: AfterSalesRequestStatus | "none";
	total_amount: string;
	user_id: string | null;
	guest_token: string | null;
	item_count: string | number;
	refund_count: string | number;
	latest_refund_id: string | null;
	latest_refund_status: PaymentRefundStatus | null;
	created_at: Date | string;
	updated_at: Date | string;
};

type AdminAfterSalesItemRow = {
	after_sales_item_id: string;
	after_sales_request_id: string;
	order_item_id: string;
	product_title: string | null;
	sku_code: string | null;
	sku_title: string | null;
	quantity: number;
	requested_amount: string | null;
	approved_amount: string | null;
	return_quality_status: string | null;
	created_at: Date | string;
};

type AdminAfterSalesLogRow = {
	after_sales_log_id: string;
	after_sales_request_id: string;
	action: string;
	from_status: string | null;
	to_status: string | null;
	operator_type: string;
	operator_id: string | null;
	note: string | null;
	created_at: Date | string;
};

type AdminAfterSalesRefundRow = RefundRow & {
	created_at: Date | string;
	updated_at: Date | string;
	succeeded_at: Date | string | null;
	failed_at: Date | string | null;
};

function appendParam(params: unknown[], value: unknown): string {
	params.push(value);

	return `$${params.length}`;
}

function toIsoString(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value;
}

function mapDimensions(row: {
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
}): SiteDimensions {
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

function mapRequest(row: RequestSummaryRow): AfterSalesRequestSummary {
	return {
		requestId: row.id,
		requestNo: row.request_no,
		orderId: row.order_id,
		status: row.status,
		requestedAmount: row.requested_amount,
		approvedAmount: row.approved_amount,
		...mapDimensions(row),
	};
}

function mapRefund(row: RefundRow): PaymentRefundSummary {
	return {
		refundId: row.id,
		refundNo: row.refund_no,
		...(row.after_sales_request_id
			? { requestId: row.after_sales_request_id }
			: {}),
		paymentOrderId: row.payment_order_id,
		orderId: row.order_id,
		status: row.status,
		amount: row.amount,
		currency: row.currency,
		idempotencyKey: row.idempotency_key,
		...(row.provider_refund_id
			? { providerRefundId: row.provider_refund_id }
			: {}),
		...mapDimensions(row),
	};
}

function mapAdminAfterSalesRequest(
	row: AdminAfterSalesRequestRow,
): AdminAfterSalesRequestListItem {
	return {
		afterSalesRequestId: row.after_sales_request_id,
		requestNo: row.request_no,
		orderId: row.order_id,
		orderNo: row.order_no,
		type: row.request_type,
		status: row.request_status,
		reason: row.reason,
		...(row.requested_amount ? { requestedAmount: row.requested_amount } : {}),
		...(row.approved_amount ? { approvedAmount: row.approved_amount } : {}),
		currency: row.currency,
		orderStatus: row.order_status,
		paymentStatus: row.payment_status,
		fulfillmentStatus: row.fulfillment_status,
		orderAftersalesStatus: row.order_aftersales_status,
		totalAmount: row.total_amount,
		...(row.user_id ? { userId: row.user_id } : {}),
		...(row.guest_token ? { guestToken: row.guest_token } : {}),
		itemCount: Number(row.item_count),
		refundCount: Number(row.refund_count),
		...(row.latest_refund_id ? { latestRefundId: row.latest_refund_id } : {}),
		...(row.latest_refund_status
			? { latestRefundStatus: row.latest_refund_status }
			: {}),
		createdAt: toIsoString(row.created_at),
		updatedAt: toIsoString(row.updated_at),
		...mapDimensions(row),
	};
}

function mapAdminAfterSalesItem(
	row: AdminAfterSalesItemRow,
): AdminAfterSalesItem {
	return {
		afterSalesItemId: row.after_sales_item_id,
		afterSalesRequestId: row.after_sales_request_id,
		orderItemId: row.order_item_id,
		...(row.product_title ? { productTitle: row.product_title } : {}),
		...(row.sku_code ? { skuCode: row.sku_code } : {}),
		...(row.sku_title ? { skuTitle: row.sku_title } : {}),
		quantity: row.quantity,
		...(row.requested_amount ? { requestedAmount: row.requested_amount } : {}),
		...(row.approved_amount ? { approvedAmount: row.approved_amount } : {}),
		...(row.return_quality_status
			? { returnQualityStatus: row.return_quality_status }
			: {}),
		createdAt: toIsoString(row.created_at),
	};
}

function mapAdminAfterSalesLog(row: AdminAfterSalesLogRow): AdminAfterSalesLog {
	return {
		afterSalesLogId: row.after_sales_log_id,
		afterSalesRequestId: row.after_sales_request_id,
		action: row.action,
		...(row.from_status ? { fromStatus: row.from_status } : {}),
		...(row.to_status ? { toStatus: row.to_status } : {}),
		operatorType: row.operator_type,
		...(row.operator_id ? { operatorId: row.operator_id } : {}),
		...(row.note ? { note: row.note } : {}),
		createdAt: toIsoString(row.created_at),
	};
}

function mapAdminAfterSalesRefund(
	row: AdminAfterSalesRefundRow,
): AdminAfterSalesRefund {
	return {
		...mapRefund(row),
		createdAt: toIsoString(row.created_at),
		updatedAt: toIsoString(row.updated_at),
		...(row.succeeded_at ? { succeededAt: toIsoString(row.succeeded_at) } : {}),
		...(row.failed_at ? { failedAt: toIsoString(row.failed_at) } : {}),
	};
}

@Injectable()
export class PgAfterSalesRepository
	implements AfterSalesWriteRepositoryPort, AfterSalesAdminReadRepositoryPort
{
	async listAdminAfterSalesRequests(
		query: AdminAfterSalesScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminAfterSalesRequestListItem[]> {
		const params: unknown[] = [];
		const adminScope = buildAdminAccessPredicate(
			query.adminAccess.scopes,
			"after_sales_requests",
			params,
		);
		const selectedScope = buildSelectedScopePredicate(
			query.selectedScope,
			"after_sales_requests",
			params,
		);
		const limitPlaceholder = appendParam(params, query.limit);
		const result = await getPgClient(transaction).query<AdminAfterSalesRequestRow>(
			`
        SELECT
          after_sales_requests.id AS after_sales_request_id,
          after_sales_requests.request_no,
          after_sales_requests.order_id,
          orders.order_no,
          after_sales_requests.type AS request_type,
          after_sales_requests.status AS request_status,
          after_sales_requests.reason,
          after_sales_requests.requested_amount::text,
          after_sales_requests.approved_amount::text,
          after_sales_requests.site_id,
          after_sales_requests.vertical_id,
          after_sales_requests.brand_id,
          orders.currency,
          orders.order_status,
          orders.payment_status,
          orders.fulfillment_status,
          orders.aftersales_status AS order_aftersales_status,
          orders.total_amount::text,
          orders.user_id,
          orders.guest_token,
          COALESCE(items.item_count, 0) AS item_count,
          COALESCE(refunds.refund_count, 0) AS refund_count,
          latest_refund.id AS latest_refund_id,
          latest_refund.status AS latest_refund_status,
          after_sales_requests.created_at,
          after_sales_requests.updated_at
        FROM after_sales_requests
        INNER JOIN orders ON orders.id = after_sales_requests.order_id
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS item_count
          FROM after_sales_items
          WHERE after_sales_items.after_sales_request_id = after_sales_requests.id
        ) items ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS refund_count
          FROM payment_refunds
          WHERE payment_refunds.after_sales_request_id = after_sales_requests.id
        ) refunds ON TRUE
        LEFT JOIN LATERAL (
          SELECT id, status
          FROM payment_refunds
          WHERE payment_refunds.after_sales_request_id = after_sales_requests.id
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        ) latest_refund ON TRUE
        WHERE ${adminScope}
          AND ${selectedScope}
        ORDER BY after_sales_requests.created_at DESC, after_sales_requests.id DESC
        LIMIT ${limitPlaceholder}
      `,
			params,
		);

		return result.rows.map(mapAdminAfterSalesRequest);
	}

	async getAdminAfterSalesRequestDetail(
		input: {
			requestId: string;
			adminAccess: AdminAfterSalesScopeQuery["adminAccess"];
		},
		transaction: TransactionContext,
	): Promise<AdminAfterSalesRequestDetail | null> {
		const params: unknown[] = [input.requestId];
		const adminScope = buildAdminAccessPredicate(
			input.adminAccess.scopes,
			"after_sales_requests",
			params,
		);
		const requestResult =
			await getPgClient(transaction).query<AdminAfterSalesRequestRow>(
				`
        SELECT
          after_sales_requests.id AS after_sales_request_id,
          after_sales_requests.request_no,
          after_sales_requests.order_id,
          orders.order_no,
          after_sales_requests.type AS request_type,
          after_sales_requests.status AS request_status,
          after_sales_requests.reason,
          after_sales_requests.requested_amount::text,
          after_sales_requests.approved_amount::text,
          after_sales_requests.site_id,
          after_sales_requests.vertical_id,
          after_sales_requests.brand_id,
          orders.currency,
          orders.order_status,
          orders.payment_status,
          orders.fulfillment_status,
          orders.aftersales_status AS order_aftersales_status,
          orders.total_amount::text,
          orders.user_id,
          orders.guest_token,
          COALESCE(items.item_count, 0) AS item_count,
          COALESCE(refunds.refund_count, 0) AS refund_count,
          latest_refund.id AS latest_refund_id,
          latest_refund.status AS latest_refund_status,
          after_sales_requests.created_at,
          after_sales_requests.updated_at
        FROM after_sales_requests
        INNER JOIN orders ON orders.id = after_sales_requests.order_id
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS item_count
          FROM after_sales_items
          WHERE after_sales_items.after_sales_request_id = after_sales_requests.id
        ) items ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS refund_count
          FROM payment_refunds
          WHERE payment_refunds.after_sales_request_id = after_sales_requests.id
        ) refunds ON TRUE
        LEFT JOIN LATERAL (
          SELECT id, status
          FROM payment_refunds
          WHERE payment_refunds.after_sales_request_id = after_sales_requests.id
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        ) latest_refund ON TRUE
        WHERE after_sales_requests.id = $1
          AND ${adminScope}
        LIMIT 1
      `,
				params,
			);
		const row = requestResult.rows[0];

		if (!row) {
			return null;
		}

		const [itemsResult, logsResult, refundsResult] = await Promise.all([
			getPgClient(transaction).query<AdminAfterSalesItemRow>(
				`
          SELECT
            after_sales_items.id AS after_sales_item_id,
            after_sales_items.after_sales_request_id,
            after_sales_items.order_item_id,
            order_items.product_title,
            order_items.sku_code,
            order_items.sku_title,
            after_sales_items.quantity,
            after_sales_items.requested_amount::text,
            after_sales_items.approved_amount::text,
            after_sales_items.return_quality_status,
            after_sales_items.created_at
          FROM after_sales_items
          INNER JOIN order_items ON order_items.id = after_sales_items.order_item_id
          WHERE after_sales_items.after_sales_request_id = $1
          ORDER BY after_sales_items.created_at ASC, after_sales_items.id ASC
        `,
				[input.requestId],
			),
			getPgClient(transaction).query<AdminAfterSalesLogRow>(
				`
          SELECT
            id AS after_sales_log_id,
            after_sales_request_id,
            action,
            from_status,
            to_status,
            operator_type,
            operator_id,
            note,
            created_at
          FROM after_sales_logs
          WHERE after_sales_request_id = $1
          ORDER BY created_at DESC, id DESC
        `,
				[input.requestId],
			),
			getPgClient(transaction).query<AdminAfterSalesRefundRow>(
				`
          SELECT
            id,
            refund_no,
            after_sales_request_id,
            payment_order_id,
            order_id,
            status,
            amount::text,
            currency,
            idempotency_key,
            provider_refund_id,
            site_id,
            vertical_id,
            brand_id,
            created_at,
            updated_at,
            succeeded_at,
            failed_at
          FROM payment_refunds
          WHERE after_sales_request_id = $1
          ORDER BY created_at DESC, id DESC
        `,
				[input.requestId],
			),
		]);
		const request = mapAdminAfterSalesRequest(row);

		return {
			...request,
			order: {
				orderId: row.order_id,
				orderNo: row.order_no,
				orderStatus: row.order_status,
				paymentStatus: row.payment_status,
				fulfillmentStatus: row.fulfillment_status,
				aftersalesStatus: row.order_aftersales_status,
				currency: row.currency,
				totalAmount: row.total_amount,
				...(row.user_id ? { userId: row.user_id } : {}),
				...(row.guest_token ? { guestToken: row.guest_token } : {}),
				...mapDimensions(row),
			},
			items: itemsResult.rows.map(mapAdminAfterSalesItem),
			logs: logsResult.rows.map(mapAdminAfterSalesLog),
			refunds: refundsResult.rows.map(mapAdminAfterSalesRefund),
		};
	}

	async findRequestByIdempotencyKey(
		input: SiteDimensions & {
			idempotencyKey: string;
			allowLegacyNullScope?: boolean;
		},
		transaction: TransactionContext,
	): Promise<AfterSalesRequestSummary | null> {
		const result = await getPgClient(transaction).query<RequestSummaryRow>(
			`
        SELECT
          id,
          request_no,
          order_id,
          status,
          requested_amount::text,
          approved_amount::text,
          site_id,
          vertical_id,
          brand_id
        FROM after_sales_requests
        WHERE idempotency_key = $1
          AND (
            site_id = $2
            OR ($3::boolean AND site_id IS NULL)
          )
        LIMIT 1
      `,
			[
				input.idempotencyKey,
				input.siteId,
				input.allowLegacyNullScope ?? false,
			],
		);
		const row = result.rows[0];

		return row ? mapRequest(row) : null;
	}

	async getOrderForRequestForUpdate(
		input: SiteDimensions & {
			orderId: string;
			allowLegacyNullScope?: boolean;
		},
		transaction: TransactionContext,
	): Promise<AfterSalesOrderSnapshot> {
		const result = await getPgClient(transaction).query<OrderSnapshotRow>(
			`
        SELECT
          id AS order_id,
          user_id,
          guest_token,
          payment_status,
          aftersales_status,
          currency,
          total_amount::text,
          site_id,
          vertical_id,
          brand_id
        FROM orders
        WHERE id = $1
          AND (
            site_id = $2
            OR ($3::boolean AND site_id IS NULL)
          )
        FOR UPDATE
      `,
			[input.orderId, input.siteId, input.allowLegacyNullScope ?? false],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error(`Order not found for after-sales request: ${input.orderId}`);
		}

		return {
			orderId: row.order_id,
			...(row.user_id ? { userId: row.user_id } : {}),
			...(row.guest_token ? { guestToken: row.guest_token } : {}),
			paymentStatus: row.payment_status,
			aftersalesStatus: row.aftersales_status,
			currency: row.currency,
			totalAmount: row.total_amount,
			...mapDimensions(row),
		};
	}

	async createRequest(
		plan: CreateAfterSalesRequestPlan,
		transaction: TransactionContext,
	): Promise<AfterSalesRequestSummary> {
		const client = getPgClient(transaction);
		const result = await client.query<RequestSummaryRow>(
			`
        INSERT INTO after_sales_requests (
          id,
          site_id,
          vertical_id,
          brand_id,
          order_id,
          user_id,
          request_no,
          type,
          status,
          reason,
          requested_amount,
          approved_amount,
          idempotency_key
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING
          id,
          request_no,
          order_id,
          status,
          requested_amount::text,
          approved_amount::text,
          site_id,
          vertical_id,
          brand_id
      `,
			[
				plan.request.requestId,
				plan.request.siteId,
				plan.request.verticalId,
				plan.request.brandId,
				plan.request.orderId,
				plan.request.userId ?? null,
				plan.request.requestNo,
				plan.request.type,
				plan.request.status,
				plan.request.reason,
				plan.request.requestedAmount,
				plan.request.approvedAmount,
				plan.request.idempotencyKey,
			],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error("Failed to create after-sales request.");
		}

		for (const item of plan.items) {
			const itemResult = await client.query<{ id: string }>(
				`
          INSERT INTO after_sales_items (
            id,
            after_sales_request_id,
            order_item_id,
            quantity,
            requested_amount,
            approved_amount
          )
          SELECT $1, $2, order_items.id, $4, $5, $6
          FROM order_items
          WHERE order_items.id = $3
            AND order_items.order_id = $7
          RETURNING id
        `,
				[
					item.afterSalesItemId,
					plan.request.requestId,
					item.orderItemId,
					item.quantity,
					item.requestedAmount ?? null,
					item.approvedAmount ?? null,
					plan.request.orderId,
				],
			);

			if (!itemResult.rows[0]) {
				throw new Error(`Order item not found for after-sales request: ${item.orderItemId}`);
			}
		}

		await client.query(
			`
        UPDATE orders
        SET aftersales_status = 'requested', updated_at = now()
        WHERE id = $1
      `,
			[plan.request.orderId],
		);
		await client.query(
			`
        INSERT INTO after_sales_logs (
          after_sales_request_id,
          action,
          from_status,
          to_status,
          operator_type,
          note
        )
        VALUES ($1, 'request_refund', NULL, 'requested', 'user', $2)
      `,
			[plan.request.requestId, plan.request.reason],
		);
		await client.query(
			`
        INSERT INTO order_status_logs (
          order_id,
          site_id,
          vertical_id,
          brand_id,
          status_type,
          from_status,
          to_status,
          reason,
          operator_type
        )
        VALUES ($1, $2, $3, $4, 'aftersales', $5, 'requested', $6, 'user')
      `,
			[
				plan.request.orderId,
				plan.request.siteId,
				plan.request.verticalId,
				plan.request.brandId,
				plan.orderAftersalesFromStatus,
				plan.request.reason,
			],
		);

		return mapRequest(row);
	}

	async findRefundByIdempotencyKey(
		idempotencyKey: string,
		transaction: TransactionContext,
	): Promise<PaymentRefundSummary | null> {
		const result = await getPgClient(transaction).query<RefundRow>(
			`
        SELECT
          id,
          refund_no,
          after_sales_request_id,
          payment_order_id,
          order_id,
          status,
          amount::text,
          currency,
          idempotency_key,
          provider_refund_id,
          site_id,
          vertical_id,
          brand_id
        FROM payment_refunds
        WHERE idempotency_key = $1
        LIMIT 1
      `,
			[idempotencyKey],
		);
		const row = result.rows[0];

		return row ? mapRefund(row) : null;
	}

	async getApprovalSnapshotForUpdate(
		requestId: string,
		transaction: TransactionContext,
	): Promise<ApprovalSnapshot> {
		const result = await getPgClient(transaction).query<ApprovalSnapshotRow>(
			`
        SELECT
          after_sales_requests.id,
          after_sales_requests.request_no,
          after_sales_requests.order_id,
          after_sales_requests.status,
          after_sales_requests.requested_amount::text,
          after_sales_requests.approved_amount::text,
          after_sales_requests.site_id,
          after_sales_requests.vertical_id,
          after_sales_requests.brand_id,
          after_sales_requests.type,
          after_sales_requests.reason,
          payment_orders.id AS payment_order_id,
          orders.payment_status,
          orders.aftersales_status AS order_aftersales_status,
          orders.currency,
          orders.total_amount::text AS order_total_amount,
          COALESCE(successful_refunds.amount, 0)::text AS already_refunded_amount
        FROM after_sales_requests
        JOIN orders ON orders.id = after_sales_requests.order_id
        JOIN LATERAL (
          SELECT id
          FROM payment_orders
          WHERE payment_orders.order_id = orders.id
            AND payment_orders.status = 'succeeded'
          ORDER BY succeeded_at DESC NULLS LAST, created_at DESC
          LIMIT 1
        ) payment_orders ON TRUE
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(amount), 0) AS amount
          FROM payment_refunds
          WHERE payment_refunds.order_id = orders.id
            AND payment_refunds.status = 'succeeded'
        ) successful_refunds ON TRUE
        WHERE after_sales_requests.id = $1
        FOR UPDATE OF after_sales_requests, orders
      `,
			[requestId],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error(`After-sales request not found: ${requestId}`);
		}

		return {
			...mapRequest(row),
			type: row.type,
			reason: row.reason,
			paymentOrderId: row.payment_order_id,
			paymentStatus: row.payment_status,
			orderAftersalesStatus: row.order_aftersales_status,
			currency: row.currency,
			orderTotalAmount: row.order_total_amount,
			alreadyRefundedAmount: row.already_refunded_amount,
		};
	}

	async approveRefundRequest(
		plan: ApproveRefundPlan,
		transaction: TransactionContext,
	): Promise<PaymentRefundSummary> {
		const client = getPgClient(transaction);

		await client.query(
			`
        UPDATE after_sales_requests
        SET status = $2, approved_amount = $3, updated_at = now()
        WHERE id = $1
      `,
			[plan.requestId, plan.toRequestStatus, plan.refund.amount],
		);
		await client.query(
			`
        UPDATE orders
        SET aftersales_status = $2, updated_at = now()
        WHERE id = $1
      `,
			[plan.refund.orderId, plan.toRequestStatus],
		);
		const result = await client.query<RefundRow>(
			`
        INSERT INTO payment_refunds (
          id,
          site_id,
          vertical_id,
          brand_id,
          after_sales_request_id,
          payment_order_id,
          order_id,
          refund_no,
          status,
          amount,
          currency,
          reason,
          idempotency_key,
          request_payload
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14::jsonb
        )
        RETURNING
          id,
          refund_no,
          after_sales_request_id,
          payment_order_id,
          order_id,
          status,
          amount::text,
          currency,
          idempotency_key,
          provider_refund_id,
          site_id,
          vertical_id,
          brand_id
      `,
			[
				plan.refund.refundId,
				plan.refund.siteId,
				plan.refund.verticalId,
				plan.refund.brandId,
				plan.refund.requestId,
				plan.refund.paymentOrderId,
				plan.refund.orderId,
				plan.refund.refundNo,
				plan.refund.status,
				plan.refund.amount,
				plan.refund.currency,
				plan.refund.reason,
				plan.refund.idempotencyKey,
				JSON.stringify(plan.refund.requestPayload),
			],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error("Failed to create payment refund.");
		}

		await client.query(
			`
        INSERT INTO after_sales_logs (
          after_sales_request_id,
          action,
          from_status,
          to_status,
          operator_type,
          note
        )
        VALUES ($1, 'approve_refund', $2, $3, 'admin', $4)
      `,
			[
				plan.requestId,
				plan.fromRequestStatus,
				plan.toRequestStatus,
				plan.refund.reason,
			],
		);
		await client.query(
			`
        INSERT INTO order_status_logs (
          order_id,
          site_id,
          vertical_id,
          brand_id,
          status_type,
          from_status,
          to_status,
          reason,
          operator_type
        )
        VALUES ($1, $2, $3, $4, 'aftersales', $5, $6, $7, 'admin')
      `,
			[
				plan.refund.orderId,
				plan.refund.siteId,
				plan.refund.verticalId,
				plan.refund.brandId,
				plan.fromOrderAftersalesStatus,
				plan.toRequestStatus,
				plan.refund.reason,
			],
		);

		return mapRefund(row);
	}

	async rejectAfterSalesRequest(
		plan: RejectAfterSalesRequestPlan,
		transaction: TransactionContext,
	): Promise<AfterSalesRequestSummary> {
		const client = getPgClient(transaction);
		const result = await client.query<RequestSummaryRow>(
			`
        UPDATE after_sales_requests
        SET status = $2, updated_at = now()
        WHERE id = $1
        RETURNING
          id,
          request_no,
          order_id,
          status,
          requested_amount::text,
          approved_amount::text,
          site_id,
          vertical_id,
          brand_id
      `,
			[plan.requestId, plan.toRequestStatus],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error(`After-sales request not found: ${plan.requestId}`);
		}

		await client.query(
			`
        UPDATE orders
        SET aftersales_status = $2, updated_at = now()
        WHERE id = $1
      `,
			[plan.orderId, plan.toOrderAftersalesStatus],
		);
		await client.query(
			`
        INSERT INTO after_sales_logs (
          after_sales_request_id,
          action,
          from_status,
          to_status,
          operator_type,
          note
        )
        VALUES ($1, 'reject_request', $2, $3, 'admin', $4)
      `,
			[
				plan.requestId,
				plan.fromRequestStatus,
				plan.toRequestStatus,
				plan.reason,
			],
		);
		await client.query(
			`
        INSERT INTO order_status_logs (
          order_id,
          site_id,
          vertical_id,
          brand_id,
          status_type,
          from_status,
          to_status,
          reason,
          operator_type
        )
        VALUES ($1, $2, $3, $4, 'aftersales', $5, $6, $7, 'admin')
      `,
			[
				plan.orderId,
				plan.siteId,
				plan.verticalId,
				plan.brandId,
				plan.fromOrderAftersalesStatus,
				plan.toOrderAftersalesStatus,
				plan.reason,
			],
		);

		return mapRequest(row);
	}

	async getRefundSucceededSnapshotForUpdate(
		refundId: string,
		transaction: TransactionContext,
	): Promise<RefundSucceededSnapshot> {
		const result = await getPgClient(transaction).query<RefundSucceededSnapshotRow>(
			`
        SELECT
          payment_refunds.id,
          payment_refunds.refund_no,
          payment_refunds.after_sales_request_id,
          payment_refunds.payment_order_id,
          payment_refunds.order_id,
          payment_refunds.status,
          payment_refunds.amount::text,
          payment_refunds.currency,
          payment_refunds.idempotency_key,
          payment_refunds.provider_refund_id,
          payment_refunds.site_id,
          payment_refunds.vertical_id,
          payment_refunds.brand_id,
          after_sales_requests.status AS request_status,
          orders.payment_status,
          orders.aftersales_status AS order_aftersales_status,
          orders.total_amount::text AS order_total_amount,
          COALESCE(successful_refunds.amount, 0)::text AS already_refunded_amount
        FROM payment_refunds
        JOIN orders ON orders.id = payment_refunds.order_id
        LEFT JOIN after_sales_requests
          ON after_sales_requests.id = payment_refunds.after_sales_request_id
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(amount), 0) AS amount
          FROM payment_refunds successful_refunds
          WHERE successful_refunds.order_id = payment_refunds.order_id
            AND successful_refunds.status = 'succeeded'
            AND successful_refunds.id <> payment_refunds.id
        ) successful_refunds ON TRUE
        WHERE payment_refunds.id = $1
        FOR UPDATE OF payment_refunds, orders
      `,
			[refundId],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error(`Payment refund not found: ${refundId}`);
		}

		return {
			...mapRefund(row),
			...(row.request_status ? { requestStatus: row.request_status } : {}),
			paymentStatus: row.payment_status,
			orderAftersalesStatus: row.order_aftersales_status,
			orderTotalAmount: row.order_total_amount,
			alreadyRefundedAmount: row.already_refunded_amount,
		};
	}

	async markRefundSucceeded(
		plan: MarkRefundSucceededPlan,
		transaction: TransactionContext,
	): Promise<PaymentRefundSummary> {
		const client = getPgClient(transaction);
		const result = await client.query<RefundRow>(
			`
        UPDATE payment_refunds
        SET
          status = 'succeeded',
          provider_refund_id = $2,
          response_payload = $3::jsonb,
          succeeded_at = now(),
          updated_at = now()
        WHERE id = $1
        RETURNING
          id,
          refund_no,
          after_sales_request_id,
          payment_order_id,
          order_id,
          status,
          amount::text,
          currency,
          idempotency_key,
          provider_refund_id,
          site_id,
          vertical_id,
          brand_id
      `,
			[
				plan.refundId,
				plan.providerRefundId,
				JSON.stringify(plan.responsePayload),
			],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error(`Payment refund not found: ${plan.refundId}`);
		}

		await client.query(
			`
        INSERT INTO payment_transactions (
          payment_order_id,
          site_id,
          vertical_id,
          brand_id,
          channel_code,
          provider_transaction_id,
          transaction_type,
          status,
          amount,
          currency,
          raw_payload
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'refund', 'succeeded', $7, $8, $9::jsonb)
        ON CONFLICT (channel_code, provider_transaction_id)
        DO NOTHING
      `,
			[
				plan.transaction.paymentOrderId,
				plan.transaction.siteId,
				plan.transaction.verticalId,
				plan.transaction.brandId,
				plan.transaction.channelCode,
				plan.transaction.providerTransactionId,
				plan.transaction.amount,
				plan.transaction.currency,
				JSON.stringify(plan.transaction.rawPayload),
			],
		);
		await client.query(
			`
        UPDATE orders
        SET
          payment_status = $2,
          aftersales_status = $3,
          updated_at = now()
        WHERE id = $1
      `,
			[
				row.order_id,
				plan.toPaymentStatus,
				plan.toOrderAftersalesStatus,
			],
		);

		if (row.after_sales_request_id && plan.toRequestStatus) {
			await client.query(
				`
          UPDATE after_sales_requests
          SET status = $2, updated_at = now()
          WHERE id = $1
        `,
				[row.after_sales_request_id, plan.toRequestStatus],
			);
			await client.query(
				`
          INSERT INTO after_sales_logs (
            after_sales_request_id,
            action,
            from_status,
            to_status,
            operator_type,
            note
          )
          VALUES ($1, 'refund_succeeded', $2, $3, 'admin', $4)
        `,
				[
					row.after_sales_request_id,
					plan.fromRequestStatus ?? null,
					plan.toRequestStatus,
					plan.providerRefundId,
				],
			);
		}

		await client.query(
			`
        INSERT INTO order_status_logs (
          order_id,
          site_id,
          vertical_id,
          brand_id,
          status_type,
          from_status,
          to_status,
          reason,
          operator_type
        )
        VALUES
          ($1, $2, $3, $4, 'payment', $5, $6, 'refund_succeeded', 'admin'),
          ($1, $2, $3, $4, 'aftersales', $7, $8, 'refund_succeeded', 'admin')
      `,
			[
				row.order_id,
				plan.transaction.siteId,
				plan.transaction.verticalId,
				plan.transaction.brandId,
				plan.fromPaymentStatus,
				plan.toPaymentStatus,
				plan.fromOrderAftersalesStatus,
				plan.toOrderAftersalesStatus,
			],
		);

		return mapRefund(row);
	}
}
