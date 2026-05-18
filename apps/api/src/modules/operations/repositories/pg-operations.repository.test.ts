import { describe, expect, it, vi } from "vitest";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import { PgOperationsRepository } from "./pg-operations.repository.js";

function createRepository() {
	const query = vi.fn(async (sql: string, _params?: unknown[]) => {
		if (sql.includes("FROM orders")) {
			return {
				rows: [
					{
						id: "order-1",
						order_no: "ORD1",
						site_id: defaultSiteContext.siteId,
						vertical_id: defaultSiteContext.verticalId,
						brand_id: defaultSiteContext.brandId,
						order_status: "paid",
						payment_status: "paid",
						fulfillment_status: "unfulfilled",
						aftersales_status: "none",
						currency: "USD",
						total_amount: "100.00",
						payment_no: "PAY1",
						payment_order_status: "succeeded",
						payment_channel_code: "stripe",
						item_count: 1,
						status_log_count: 2,
						created_at: new Date("2026-05-16T00:00:00.000Z"),
						updated_at: new Date("2026-05-16T00:00:00.000Z"),
						paid_at: new Date("2026-05-16T00:01:00.000Z"),
						cancelled_at: null,
					},
				],
				rowCount: 1,
			};
		}

		return {
			rows: [],
			rowCount: 0,
		};
	});
	const repository = new PgOperationsRepository({
		getPool: () => ({
			query,
		}),
	} as never);

	return {
		query,
		repository,
	};
}

describe("PgOperationsRepository", () => {
	it("lists scoped high-risk operations across orders, webhooks and inventory", async () => {
		const { query, repository } = createRepository();

		const result = await repository.listRiskDashboard(
			{ limit: 10 },
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

		expect(result.orders[0]).toMatchObject({
			orderNo: "ORD1",
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			paymentOrderStatus: "succeeded",
			statusLogCount: 2,
		});
		expect(query).toHaveBeenCalledTimes(7);
		for (const call of query.mock.calls.slice(0, 6)) {
			expect(call[0]).toContain("vertical_id = $1");
			expect(call[1]?.[0]).toBe(defaultSiteContext.verticalId);
			expect(call[1]?.[1]).toBe(10);
		}
		expect(query.mock.calls[6]?.[0]).toContain("audit_logs.vertical_id = $1");
		expect(query.mock.calls[6]?.[0]).toContain(
			"admin_operation_logs.vertical_id = $2",
		);
		expect(query.mock.calls[6]?.[1]).toEqual([
			defaultSiteContext.verticalId,
			defaultSiteContext.verticalId,
			10,
		]);
	});

	it("uses an unscoped predicate for global admins", async () => {
		const { query, repository } = createRepository();

		await repository.listRiskDashboard(
			{ limit: 5 },
			{
				source: "fallback",
				scopes: [{ scopeType: "global" }],
			},
		);

		expect(query.mock.calls[0]?.[0]).toContain("WHERE TRUE");
		expect(query.mock.calls[0]?.[1]).toEqual([5]);
	});
});
