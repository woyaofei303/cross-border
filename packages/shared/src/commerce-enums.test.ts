import { describe, expect, it } from "vitest";
import {
	afterSalesRequestTypes,
	afterSalesRequestStatuses,
	fulfillmentOrderStatuses,
	getPublicIdPrefix,
	inventoryLockStatuses,
	isOneOf,
	orderStatuses,
	paymentRefundStatuses,
	paymentStatuses,
	paymentWebhookStatuses,
	shipmentStatuses,
} from "./index.js";

describe("shared commerce contracts", () => {
	it("keeps high-risk status values explicit", () => {
		expect(isOneOf(orderStatuses, "paid")).toBe(true);
		expect(isOneOf(orderStatuses, "refunded")).toBe(false);
		expect(isOneOf(paymentStatuses, "refunded")).toBe(true);
		expect(isOneOf(paymentWebhookStatuses, "dead_letter")).toBe(true);
		expect(isOneOf(paymentRefundStatuses, "succeeded")).toBe(true);
		expect(isOneOf(inventoryLockStatuses, "deducted")).toBe(true);
		expect(isOneOf(fulfillmentOrderStatuses, "partially_shipped")).toBe(true);
		expect(isOneOf(shipmentStatuses, "delivered")).toBe(true);
		expect(isOneOf(afterSalesRequestTypes, "return_refund")).toBe(true);
		expect(isOneOf(afterSalesRequestStatuses, "refunding")).toBe(true);
	});

	it("keeps public id prefixes centralized", () => {
		expect(getPublicIdPrefix("order")).toBe("CB");
		expect(getPublicIdPrefix("payment")).toBe("PAY");
		expect(getPublicIdPrefix("afterSales")).toBe("AS");
	});
});
