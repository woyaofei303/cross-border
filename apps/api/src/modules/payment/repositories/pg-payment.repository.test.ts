import { describe, expect, it, vi } from "vitest";
import type { TransactionContext } from "../../../common/application/application-ports.js";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import { PgPaymentRepository } from "./pg-payment.repository.js";

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

describe("PgPaymentRepository", () => {
	it("creates payment orders with site dimensions inherited from the order", async () => {
		const { query, transaction } = createTransaction(async () => ({
			rows: [
				{
					id: "pay-1",
					payment_no: "PAY202605160001",
					order_id: "order-1",
					channel_code: "stripe",
					status: "created",
					amount: "100.00",
					currency: "USD",
					idempotency_key: "pay-order-1",
					provider_payment_id: null,
					site_id: "00000000-0000-4000-8000-000000000301",
					vertical_id: "00000000-0000-4000-8000-000000000101",
					brand_id: "00000000-0000-4000-8000-000000000201",
				},
			],
			rowCount: 1,
		}));
		const repository = new PgPaymentRepository();

		const result = await repository.createPaymentOrder(
			{
				status: "created",
				paymentOrder: {
					id: "pay-1",
					orderId: "order-1",
					paymentNo: "PAY202605160001",
					channelCode: "stripe",
					amount: "100.00",
					currency: "USD",
					idempotencyKey: "pay-order-1",
				},
			},
			transaction,
		);

		expect(result).toMatchObject({
			paymentOrderId: "pay-1",
			siteId: "00000000-0000-4000-8000-000000000301",
			verticalId: "00000000-0000-4000-8000-000000000101",
			brandId: "00000000-0000-4000-8000-000000000201",
		});
		expect(query.mock.calls[0]?.[0]).toContain("orders.site_id");
		expect(query.mock.calls[0]?.[0]).toContain("orders.vertical_id");
		expect(query.mock.calls[0]?.[0]).toContain("orders.brand_id");
	});

	it("inserts webhook events with provider event id de-duplication", async () => {
		const { query, transaction } = createTransaction(async () => ({
			rows: [{ id: "webhook-1" }],
			rowCount: 1,
		}));
		const repository = new PgPaymentRepository();

		const result = await repository.insertWebhookIfNew(
			{
				dedupeKey: {
					channelCode: "stripe",
					providerEventId: "evt_1",
				},
				status: "received",
				webhookEvent: {
					channelCode: "stripe",
					providerEventId: "evt_1",
					eventType: "payment_intent.succeeded",
					providerObjectId: "pi_1",
					rawPayload: { id: "evt_1" },
				},
			},
			transaction,
		);

		expect(result).toEqual({
			inserted: true,
			webhookEventId: "webhook-1",
		});
		expect(query.mock.calls[0]?.[0]).toContain(
			"ON CONFLICT (channel_code, provider_event_id)",
		);
		expect(query.mock.calls[0]?.[0]).toContain("matched_payment_order");
		expect(query.mock.calls[0]?.[0]).toContain("site_id");
	});

	it("returns the existing webhook id when provider event id already exists", async () => {
		const { query, transaction } = createTransaction(async (sql) => {
			if (sql.includes("DO NOTHING")) {
				return { rows: [], rowCount: 0 };
			}

			return { rows: [{ id: "webhook-existing" }], rowCount: 1 };
		});
		const repository = new PgPaymentRepository();

		const result = await repository.insertWebhookIfNew(
			{
				dedupeKey: {
					channelCode: "stripe",
					providerEventId: "evt_1",
				},
				status: "received",
				webhookEvent: {
					channelCode: "stripe",
					providerEventId: "evt_1",
					eventType: "payment_intent.succeeded",
					rawPayload: { id: "evt_1" },
				},
			},
			transaction,
		);

		expect(result).toEqual({
			inserted: false,
			webhookEventId: "webhook-existing",
		});
		expect(query).toHaveBeenCalledTimes(2);
	});

	it("lists admin payment orders with admin and selected scope predicates", async () => {
		const { query, transaction } = createTransaction(async () => ({
			rows: [
				{
					payment_order_id: "pay-1",
					payment_no: "PAY202605160001",
					order_id: "order-1",
					order_no: "CB202605160001",
					site_id: defaultSiteContext.siteId,
					vertical_id: defaultSiteContext.verticalId,
					brand_id: defaultSiteContext.brandId,
					channel_code: "stripe",
					status: "succeeded",
					amount: "100.00",
					currency: "USD",
					provider_payment_id: "pi_1",
					idempotency_key: "pay-order-1",
					transaction_count: 1,
					latest_webhook_event_id: "evt_1",
					latest_webhook_status: "processed",
					created_at: new Date("2026-05-16T00:00:00.000Z"),
					updated_at: new Date("2026-05-16T00:01:00.000Z"),
					succeeded_at: new Date("2026-05-16T00:02:00.000Z"),
					failed_at: null,
				},
			],
			rowCount: 1,
		}));
		const repository = new PgPaymentRepository();

		const result = await repository.listAdminPaymentOrders(
			{
				adminAccess: {
					source: "database",
					adminUserId: "admin-1",
					scopes: [{ scopeType: "site", scopeId: defaultSiteContext.siteId }],
				},
				selectedScope: {
					scopeType: "vertical",
					scopeId: defaultSiteContext.verticalId,
				},
				limit: 25,
			},
			transaction,
		);

		expect(result[0]).toMatchObject({
			paymentNo: "PAY202605160001",
			transactionCount: 1,
			latestWebhookEventId: "evt_1",
			latestWebhookStatus: "processed",
			siteId: defaultSiteContext.siteId,
		});
		expect(query.mock.calls[0]?.[0]).toContain("payment_orders.site_id = $1");
		expect(query.mock.calls[0]?.[0]).toContain(
			"payment_orders.vertical_id = $2",
		);
		expect(query.mock.calls[0]?.[0]).toContain("LIMIT $3");
	});

	it("lists admin payment webhooks with provider event dedupe visibility", async () => {
		const { query, transaction } = createTransaction(async () => ({
			rows: [
				{
					webhook_event_id: "webhook-1",
					payment_order_id: "pay-1",
					payment_no: "PAY202605160001",
					order_id: "order-1",
					order_no: "CB202605160001",
					site_id: defaultSiteContext.siteId,
					vertical_id: defaultSiteContext.verticalId,
					brand_id: defaultSiteContext.brandId,
					channel_code: "stripe",
					provider_event_id: "evt_duplicate",
					event_type: "payment_intent.succeeded",
					provider_object_id: "pi_1",
					duplicate_count: 1,
					status: "processed",
					error_message: null,
					received_at: new Date("2026-05-16T00:00:00.000Z"),
					processed_at: new Date("2026-05-16T00:01:00.000Z"),
				},
			],
			rowCount: 1,
		}));
		const repository = new PgPaymentRepository();

		const result = await repository.listAdminPaymentWebhooks(
			{
				adminAccess: {
					source: "database",
					adminUserId: "admin-1",
					scopes: [{ scopeType: "site", scopeId: defaultSiteContext.siteId }],
				},
				limit: 10,
			},
			transaction,
		);

		expect(result[0]).toMatchObject({
			providerEventId: "evt_duplicate",
			eventType: "payment_intent.succeeded",
			dedupeKey: "stripe:evt_duplicate",
			status: "processed",
			duplicateCount: 1,
		});
		expect(query.mock.calls[0]?.[0]).toContain(
			"PARTITION BY payment_webhook_events.channel_code",
		);
		expect(query.mock.calls[0]?.[0]).toContain(
			"payment_webhook_events.provider_event_id",
		);
		expect(query.mock.calls[0]?.[0]).toContain(
			"payment_webhook_events.site_id = $1",
		);
	});
});
