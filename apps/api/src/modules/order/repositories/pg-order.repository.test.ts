import { describe, expect, it, vi } from "vitest";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import { PgOrderRepository } from "./pg-order.repository.js";

function createRepository(rows: unknown[] = []) {
	const query = vi.fn(async (_sql: string, _params?: unknown[]) => ({
		rows,
		rowCount: rows.length,
	}));
	const repository = new PgOrderRepository();
	const transaction = {
		transactionId: Symbol("test"),
		client: { query },
	};

	return {
		query,
		repository,
		transaction,
	};
}

describe("PgOrderRepository admin reads", () => {
	it("lists orders inside admin and selected site scopes", async () => {
		const { query, repository, transaction } = createRepository([
			{
				order_id: "order-1",
				order_no: "CB202605160001",
				user_id: null,
				guest_token: "guest-1",
				site_id: defaultSiteContext.siteId,
				vertical_id: defaultSiteContext.verticalId,
				brand_id: defaultSiteContext.brandId,
				order_status: "paid",
				payment_status: "paid",
				fulfillment_status: "unfulfilled",
				aftersales_status: "none",
				currency: "USD",
				total_amount: "100.00",
				item_count: 1,
				status_log_count: 2,
				created_at: new Date("2026-05-16T00:00:00.000Z"),
				updated_at: new Date("2026-05-16T00:00:00.000Z"),
				paid_at: new Date("2026-05-16T00:01:00.000Z"),
				cancelled_at: null,
				payment_order_id: "pay-1",
				payment_no: "PAY202605160001",
				payment_order_status: "succeeded",
				channel_code: "stripe",
			},
		]);

		const result = await repository.listAdminOrders(
			{
				adminAccess: {
					source: "database",
					adminUserId: "admin-1",
					scopes: [
						{ scopeType: "site", scopeId: defaultSiteContext.siteId },
					],
				},
				selectedScope: { scopeType: "site", scopeId: defaultSiteContext.siteId },
				limit: 20,
			},
			transaction as never,
		);

		expect(result[0]).toMatchObject({
			orderNo: "CB202605160001",
			siteId: defaultSiteContext.siteId,
			paymentStatus: "paid",
			statusLogCount: 2,
			latestPaymentOrder: {
				paymentNo: "PAY202605160001",
			},
		});
		expect(query.mock.calls[0]?.[0]).toContain("orders.site_id = $1");
		expect(query.mock.calls[0]?.[0]).toContain("orders.site_id = $2");
		expect(query.mock.calls[0]?.[1]).toEqual([
			defaultSiteContext.siteId,
			defaultSiteContext.siteId,
			20,
		]);
	});

	it("applies admin scope to order detail lookup before loading related records", async () => {
		const { query, repository, transaction } = createRepository([]);

		await expect(
			repository.getAdminOrderDetail(
				{
					orderId: "order-out-of-scope",
					adminAccess: {
						source: "database",
						adminUserId: "admin-1",
						scopes: [
							{ scopeType: "site", scopeId: defaultSiteContext.siteId },
						],
					},
				},
				transaction as never,
			),
		).resolves.toBeNull();

		expect(query).toHaveBeenCalledTimes(1);
		expect(query.mock.calls[0]?.[0]).toContain("orders.id = $1");
		expect(query.mock.calls[0]?.[0]).toContain("orders.site_id = $2");
		expect(query.mock.calls[0]?.[1]).toEqual([
			"order-out-of-scope",
			defaultSiteContext.siteId,
		]);
	});
});
