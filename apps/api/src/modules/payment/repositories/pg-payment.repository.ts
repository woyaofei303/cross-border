import { Injectable } from "@nestjs/common";
import type {
	PaymentOrderStatus,
	PaymentTransactionStatus,
	PaymentTransactionType,
	PaymentWebhookStatus,
} from "@cross-border/shared";
import type { AdminScope } from "../../../common/admin/admin-access.js";
import { hasGlobalAdminScope } from "../../../common/admin/admin-access.js";
import type { TransactionContext } from "../../../common/application/application-ports.js";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import { getPgClient } from "../../database/pg/pg-transaction-manager.js";
import type {
	AdminPaymentOrderListItem,
	AdminPaymentScopeQuery,
	AdminPaymentTransactionListItem,
	AdminPaymentWebhookListItem,
	PaymentAdminReadRepositoryPort,
	PaymentOrderSummary,
	PaymentWebhookRecord,
	PaymentWriteRepositoryPort,
} from "../payment.ports.js";
import type {
	CreatePaymentOrderPlan,
	PaymentProvider,
	PaymentWebhookReceiptPlan,
	ProcessPaymentWebhookPlan,
} from "../payment.types.js";

type PaymentOrderRow = {
	id: string;
	payment_no: string;
	order_id: string;
	channel_code: PaymentProvider;
	status: PaymentOrderStatus;
	amount: string;
	currency: string;
	idempotency_key: string;
	provider_payment_id: string | null;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
};

type WebhookRow = {
	id: string;
	payment_order_id: string | null;
	channel_code: PaymentProvider;
	provider_event_id: string;
	event_type: string;
	provider_object_id: string | null;
	raw_payload: Record<string, unknown>;
	status: PaymentWebhookStatus;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
};

type AdminPaymentOrderListRow = {
	payment_order_id: string;
	payment_no: string;
	order_id: string;
	order_no: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	channel_code: string;
	status: PaymentOrderStatus;
	amount: string;
	currency: string;
	provider_payment_id: string | null;
	idempotency_key: string;
	transaction_count: number | string;
	latest_webhook_event_id: string | null;
	latest_webhook_status: PaymentWebhookStatus | null;
	created_at: Date | string;
	updated_at: Date | string;
	succeeded_at: Date | string | null;
	failed_at: Date | string | null;
};

type AdminPaymentTransactionListRow = {
	payment_transaction_id: string;
	payment_order_id: string;
	payment_no: string;
	order_id: string;
	order_no: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	channel_code: string;
	provider_transaction_id: string;
	transaction_type: PaymentTransactionType;
	status: PaymentTransactionStatus;
	amount: string;
	currency: string;
	created_at: Date | string;
};

type AdminPaymentWebhookListRow = {
	webhook_event_id: string;
	payment_order_id: string | null;
	payment_no: string | null;
	order_id: string | null;
	order_no: string | null;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	channel_code: string;
	provider_event_id: string;
	event_type: string;
	provider_object_id: string | null;
	duplicate_count: number | string;
	status: PaymentWebhookStatus;
	error_message: string | null;
	received_at: Date | string;
	processed_at: Date | string | null;
};

function appendParam(params: unknown[], value: unknown): string {
	params.push(value);

	return `$${params.length}`;
}

function toIsoString(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value;
}

