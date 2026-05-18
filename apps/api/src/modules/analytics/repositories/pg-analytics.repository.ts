import { Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";
import type {
	AdminAccessContext,
	AdminScope,
} from "../../../common/admin/admin-access.js";
import { hasGlobalAdminScope } from "../../../common/admin/admin-access.js";
import type { TransactionContext } from "../../../common/application/application-ports.js";
import { getPgClient } from "../../database/pg/pg-transaction-manager.js";
import { PgPoolService } from "../../database/pg/pg-pool.service.js";
import type { AnalyticsRepositoryPort } from "../analytics.ports.js";
import type {
	AnalyticsDomainEvent,
	AnalyticsEventRecord,
	AnalyticsStatsQuery,
	ChannelPerformanceDelta,
	ChannelPerformanceStatsRow,
	CustomerLtvDelta,
	CustomerLtvStatsRow,
	DailySalesDelta,
	DailySalesStatsRow,
	OrderAnalyticsItem,
	OrderAnalyticsSnapshot,
	ProductPerformanceDelta,
	ProductPerformanceStatsRow,
} from "../analytics.types.js";

type SqlPredicate = {
	sql: string;
	params: string[];
};

type DomainEventRow = {
	id: string;
	event_type: AnalyticsDomainEvent["eventType"];
	aggregate_type: string;
	aggregate_id: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	payload: unknown;
	created_at: Date | string;
};

type OrderAnalyticsRow = {
	order_id: string;
	order_no: string;
	site_id: string;
	vertical_id: string;
	brand_id: string;
	user_id: string | null;
	guest_token: string | null;
	currency: string;
	total_amount: string;
	paid_at: Date | string | null;
	created_at: Date | string;
	channel_code: string | null;
};

type OrderAnalyticsItemRow = {
	product_id: string;
	sku_id: string;
	quantity: number;
	total_amount: string;
};

type DailySalesStatsDbRow = {
	stat_date: Date | string;
	scope_type: DailySalesStatsRow["scopeType"];
	scope_key: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	currency: string;
	gmv_amount: string;
	net_sales_amount: string;
	refund_amount: string;
	chargeback_amount: string;
	order_count: number;
	paid_order_count: number;
	refunded_order_count: number;
	chargeback_count: number;
};

type ChannelPerformanceStatsDbRow = {
	stat_date: Date | string;
	scope_type: ChannelPerformanceStatsRow["scopeType"];
	scope_key: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	channel_code: string;
	currency: string;
	order_count: number;
	gmv_amount: string;
	net_sales_amount: string;
	refund_amount: string;
	chargeback_amount: string;
	ad_spend_amount: string;
};

type ProductPerformanceStatsDbRow = {
	stat_date: Date | string;
	scope_type: ProductPerformanceStatsRow["scopeType"];
	scope_key: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	product_id: string;
	sku_id: string;
	currency: string;
	units_sold: number;
	order_count: number;
	gmv_amount: string;
	net_sales_amount: string;
	refund_amount: string;
};

type CustomerLtvStatsDbRow = {
	scope_type: CustomerLtvStatsRow["scopeType"];
	scope_key: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	customer_identity_type: CustomerLtvStatsRow["customerIdentityType"];
	customer_identity_key: string;
	user_id: string | null;
	guest_token: string | null;
	currency: string;
	first_order_at: Date | string;
	last_order_at: Date | string;
	order_count: number;
	gross_sales_amount: string;
	net_sales_amount: string;
	refund_amount: string;
};

function appendParam(params: string[], value: string, startIndex = 1): string {
	params.push(value);

	return `$${startIndex + params.length - 1}`;
}

function toIsoString(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value;
}

function toDateString(value: Date | string): string {
	if (value instanceof Date) {
		return value.toISOString().slice(0, 10);
	}

	return value.slice(0, 10);
}

function toRecord(value: unknown): Record<string, unknown> {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}

	return {};
}

