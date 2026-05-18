import { describe, expect, it, vi } from "vitest";
import type { TransactionContext } from "../../../common/application/application-ports.js";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import { PgAnalyticsRepository } from "./pg-analytics.repository.js";

function createTransaction(
	queryImpl: (sql: string, params?: unknown[]) => Promise<unknown>,
) {
	const query = vi.fn(queryImpl);

	return {
		query,
		transaction: {
			transactionId: Symbol("test"),
			client: { query },
		} as unknown as TransactionContext,
	};
}

function createRepository(queryImpl: (sql: string, params?: unknown[]) => Promise<unknown>) {
	const poolQuery = vi.fn(queryImpl);
	const repository = new PgAnalyticsRepository({
		getPool: () => ({
			query: poolQuery,
		}),
	} as never);

	return {
		poolQuery,
		repository,
	};
}

describe("PgAnalyticsRepository", () => {
	it("claims pending OrderPaid events with row locking", async () => {
		const { query, transaction } = createTransaction(async () => ({
			rows: [{ id: "event-1" }, { id: "event-2" }],
			rowCount: 2,
		}));
		const repository = new PgAnalyticsRepository({} as never);

		const result = await repository.claimPendingOrderPaidEvents({
			limit: 2,
			transaction,
		});

		expect(result).toEqual(["event-1", "event-2"]);
		expect(query.mock.calls[0]?.[0]).toContain("event_type = 'OrderPaid'");
		expect(query.mock.calls[0]?.[0]).toContain("FOR UPDATE SKIP LOCKED");
		expect(query.mock.calls[0]?.[0]).toContain("status = 'processing'");
	});

	it("inserts analytics events with site dimensions and idempotency key", async () => {
		const { query, transaction } = createTransaction(async () => ({
			rows: [{ id: "analytics-event-1" }],
			rowCount: 1,
		}));
		const repository = new PgAnalyticsRepository({} as never);

		const inserted = await repository.appendAnalyticsEventIfNew(
			{
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				eventType: "OrderPaid",
				subjectType: "order",
				subjectId: "order-1",
				orderId: "order-1",
				channelCode: "stripe",
				currency: "USD",
				amount: "100.00",
				properties: { sourceEventId: "event-1" },
				idempotencyKey: "domain-event:event-1:order-paid",
				occurredAt: "2026-05-16T01:00:00.000Z",
			},
			transaction,
		);

		expect(inserted).toBe(true);
		expect(query.mock.calls[0]?.[0]).toContain("ON CONFLICT (idempotency_key)");
		expect(query.mock.calls[0]?.[1]?.slice(0, 3)).toEqual([
			defaultSiteContext.siteId,
			defaultSiteContext.verticalId,
			defaultSiteContext.brandId,
		]);
	});

	it("marks projected domain events processed or retryable failed", async () => {
		const { query, transaction } = createTransaction(async () => ({
			rows: [],
			rowCount: 1,
		}));
		const repository = new PgAnalyticsRepository({} as never);

		await repository.markDomainEventProcessed("event-1", transaction);
		await repository.markDomainEventFailed(
			{
				eventId: "event-2",
				maxRetryCount: 5,
				retryDelaySeconds: 60,
			},
			transaction,
		);

		expect(query.mock.calls[0]?.[0]).toContain("status = 'processed'");
		expect(query.mock.calls[1]?.[0]).toContain("retry_count = retry_count + 1");
		expect(query.mock.calls[1]?.[0]).toContain("'dead_letter'");
		expect(query.mock.calls[1]?.[1]).toEqual(["event-2", 5, 60]);
	});

	it("upserts daily sales deltas by date, scope and currency", async () => {
		const { query, transaction } = createTransaction(async () => ({
			rows: [],
			rowCount: 1,
		}));
		const repository = new PgAnalyticsRepository({} as never);

		await repository.upsertDailySalesDelta(
			{
				scopeType: "site",
				scopeKey: defaultSiteContext.siteId,
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				statDate: "2026-05-16",
				currency: "USD",
				gmvAmount: "100.00",
				netSalesAmount: "100.00",
				orderCount: 1,
				paidOrderCount: 1,
			},
			transaction,
		);

		expect(query.mock.calls[0]?.[0]).toContain(
			"ON CONFLICT (stat_date, scope_type, scope_key, currency)",
		);
		expect(query.mock.calls[0]?.[1]).toEqual([
			"2026-05-16",
			"site",
			defaultSiteContext.siteId,
			defaultSiteContext.siteId,
			defaultSiteContext.verticalId,
			defaultSiteContext.brandId,
			"USD",
			"100.00",
			"100.00",
			1,
			1,
		]);
	});

	it("applies admin scope predicates when listing stats", async () => {
		const { poolQuery, repository } = createRepository(async () => ({
			rows: [],
			rowCount: 0,
		}));

		await repository.listDailySalesStats(
			{
				scopeType: "site",
				scopeId: defaultSiteContext.siteId,
				currency: "USD",
				from: "2026-05-01",
				to: "2026-05-16",
				limit: 10,
			},
			{
				source: "database",
				adminUserId: "admin-1",
				scopes: [
					{
						scopeType: "vertical",
						scopeId: defaultSiteContext.verticalId,
					},
				],
			},
		);

		expect(poolQuery.mock.calls[0]?.[0]).toContain("stats.vertical_id = $1");
		expect(poolQuery.mock.calls[0]?.[0]).toContain("stats.scope_type = $2");
		expect(poolQuery.mock.calls[0]?.[0]).toContain("stats.scope_key = $3");
		expect(poolQuery.mock.calls[0]?.[1]).toEqual([
			defaultSiteContext.verticalId,
			"site",
			defaultSiteContext.siteId,
			"USD",
			"2026-05-01",
			"2026-05-16",
			"10",
		]);
	});
});
