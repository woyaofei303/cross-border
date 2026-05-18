import { describe, expect, it } from "vitest";
import {
	buildAfterSalesRequestItems,
	getAfterSalesBlockedReason,
	getAfterSalesTypeLabel,
	isStorefrontAfterSalesEligible,
	toAfterSalesAmount,
} from "@/lib/storefront-aftersales";
import type {
	StorefrontOrderDetail,
	StorefrontOrderItem,
} from "@/lib/storefront-orders";

const item: StorefrontOrderItem = {
	orderItemId: "order-item-1",
	productId: "product-1",
	skuId: "sku-1",
	skuCode: "SKU-1",
	productTitle: "Demo item",
	unitPrice: "20.00",
	quantity: 2,
	discountAmount: "0.00",
	totalAmount: "40.00",
	snapshot: {},
};

function order(
	overrides: Partial<StorefrontOrderDetail> = {},
): StorefrontOrderDetail {
	return {
		orderId: "order-1",
		orderNo: "CB1",
		siteId: "site-1",
		verticalId: "vertical-1",
		brandId: "brand-1",
		orderStatus: "paid",
		paymentStatus: "paid",
		fulfillmentStatus: "unfulfilled",
		aftersalesStatus: "none",
		currency: "USD",
		subtotalAmount: "40.00",
		discountAmount: "0.00",
		shippingAmount: "0.00",
		taxAmount: "0.00",
		totalAmount: "40.00",
		createdAt: "2026-05-16T00:00:00.000Z",
		updatedAt: "2026-05-16T00:00:00.000Z",
		shippingAddressSnapshot: {},
		priceSnapshot: {},
		items: [item],
		shipments: [],
		...overrides,
	};
}

describe("storefront after-sales helpers", () => {
	it("allows paid orders with no open after-sales request", () => {
		expect(isStorefrontAfterSalesEligible(order())).toBe(true);
		expect(getAfterSalesBlockedReason(order())).toBe("");
	});

	it("blocks unpaid orders and open after-sales requests", () => {
		expect(
			isStorefrontAfterSalesEligible(order({ paymentStatus: "unpaid" })),
		).toBe(false);
		expect(getAfterSalesBlockedReason(order({ paymentStatus: "unpaid" }))).toBe(
			"After-sales requests are available after payment is confirmed.",
		);
		expect(
			isStorefrontAfterSalesEligible(order({ aftersalesStatus: "requested" })),
		).toBe(false);
		expect(
			getAfterSalesBlockedReason(order({ aftersalesStatus: "requested" })),
		).toBe("An after-sales request is already in progress for this order.");
	});

	it("builds bounded item quantities for request payloads", () => {
		expect(
			buildAfterSalesRequestItems({
				items: [item],
				selectedItemIds: new Set([item.orderItemId]),
				quantityByItemId: { [item.orderItemId]: 10 },
			}),
		).toEqual([
			{
				orderItemId: item.orderItemId,
				quantity: 2,
				requestedAmount: "40.00",
			},
		]);
	});

	it("formats labels and amount fallbacks", () => {
		expect(getAfterSalesTypeLabel("refund_only")).toBe("Refund only");
		expect(getAfterSalesTypeLabel("return_refund")).toBe("Return and refund");
		expect(toAfterSalesAmount("invalid")).toBe("0.00");
		expect(toAfterSalesAmount(12)).toBe("12.00");
	});
});
