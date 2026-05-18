import { describe, expect, it } from "vitest";
import { defaultSiteContext } from "../../common/site/site-context.js";
import { AnalyticsProjectionService } from "./analytics.service.js";

describe("AnalyticsProjectionService", () => {
	const service = new AnalyticsProjectionService();

	it("projects OrderPaid into global, vertical, brand and site stats", () => {
		const projection = service.planOrderPaidProjection({
			event: {
				id: "event-1",
				eventType: "OrderPaid",
				aggregateType: "order",
				aggregateId: "order-1",
				payload: {
					orderId: "order-1",
					paymentOrderId: "pay-1",
				},
				createdAt: "2026-05-16T01:00:00.000Z",
			},
			order: {
				orderId: "order-1",
				orderNo: "CB202605160001",
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				guestToken: "guest-1",
				currency: "USD",
				totalAmount: "100.00",
				paidAt: "2026-05-16T01:00:00.000Z",
				createdAt: "2026-05-16T00:59:00.000Z",
				channelCode: "stripe",
				items: [
					{
						productId: "product-1",
						skuId: "sku-1",
						quantity: 1,
						totalAmount: "40.00",
					},
					{
						productId: "product-1",
						skuId: "sku-1",
						quantity: 2,
						totalAmount: "60.00",
					},
				],
			},
		});

		expect(projection.analyticsEvent).toMatchObject({
			siteId: defaultSiteContext.siteId,
			eventType: "OrderPaid",
			orderId: "order-1",
			amount: "100.00",
			idempotencyKey: "domain-event:event-1:order-paid",
		});
		expect(projection.dailySales.map((delta) => delta.scopeType)).toEqual([
			"global",
			"vertical",
			"brand",
			"site",
		]);
		expect(projection.channelPerformance).toHaveLength(4);
		expect(projection.productPerformance).toHaveLength(4);
		expect(projection.productPerformance[0]).toMatchObject({
			productId: "product-1",
			skuId: "sku-1",
			unitsSold: 3,
			gmvAmount: "100.00",
		});
		expect(projection.customerLtv[3]).toMatchObject({
			scopeType: "site",
			scopeKey: defaultSiteContext.siteId,
			customerIdentityType: "guest",
			customerIdentityKey: "guest-1",
		});
	});
});
