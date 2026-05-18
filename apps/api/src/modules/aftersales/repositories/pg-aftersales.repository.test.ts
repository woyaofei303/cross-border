import { describe, expect, it, vi } from "vitest";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import { PgAfterSalesRepository } from "./pg-aftersales.repository.js";

function createRepository() {
	const query = vi.fn(async (sql: string, _params?: unknown[]) => {
		if (sql.includes("FROM after_sales_requests") && sql.includes("JOIN orders")) {
			return {
				rows: [
					{
						id: "request-1",
						request_no: "R1",
						order_id: "order-1",
						status: "requested",
						requested_amount: "20.00",
						approved_amount: null,
						site_id: defaultSiteContext.siteId,
						vertical_id: defaultSiteContext.verticalId,
						brand_id: defaultSiteContext.brandId,
						type: "refund_only",
						reason: "Wrong size",
						payment_order_id: "payment-order-1",
						payment_status: "paid",
						order_aftersales_status: "requested",
						currency: "USD",
						order_total_amount: "100.00",
						already_refunded_amount: "0.00",
					},
				],
				rowCount: 1,
			};
		}

		if (sql.includes("INSERT INTO payment_refunds")) {
			return {
				rows: [
					{
						id: "refund-1",
						refund_no: "RF1",
						after_sales_request_id: "request-1",
						payment_order_id: "payment-order-1",
						order_id: "order-1",
						status: "requested",
						amount: "20.00",
						currency: "USD",
						idempotency_key: "approve-key",
						provider_refund_id: null,
						site_id: defaultSiteContext.siteId,
						vertical_id: defaultSiteContext.verticalId,
						brand_id: defaultSiteContext.brandId,
					},
				],
				rowCount: 1,
			};
		}

		return {
			rows: [],
			rowCount: 1,
		};
	});

	return {
		query,
		repository: new PgAfterSalesRepository(),
		transaction: {
			transactionId: Symbol("test"),
			client: {
				query,
			},
		} as never,
	};
}

describe("PgAfterSalesRepository", () => {
	it("loads approval snapshots with latest succeeded payment order and refund totals", async () => {
		const { query, repository, transaction } = createRepository();

		const snapshot = await repository.getApprovalSnapshotForUpdate(
			"request-1",
			transaction,
		);

		expect(snapshot).toMatchObject({
			requestId: "request-1",
			paymentOrderId: "payment-order-1",
			alreadyRefundedAmount: "0.00",
			siteId: defaultSiteContext.siteId,
		});
		expect(query.mock.calls[0]?.[0]).toContain(
			"payment_orders.status = 'succeeded'",
		);
		expect(query.mock.calls[0]?.[0]).toContain(
			"payment_refunds.status = 'succeeded'",
		);
		expect(query.mock.calls[0]?.[0]).toContain(
			"FOR UPDATE OF after_sales_requests, orders",
		);
	});

	it("creates payment refunds linked to after-sales requests", async () => {
		const { query, repository, transaction } = createRepository();

		const refund = await repository.approveRefundRequest(
			{
				requestId: "request-1",
				fromRequestStatus: "requested",
				fromOrderAftersalesStatus: "requested",
				toRequestStatus: "refunding",
				refund: {
					refundId: "refund-1",
					refundNo: "RF1",
					requestId: "request-1",
					paymentOrderId: "payment-order-1",
					orderId: "order-1",
					...defaultSiteContext,
					status: "requested",
					amount: "20.00",
					currency: "USD",
					reason: "Wrong size",
					idempotencyKey: "approve-key",
					requestPayload: { afterSalesRequestId: "request-1" },
				},
			},
			transaction,
		);

		expect(refund).toMatchObject({
			refundId: "refund-1",
			requestId: "request-1",
			status: "requested",
		});
		expect(query.mock.calls[2]?.[0]).toContain("after_sales_request_id");
		expect(query.mock.calls[2]?.[1]?.[4]).toBe("request-1");
	});
});