function buildAdminStatsPredicate(
	scopes: readonly AdminScope[],
	alias: string,
	startIndex = 1,
): SqlPredicate {
	if (hasGlobalAdminScope(scopes)) {
		return {
			sql: "TRUE",
			params: [],
		};
	}

	const params: string[] = [];
	const clauses = scopes.flatMap((scope) => {
		if (!scope.scopeId) {
			return [];
		}

		const placeholder = appendParam(params, scope.scopeId, startIndex);

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

function buildStatsFilters(
	query: AnalyticsStatsQuery,
	alias: string,
	startIndex = 1,
): SqlPredicate {
	const params: string[] = [];
	const clauses: string[] = [];

	if (query.scopeType) {
		clauses.push(`${alias}.scope_type = ${appendParam(params, query.scopeType, startIndex)}`);
	}

	if (query.scopeId) {
		clauses.push(`${alias}.scope_key = ${appendParam(params, query.scopeId, startIndex)}`);
	}

	if (query.currency) {
		clauses.push(`${alias}.currency = ${appendParam(params, query.currency, startIndex)}`);
	}

	if (query.from) {
		clauses.push(`${alias}.stat_date >= ${appendParam(params, query.from, startIndex)}::date`);
	}

	if (query.to) {
		clauses.push(`${alias}.stat_date <= ${appendParam(params, query.to, startIndex)}::date`);
	}

	return {
		sql: clauses.length > 0 ? clauses.join(" AND ") : "TRUE",
		params,
	};
}

function buildCustomerFilters(
	query: AnalyticsStatsQuery,
	alias: string,
	startIndex = 1,
): SqlPredicate {
	const params: string[] = [];
	const clauses: string[] = [];

	if (query.scopeType) {
		clauses.push(`${alias}.scope_type = ${appendParam(params, query.scopeType, startIndex)}`);
	}

	if (query.scopeId) {
		clauses.push(`${alias}.scope_key = ${appendParam(params, query.scopeId, startIndex)}`);
	}

	if (query.currency) {
		clauses.push(`${alias}.currency = ${appendParam(params, query.currency, startIndex)}`);
	}

	if (query.from) {
		clauses.push(`${alias}.last_order_at >= ${appendParam(params, query.from, startIndex)}::date`);
	}

	if (query.to) {
		clauses.push(`${alias}.last_order_at < (${appendParam(params, query.to, startIndex)}::date + INTERVAL '1 day')`);
	}

	return {
		sql: clauses.length > 0 ? clauses.join(" AND ") : "TRUE",
		params,
	};
}

function scopeParams(scope: {
	scopeType: string;
	scopeKey: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
}): Array<string | null> {
	return [
		scope.scopeType,
		scope.scopeKey,
		scope.siteId ?? null,
		scope.verticalId ?? null,
		scope.brandId ?? null,
	];
}

function mapDailySales(row: DailySalesStatsDbRow): DailySalesStatsRow {
	return {
		statDate: toDateString(row.stat_date),
		scopeType: row.scope_type,
		scopeKey: row.scope_key,
		...(row.site_id ? { siteId: row.site_id } : {}),
		...(row.vertical_id ? { verticalId: row.vertical_id } : {}),
		...(row.brand_id ? { brandId: row.brand_id } : {}),
		currency: row.currency,
		gmvAmount: row.gmv_amount,
		netSalesAmount: row.net_sales_amount,
		refundAmount: row.refund_amount,
		chargebackAmount: row.chargeback_amount,
		orderCount: row.order_count,
		paidOrderCount: row.paid_order_count,
		refundedOrderCount: row.refunded_order_count,
		chargebackCount: row.chargeback_count,
	};
}

function mapChannelPerformance(
	row: ChannelPerformanceStatsDbRow,
): ChannelPerformanceStatsRow {
	return {
		statDate: toDateString(row.stat_date),
		scopeType: row.scope_type,
		scopeKey: row.scope_key,
		...(row.site_id ? { siteId: row.site_id } : {}),
		...(row.vertical_id ? { verticalId: row.vertical_id } : {}),
		...(row.brand_id ? { brandId: row.brand_id } : {}),
		channelCode: row.channel_code,
		currency: row.currency,
		orderCount: row.order_count,
		gmvAmount: row.gmv_amount,
		netSalesAmount: row.net_sales_amount,
		refundAmount: row.refund_amount,
		chargebackAmount: row.chargeback_amount,
		adSpendAmount: row.ad_spend_amount,
	};
}

function mapProductPerformance(
	row: ProductPerformanceStatsDbRow,
): ProductPerformanceStatsRow {
	return {
		statDate: toDateString(row.stat_date),
		scopeType: row.scope_type,
		scopeKey: row.scope_key,
		...(row.site_id ? { siteId: row.site_id } : {}),
		...(row.vertical_id ? { verticalId: row.vertical_id } : {}),
		...(row.brand_id ? { brandId: row.brand_id } : {}),
		productId: row.product_id,
		skuId: row.sku_id,
		currency: row.currency,
		unitsSold: row.units_sold,
		orderCount: row.order_count,
		gmvAmount: row.gmv_amount,
		netSalesAmount: row.net_sales_amount,
		refundAmount: row.refund_amount,
	};
}

function mapCustomerLtv(row: CustomerLtvStatsDbRow): CustomerLtvStatsRow {
	return {
		scopeType: row.scope_type,
		scopeKey: row.scope_key,
		...(row.site_id ? { siteId: row.site_id } : {}),
		...(row.vertical_id ? { verticalId: row.vertical_id } : {}),
		...(row.brand_id ? { brandId: row.brand_id } : {}),
		customerIdentityType: row.customer_identity_type,
		customerIdentityKey: row.customer_identity_key,
		...(row.user_id ? { userId: row.user_id } : {}),
		...(row.guest_token ? { guestToken: row.guest_token } : {}),
		currency: row.currency,
		firstOrderAt: toIsoString(row.first_order_at),
		lastOrderAt: toIsoString(row.last_order_at),
		orderCount: row.order_count,
		grossSalesAmount: row.gross_sales_amount,
		netSalesAmount: row.net_sales_amount,
		refundAmount: row.refund_amount,
	};
}

@Injectable()
export class PgAnalyticsRepository implements AnalyticsRepositoryPort {
	constructor(private readonly pool: PgPoolService) {}

	async claimPendingOrderPaidEvents(
		input: {
			limit: number;
			transaction: TransactionContext;
		},
	): Promise<string[]> {
		const result = await getPgClient(input.transaction).query<{ id: string }>(
			`
        WITH claimed_events AS (
          SELECT id
          FROM domain_events
          WHERE event_type = 'OrderPaid'
            AND status IN ('pending', 'failed')
            AND (next_retry_at IS NULL OR next_retry_at <= now())
          ORDER BY created_at ASC
          LIMIT $1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE domain_events
        SET status = 'processing'
        WHERE id IN (SELECT id FROM claimed_events)
        RETURNING id
      `,
			[input.limit],
		);

		return result.rows.map((row) => row.id);
	}

	async getDomainEventForUpdate(
		eventId: string,
		transaction: TransactionContext,
	): Promise<AnalyticsDomainEvent | null> {
		const result = await getPgClient(transaction).query<DomainEventRow>(
			`
        SELECT
          id,
          event_type,
          aggregate_type,
          aggregate_id,
          site_id,
          vertical_id,
          brand_id,
          payload,
          created_at
        FROM domain_events
        WHERE id = $1
        FOR UPDATE
      `,
			[eventId],
		);
		const row = result.rows[0];

		if (!row) {
			return null;
		}

		return {
			id: row.id,
			eventType: row.event_type,
			aggregateType: row.aggregate_type,
			aggregateId: row.aggregate_id,
			...(row.site_id ? { siteId: row.site_id } : {}),
			...(row.vertical_id ? { verticalId: row.vertical_id } : {}),
			...(row.brand_id ? { brandId: row.brand_id } : {}),
			payload: toRecord(row.payload),
			createdAt: toIsoString(row.created_at),
		};
	}

	async getOrderAnalyticsSnapshot(
		input: {
			orderId: string;
			paymentOrderId: string;
		},
		transaction: TransactionContext,
	): Promise<OrderAnalyticsSnapshot> {
		const client = getPgClient(transaction);
		const orderResult = await client.query<OrderAnalyticsRow>(
			`
        SELECT
          orders.id AS order_id,
          orders.order_no,
          orders.site_id,
          orders.vertical_id,
          orders.brand_id,
          orders.user_id,
          orders.guest_token,
          orders.currency,
          orders.total_amount,
          orders.paid_at,
          orders.created_at,
          COALESCE(payment_orders.channel_code, 'unknown') AS channel_code
        FROM orders
        LEFT JOIN payment_orders
          ON payment_orders.id = $2
         AND payment_orders.order_id = orders.id
         AND payment_orders.site_id = orders.site_id
         AND payment_orders.vertical_id = orders.vertical_id
         AND payment_orders.brand_id = orders.brand_id
        WHERE orders.id = $1
        FOR UPDATE OF orders
      `,
			[input.orderId, input.paymentOrderId],
		);
		const order = orderResult.rows[0];

		if (!order) {
			throw new Error(`Order not found for analytics: ${input.orderId}.`);
		}

		if (!order.site_id || !order.vertical_id || !order.brand_id) {
			throw new Error(
				`Order ${input.orderId} is missing site dimensions for analytics.`,
			);
		}

		const itemResult = await client.query<OrderAnalyticsItemRow>(
			`
        SELECT
          product_id,
          sku_id,
          quantity,
          total_amount
        FROM order_items
        WHERE order_id = $1
          AND site_id = $2
          AND vertical_id = $3
          AND brand_id = $4
        ORDER BY id
      `,
			[input.orderId, order.site_id, order.vertical_id, order.brand_id],
		);

		const items: OrderAnalyticsItem[] = itemResult.rows.map((row) => ({
			productId: row.product_id,
			skuId: row.sku_id,
			quantity: row.quantity,
			totalAmount: row.total_amount,
		}));

		return {
			orderId: order.order_id,
			orderNo: order.order_no,
			siteId: order.site_id,
			verticalId: order.vertical_id,
			brandId: order.brand_id,
			...(order.user_id ? { userId: order.user_id } : {}),
			...(order.guest_token ? { guestToken: order.guest_token } : {}),
			currency: order.currency,
			totalAmount: order.total_amount,
			paidAt: order.paid_at
				? toIsoString(order.paid_at)
				: toIsoString(order.created_at),
			createdAt: toIsoString(order.created_at),
			channelCode: order.channel_code ?? "unknown",
			items,
		};
	}

	async appendAnalyticsEventIfNew(
		record: AnalyticsEventRecord,
		transaction: TransactionContext,
	): Promise<boolean> {
		const result = await getPgClient(transaction).query<{ id: string }>(
			`
        INSERT INTO analytics_events (
          site_id,
          vertical_id,
          brand_id,
          event_type,
          subject_type,
          subject_id,
          user_id,
          guest_token,
          order_id,
          product_id,
          sku_id,
          channel_code,
          currency,
          amount,
          properties,
          idempotency_key,
          occurred_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15::jsonb,
          $16,
          $17
        )
        ON CONFLICT (idempotency_key) DO NOTHING
        RETURNING id
      `,
			[
				record.siteId,
				record.verticalId,
				record.brandId,
				record.eventType,
				record.subjectType,
				record.subjectId,
				record.userId ?? null,
				record.guestToken ?? null,
				record.orderId ?? null,
				record.productId ?? null,
				record.skuId ?? null,
				record.channelCode ?? null,
				record.currency ?? null,
				record.amount ?? null,
				JSON.stringify(record.properties),
				record.idempotencyKey,
				record.occurredAt,
			],
		);

		return result.rowCount === 1;
	}

	async markDomainEventProcessed(
		eventId: string,
		transaction: TransactionContext,
	): Promise<void> {
		await getPgClient(transaction).query(
			`
        UPDATE domain_events
        SET
          status = 'processed',
          next_retry_at = NULL,
          processed_at = now()
        WHERE id = $1
      `,
			[eventId],
		);
	}

	async markDomainEventFailed(
		input: {
			eventId: string;
			maxRetryCount: number;
			retryDelaySeconds: number;
		},
		transaction: TransactionContext,
	): Promise<void> {
		await getPgClient(transaction).query(
			`
        UPDATE domain_events
        SET
          retry_count = retry_count + 1,
          status = CASE
            WHEN retry_count + 1 >= $2 THEN 'dead_letter'
            ELSE 'failed'
          END,
          next_retry_at = CASE
            WHEN retry_count + 1 >= $2 THEN NULL
            ELSE now() + ($3::int * INTERVAL '1 second')
          END
        WHERE id = $1
      `,
			[input.eventId, input.maxRetryCount, input.retryDelaySeconds],
		);
	}

	async upsertDailySalesDelta(
		delta: DailySalesDelta,
		transaction: TransactionContext,
	): Promise<void> {
		await getPgClient(transaction).query(
			`
        INSERT INTO daily_sales_stats (
          stat_date,
          scope_type,
          scope_key,
          site_id,
          vertical_id,
          brand_id,
          currency,
          gmv_amount,
          net_sales_amount,
          order_count,
          paid_order_count
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (stat_date, scope_type, scope_key, currency)
        DO UPDATE SET
          gmv_amount = daily_sales_stats.gmv_amount + EXCLUDED.gmv_amount,
          net_sales_amount = daily_sales_stats.net_sales_amount + EXCLUDED.net_sales_amount,
          order_count = daily_sales_stats.order_count + EXCLUDED.order_count,
          paid_order_count = daily_sales_stats.paid_order_count + EXCLUDED.paid_order_count,
          updated_at = now()
      `,
			[
				delta.statDate,
				...scopeParams(delta),
				delta.currency,
				delta.gmvAmount,
				delta.netSalesAmount,
				delta.orderCount,
				delta.paidOrderCount,
			],
		);
	}

	async upsertChannelPerformanceDelta(
		delta: ChannelPerformanceDelta,
		transaction: TransactionContext,
	): Promise<void> {
		await getPgClient(transaction).query(
			`
        INSERT INTO channel_performance_stats (
          stat_date,
          scope_type,
          scope_key,
          site_id,
          vertical_id,
          brand_id,
          channel_code,
          currency,
          order_count,
          gmv_amount,
          net_sales_amount
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (stat_date, scope_type, scope_key, channel_code, currency)
        DO UPDATE SET
          order_count = channel_performance_stats.order_count + EXCLUDED.order_count,
          gmv_amount = channel_performance_stats.gmv_amount + EXCLUDED.gmv_amount,
          net_sales_amount = channel_performance_stats.net_sales_amount + EXCLUDED.net_sales_amount,
          updated_at = now()
      `,
			[
				delta.statDate,
				...scopeParams(delta),
				delta.channelCode,
				delta.currency,
				delta.orderCount,
				delta.gmvAmount,
				delta.netSalesAmount,
			],
		);
	}

	async upsertProductPerformanceDelta(
		delta: ProductPerformanceDelta,
		transaction: TransactionContext,
	): Promise<void> {
		await getPgClient(transaction).query(
			`
        INSERT INTO product_performance_stats (
          stat_date,
          scope_type,
          scope_key,
          site_id,
          vertical_id,
          brand_id,
          product_id,
          sku_id,
          currency,
          units_sold,
          order_count,
          gmv_amount,
          net_sales_amount
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (stat_date, scope_type, scope_key, product_id, sku_id, currency)
        DO UPDATE SET
          units_sold = product_performance_stats.units_sold + EXCLUDED.units_sold,
          order_count = product_performance_stats.order_count + EXCLUDED.order_count,
          gmv_amount = product_performance_stats.gmv_amount + EXCLUDED.gmv_amount,
          net_sales_amount = product_performance_stats.net_sales_amount + EXCLUDED.net_sales_amount,
          updated_at = now()
      `,
			[
				delta.statDate,
				...scopeParams(delta),
				delta.productId,
				delta.skuId,
				delta.currency,
				delta.unitsSold,
				delta.orderCount,
				delta.gmvAmount,
				delta.netSalesAmount,
			],
		);
	}

	async upsertCustomerLtvDelta(
		delta: CustomerLtvDelta,
		transaction: TransactionContext,
	): Promise<void> {
		await getPgClient(transaction).query(
			`
        INSERT INTO customer_ltv_stats (
          scope_type,
          scope_key,
          site_id,
          vertical_id,
          brand_id,
          customer_identity_type,
          customer_identity_key,
          user_id,
          guest_token,
          currency,
          first_order_at,
          last_order_at,
          order_count,
          gross_sales_amount,
          net_sales_amount
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12, $13, $14)
        ON CONFLICT (scope_type, scope_key, customer_identity_type, customer_identity_key, currency)
        DO UPDATE SET
          first_order_at = LEAST(customer_ltv_stats.first_order_at, EXCLUDED.first_order_at),
          last_order_at = GREATEST(customer_ltv_stats.last_order_at, EXCLUDED.last_order_at),
          order_count = customer_ltv_stats.order_count + EXCLUDED.order_count,
          gross_sales_amount = customer_ltv_stats.gross_sales_amount + EXCLUDED.gross_sales_amount,
          net_sales_amount = customer_ltv_stats.net_sales_amount + EXCLUDED.net_sales_amount,
          updated_at = now()
      `,
			[
				...scopeParams(delta),
				delta.customerIdentityType,
				delta.customerIdentityKey,
				delta.userId ?? null,
				delta.guestToken ?? null,
				delta.currency,
				delta.orderedAt,
				delta.orderCount,
				delta.grossSalesAmount,
				delta.netSalesAmount,
			],
		);
	}

	async listDailySalesStats(
		query: AnalyticsStatsQuery,
		access: AdminAccessContext,
	): Promise<DailySalesStatsRow[]> {
		const rows = await this.queryStats<DailySalesStatsDbRow>({
			tableName: "daily_sales_stats",
			query,
			access,
			orderBy: "stat_date DESC, scope_type ASC, scope_key ASC",
		});

		return rows.map(mapDailySales);
	}

	async listChannelPerformanceStats(
		query: AnalyticsStatsQuery,
		access: AdminAccessContext,
	): Promise<ChannelPerformanceStatsRow[]> {
		const rows = await this.queryStats<ChannelPerformanceStatsDbRow>({
			tableName: "channel_performance_stats",
			query,
			access,
			orderBy: "stat_date DESC, order_count DESC, channel_code ASC",
		});

		return rows.map(mapChannelPerformance);
	}

	async listProductPerformanceStats(
		query: AnalyticsStatsQuery,
		access: AdminAccessContext,
	): Promise<ProductPerformanceStatsRow[]> {
		const rows = await this.queryStats<ProductPerformanceStatsDbRow>({
			tableName: "product_performance_stats",
			query,
			access,
			orderBy: "stat_date DESC, gmv_amount DESC, product_id ASC, sku_id ASC",
		});

		return rows.map(mapProductPerformance);
	}

	async listCustomerLtvStats(
		query: AnalyticsStatsQuery,
		access: AdminAccessContext,
	): Promise<CustomerLtvStatsRow[]> {
		const adminPredicate = buildAdminStatsPredicate(access.scopes, "stats");
		const filterPredicate = buildCustomerFilters(
			query,
			"stats",
			adminPredicate.params.length + 1,
		);
		const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
		const limitPlaceholder = `$${adminPredicate.params.length + filterPredicate.params.length + 1}`;
		const result = await this.pool.getPool().query<CustomerLtvStatsDbRow>(
			`
        SELECT *
        FROM customer_ltv_stats stats
        WHERE ${adminPredicate.sql}
          AND ${filterPredicate.sql}
        ORDER BY net_sales_amount DESC, order_count DESC, last_order_at DESC
        LIMIT ${limitPlaceholder}
      `,
			[...adminPredicate.params, ...filterPredicate.params, String(limit)],
		);

		return result.rows.map(mapCustomerLtv);
	}

	private async queryStats<TRow extends QueryResultRow>(input: {
		tableName:
			| "daily_sales_stats"
			| "channel_performance_stats"
			| "product_performance_stats";
		query: AnalyticsStatsQuery;
		access: AdminAccessContext;
		orderBy: string;
	}): Promise<TRow[]> {
		const adminPredicate = buildAdminStatsPredicate(input.access.scopes, "stats");
		const filterPredicate = buildStatsFilters(
			input.query,
			"stats",
			adminPredicate.params.length + 1,
		);
		const limit = Math.min(Math.max(input.query.limit ?? 50, 1), 200);
		const limitPlaceholder = `$${adminPredicate.params.length + filterPredicate.params.length + 1}`;
		const result = await this.pool.getPool().query<TRow>(
			`
        SELECT *
        FROM ${input.tableName} stats
        WHERE ${adminPredicate.sql}
          AND ${filterPredicate.sql}
        ORDER BY ${input.orderBy}
        LIMIT ${limitPlaceholder}
      `,
			[...adminPredicate.params, ...filterPredicate.params, String(limit)],
		);

		return result.rows;
	}
}