function toNumber(value: number | string): number {
	return typeof value === "number" ? value : Number(value);
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

function mapPaymentOrder(row: PaymentOrderRow): PaymentOrderSummary {
	return {
		paymentOrderId: row.id,
		paymentNo: row.payment_no,
		orderId: row.order_id,
		channelCode: row.channel_code,
		status: row.status,
		amount: row.amount,
		currency: row.currency,
		idempotencyKey: row.idempotency_key,
		siteId: row.site_id ?? defaultSiteContext.siteId,
		verticalId: row.vertical_id ?? defaultSiteContext.verticalId,
		brandId: row.brand_id ?? defaultSiteContext.brandId,
		...(row.provider_payment_id
			? { providerPaymentId: row.provider_payment_id }
			: {}),
	};
}

function mapWebhook(row: WebhookRow): PaymentWebhookRecord {
	return {
		webhookEventId: row.id,
		...(row.payment_order_id ? { paymentOrderId: row.payment_order_id } : {}),
		channelCode: row.channel_code,
		providerEventId: row.provider_event_id,
		eventType: row.event_type,
		...(row.provider_object_id
			? { providerObjectId: row.provider_object_id }
			: {}),
		rawPayload: row.raw_payload,
		status: row.status,
		...(row.site_id ? { siteId: row.site_id } : {}),
		...(row.vertical_id ? { verticalId: row.vertical_id } : {}),
		...(row.brand_id ? { brandId: row.brand_id } : {}),
	};
}

function mapAdminPaymentOrder(
	row: AdminPaymentOrderListRow,
): AdminPaymentOrderListItem {
	return {
		paymentOrderId: row.payment_order_id,
		paymentNo: row.payment_no,
		orderId: row.order_id,
		orderNo: row.order_no,
		...dimensionFields(row),
		channelCode: row.channel_code,
		status: row.status,
		amount: row.amount,
		currency: row.currency,
		...(row.provider_payment_id
			? { providerPaymentId: row.provider_payment_id }
			: {}),
		idempotencyKey: row.idempotency_key,
		transactionCount: toNumber(row.transaction_count),
		...(row.latest_webhook_event_id
			? { latestWebhookEventId: row.latest_webhook_event_id }
			: {}),
		...(row.latest_webhook_status
			? { latestWebhookStatus: row.latest_webhook_status }
			: {}),
		createdAt: toIsoString(row.created_at),
		updatedAt: toIsoString(row.updated_at),
		...(row.succeeded_at ? { succeededAt: toIsoString(row.succeeded_at) } : {}),
		...(row.failed_at ? { failedAt: toIsoString(row.failed_at) } : {}),
	};
}

function mapAdminPaymentTransaction(
	row: AdminPaymentTransactionListRow,
): AdminPaymentTransactionListItem {
	return {
		paymentTransactionId: row.payment_transaction_id,
		paymentOrderId: row.payment_order_id,
		paymentNo: row.payment_no,
		orderId: row.order_id,
		orderNo: row.order_no,
		...dimensionFields(row),
		channelCode: row.channel_code,
		providerTransactionId: row.provider_transaction_id,
		transactionType: row.transaction_type,
		status: row.status,
		amount: row.amount,
		currency: row.currency,
		createdAt: toIsoString(row.created_at),
	};
}

function mapAdminPaymentWebhook(
	row: AdminPaymentWebhookListRow,
): AdminPaymentWebhookListItem {
	return {
		webhookEventId: row.webhook_event_id,
		...(row.payment_order_id ? { paymentOrderId: row.payment_order_id } : {}),
		...(row.payment_no ? { paymentNo: row.payment_no } : {}),
		...(row.order_id ? { orderId: row.order_id } : {}),
		...(row.order_no ? { orderNo: row.order_no } : {}),
		...dimensionFields(row),
		channelCode: row.channel_code,
		providerEventId: row.provider_event_id,
		eventType: row.event_type,
		...(row.provider_object_id
			? { providerObjectId: row.provider_object_id }
			: {}),
		dedupeKey: `${row.channel_code}:${row.provider_event_id}`,
		duplicateCount: toNumber(row.duplicate_count),
		status: row.status,
		...(row.error_message ? { errorMessage: row.error_message } : {}),
		receivedAt: toIsoString(row.received_at),
		...(row.processed_at ? { processedAt: toIsoString(row.processed_at) } : {}),
	};
}

@Injectable()
export class PgPaymentRepository
	implements PaymentWriteRepositoryPort, PaymentAdminReadRepositoryPort
{
	async findPaymentOrderByIdempotencyKey(
		idempotencyKey: string,
		transaction: TransactionContext,
	): Promise<PaymentOrderSummary | null> {
		const result = await getPgClient(transaction).query<PaymentOrderRow>(
			`
        SELECT
          id,
          payment_no,
          order_id,
          channel_code,
          status,
          amount::text,
          currency,
          idempotency_key,
          provider_payment_id,
          site_id,
          vertical_id,
          brand_id
        FROM payment_orders
        WHERE idempotency_key = $1
        LIMIT 1
      `,
			[idempotencyKey],
		);
		const row = result.rows[0];

		return row ? mapPaymentOrder(row) : null;
	}

	async createPaymentOrder(
		plan: CreatePaymentOrderPlan,
		transaction: TransactionContext,
	): Promise<PaymentOrderSummary> {
		const result = await getPgClient(transaction).query<PaymentOrderRow>(
			`
        INSERT INTO payment_orders (
          id,
          order_id,
          site_id,
          vertical_id,
          brand_id,
          payment_no,
          channel_code,
          status,
          amount,
          currency,
          idempotency_key
        )
        SELECT
          $1,
          orders.id,
          orders.site_id,
          orders.vertical_id,
          orders.brand_id,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8
        FROM orders
        WHERE orders.id = $2
        RETURNING
          id,
          payment_no,
          order_id,
          channel_code,
          status,
          amount::text,
          currency,
          idempotency_key,
          provider_payment_id,
          site_id,
          vertical_id,
          brand_id
      `,
			[
				plan.paymentOrder.id,
				plan.paymentOrder.orderId,
				plan.paymentOrder.paymentNo,
				plan.paymentOrder.channelCode,
				plan.status,
				plan.paymentOrder.amount,
				plan.paymentOrder.currency,
				plan.paymentOrder.idempotencyKey,
			],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error(
				`Failed to create payment order. Order not found: ${plan.paymentOrder.orderId}`,
			);
		}

		return mapPaymentOrder(row);
	}

	async insertWebhookIfNew(
		plan: PaymentWebhookReceiptPlan,
		transaction: TransactionContext,
	): Promise<{ inserted: boolean; webhookEventId: string }> {
		const result = await getPgClient(transaction).query<{ id: string }>(
			`
        WITH matched_payment_order AS (
          SELECT
            payment_orders.id,
            payment_orders.site_id,
            payment_orders.vertical_id,
            payment_orders.brand_id
          FROM payment_orders
          WHERE payment_orders.channel_code = $1
            AND (
              payment_orders.provider_payment_id = $4
              OR payment_orders.id::text = $4
            )
          ORDER BY payment_orders.created_at DESC
          LIMIT 1
        )
        INSERT INTO payment_webhook_events (
          payment_order_id,
          site_id,
          vertical_id,
          brand_id,
          channel_code,
          provider_event_id,
          event_type,
          provider_object_id,
          raw_payload,
          signature_header,
          status
        )
        SELECT
          matched_payment_order.id,
          matched_payment_order.site_id,
          matched_payment_order.vertical_id,
          matched_payment_order.brand_id,
          $1,
          $2,
          $3,
          $4,
          $5::jsonb,
          $6,
          'received'
        FROM (SELECT 1) input
        LEFT JOIN matched_payment_order ON TRUE
        ON CONFLICT (channel_code, provider_event_id)
        DO NOTHING
        RETURNING id
      `,
			[
				plan.webhookEvent.channelCode,
				plan.webhookEvent.providerEventId,
				plan.webhookEvent.eventType,
				plan.webhookEvent.providerObjectId ?? null,
				JSON.stringify(plan.webhookEvent.rawPayload),
				plan.webhookEvent.signatureHeader ?? null,
			],
		);
		const insertedRow = result.rows[0];

		if (insertedRow) {
			return {
				inserted: true,
				webhookEventId: insertedRow.id,
			};
		}

		const existing = await getPgClient(transaction).query<{ id: string }>(
			`
        SELECT id
        FROM payment_webhook_events
        WHERE channel_code = $1 AND provider_event_id = $2
        LIMIT 1
      `,
			[plan.dedupeKey.channelCode, plan.dedupeKey.providerEventId],
		);
		const existingRow = existing.rows[0];

		if (!existingRow) {
			throw new Error("Payment webhook conflict row not found.");
		}

		return {
			inserted: false,
			webhookEventId: existingRow.id,
		};
	}

	async getWebhookForProcessing(
		webhookEventId: string,
		transaction: TransactionContext,
	): Promise<PaymentWebhookRecord> {
		const result = await getPgClient(transaction).query<WebhookRow>(
			`
        SELECT
          id,
          payment_order_id,
          channel_code,
          provider_event_id,
          event_type,
          provider_object_id,
          raw_payload,
          status,
          site_id,
          vertical_id,
          brand_id
        FROM payment_webhook_events
        WHERE id = $1
        FOR UPDATE
      `,
			[webhookEventId],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error(`Payment webhook event not found: ${webhookEventId}`);
		}

		return mapWebhook(row);
	}

	async findPaymentOrderForWebhook(
		webhook: PaymentWebhookRecord,
		transaction: TransactionContext,
	): Promise<PaymentOrderSummary> {
		const result = await getPgClient(transaction).query<PaymentOrderRow>(
			`
        SELECT
          id,
          payment_no,
          order_id,
          channel_code,
          status,
          amount::text,
          currency,
          idempotency_key,
          provider_payment_id,
          site_id,
          vertical_id,
          brand_id
        FROM payment_orders
        WHERE channel_code = $1
          AND (
            provider_payment_id = $2
            OR id::text = $2
            OR id = $3
          )
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
			[
				webhook.channelCode,
				webhook.providerObjectId ?? null,
				webhook.paymentOrderId ?? null,
			],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error(
				`Payment order not found for webhook ${webhook.webhookEventId}.`,
			);
		}

		return mapPaymentOrder(row);
	}

	async attachWebhookToPaymentOrder(input: {
		webhookEventId: string;
		paymentOrder: PaymentOrderSummary;
		transaction: TransactionContext;
	}): Promise<void> {
		await getPgClient(input.transaction).query(
			`
        UPDATE payment_webhook_events
        SET
          payment_order_id = COALESCE(payment_order_id, $2),
          site_id = COALESCE(site_id, $3),
          vertical_id = COALESCE(vertical_id, $4),
          brand_id = COALESCE(brand_id, $5)
        WHERE id = $1
      `,
			[
				input.webhookEventId,
				input.paymentOrder.paymentOrderId,
				input.paymentOrder.siteId,
				input.paymentOrder.verticalId,
				input.paymentOrder.brandId,
			],
		);
	}

	async updateWebhookStatus(input: {
		webhookEventId: string;
		status: PaymentWebhookStatus;
		errorMessage?: string;
		transaction: TransactionContext;
	}): Promise<void> {
		await getPgClient(input.transaction).query(
			`
        UPDATE payment_webhook_events
        SET
          status = $2::varchar,
          error_message = $3,
          processed_at = CASE WHEN $2::varchar = 'processed' THEN now() ELSE processed_at END
        WHERE id = $1
      `,
			[input.webhookEventId, input.status, input.errorMessage ?? null],
		);
	}

	async appendTransaction(
		transactionRecord: ProcessPaymentWebhookPlan["transaction"],
		transaction: TransactionContext,
	): Promise<void> {
		await getPgClient(transaction).query(
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
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
        ON CONFLICT (channel_code, provider_transaction_id)
        DO NOTHING
      `,
			[
				transactionRecord.paymentOrderId,
				transactionRecord.siteId,
				transactionRecord.verticalId,
				transactionRecord.brandId,
				transactionRecord.channelCode,
				transactionRecord.providerTransactionId,
				transactionRecord.transactionType,
				transactionRecord.status,
				transactionRecord.amount,
				transactionRecord.currency,
				JSON.stringify(transactionRecord.rawPayload),
			],
		);
	}

	async updatePaymentOrderStatus(input: {
		paymentOrderId: string;
		status: PaymentOrderStatus;
		transaction: TransactionContext;
	}): Promise<void> {
		await getPgClient(input.transaction).query(
			`
        UPDATE payment_orders
        SET
          status = $2::varchar,
          succeeded_at = CASE WHEN $2::varchar = 'succeeded' THEN now() ELSE succeeded_at END,
          failed_at = CASE WHEN $2::varchar = 'failed' THEN now() ELSE failed_at END,
          updated_at = now()
        WHERE id = $1
      `,
			[input.paymentOrderId, input.status],
		);
	}

	async listAdminPaymentOrders(
		query: AdminPaymentScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminPaymentOrderListItem[]> {
		const params: unknown[] = [];
		const adminScope = buildAdminAccessPredicate(
			query.adminAccess.scopes,
			"payment_orders",
			params,
		);
		const selectedScope = buildSelectedScopePredicate(
			query.selectedScope,
			"payment_orders",
			params,
		);
		const limitPlaceholder = appendParam(params, query.limit);
		const result = await getPgClient(transaction).query<AdminPaymentOrderListRow>(
			`
        SELECT
          payment_orders.id AS payment_order_id,
          payment_orders.payment_no,
          payment_orders.order_id,
          orders.order_no,
          payment_orders.site_id,
          payment_orders.vertical_id,
          payment_orders.brand_id,
          payment_orders.channel_code,
          payment_orders.status,
          payment_orders.amount::text,
          payment_orders.currency,
          payment_orders.provider_payment_id,
          payment_orders.idempotency_key,
          COALESCE(transaction_counts.transaction_count, 0)::int AS transaction_count,
          latest_webhook.provider_event_id AS latest_webhook_event_id,
          latest_webhook.status AS latest_webhook_status,
          payment_orders.created_at,
          payment_orders.updated_at,
          payment_orders.succeeded_at,
          payment_orders.failed_at
        FROM payment_orders
        INNER JOIN orders ON orders.id = payment_orders.order_id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS transaction_count
          FROM payment_transactions
          WHERE payment_transactions.payment_order_id = payment_orders.id
        ) transaction_counts ON TRUE
        LEFT JOIN LATERAL (
          SELECT provider_event_id, status
          FROM payment_webhook_events
          WHERE payment_webhook_events.payment_order_id = payment_orders.id
          ORDER BY payment_webhook_events.received_at DESC, payment_webhook_events.id DESC
          LIMIT 1
        ) latest_webhook ON TRUE
        WHERE ${adminScope}
          AND ${selectedScope}
        ORDER BY payment_orders.created_at DESC, payment_orders.id DESC
        LIMIT ${limitPlaceholder}
      `,
			params,
		);

		return result.rows.map(mapAdminPaymentOrder);
	}

	async listAdminPaymentTransactions(
		query: AdminPaymentScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminPaymentTransactionListItem[]> {
		const params: unknown[] = [];
		const adminScope = buildAdminAccessPredicate(
			query.adminAccess.scopes,
			"payment_transactions",
			params,
		);
		const selectedScope = buildSelectedScopePredicate(
			query.selectedScope,
			"payment_transactions",
			params,
		);
		const limitPlaceholder = appendParam(params, query.limit);
		const result = await getPgClient(transaction).query<AdminPaymentTransactionListRow>(
			`
        SELECT
          payment_transactions.id AS payment_transaction_id,
          payment_transactions.payment_order_id,
          payment_orders.payment_no,
          payment_orders.order_id,
          orders.order_no,
          payment_transactions.site_id,
          payment_transactions.vertical_id,
          payment_transactions.brand_id,
          payment_transactions.channel_code,
          payment_transactions.provider_transaction_id,
          payment_transactions.transaction_type,
          payment_transactions.status,
          payment_transactions.amount::text,
          payment_transactions.currency,
          payment_transactions.created_at
        FROM payment_transactions
        INNER JOIN payment_orders ON payment_orders.id = payment_transactions.payment_order_id
        INNER JOIN orders ON orders.id = payment_orders.order_id
        WHERE ${adminScope}
          AND ${selectedScope}
        ORDER BY payment_transactions.created_at DESC, payment_transactions.id DESC
        LIMIT ${limitPlaceholder}
      `,
			params,
		);

		return result.rows.map(mapAdminPaymentTransaction);
	}

	async listAdminPaymentWebhooks(
		query: AdminPaymentScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminPaymentWebhookListItem[]> {
		const params: unknown[] = [];
		const adminScope = buildAdminAccessPredicate(
			query.adminAccess.scopes,
			"payment_webhook_events",
			params,
		);
		const selectedScope = buildSelectedScopePredicate(
			query.selectedScope,
			"payment_webhook_events",
			params,
		);
		const limitPlaceholder = appendParam(params, query.limit);
		const result = await getPgClient(transaction).query<AdminPaymentWebhookListRow>(
			`
        SELECT
          payment_webhook_events.id AS webhook_event_id,
          payment_webhook_events.payment_order_id,
          payment_orders.payment_no,
          payment_orders.order_id,
          orders.order_no,
          payment_webhook_events.site_id,
          payment_webhook_events.vertical_id,
          payment_webhook_events.brand_id,
          payment_webhook_events.channel_code,
          payment_webhook_events.provider_event_id,
          payment_webhook_events.event_type,
          payment_webhook_events.provider_object_id,
          COUNT(*) OVER (
            PARTITION BY payment_webhook_events.channel_code,
            payment_webhook_events.provider_event_id
          )::int AS duplicate_count,
          payment_webhook_events.status,
          payment_webhook_events.error_message,
          payment_webhook_events.received_at,
          payment_webhook_events.processed_at
        FROM payment_webhook_events
        LEFT JOIN payment_orders
          ON payment_orders.id = payment_webhook_events.payment_order_id
        LEFT JOIN orders ON orders.id = payment_orders.order_id
        WHERE ${adminScope}
          AND ${selectedScope}
        ORDER BY payment_webhook_events.received_at DESC, payment_webhook_events.id DESC
        LIMIT ${limitPlaceholder}
      `,
			params,
		);

		return result.rows.map(mapAdminPaymentWebhook);
	}
}
