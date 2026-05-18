import { describe, expect, it } from "vitest";
import { DomainRuleViolationError } from "../../common/domain/domain-errors.js";
import { FulfillmentWorkflowService } from "./fulfillment.service.js";

describe("FulfillmentWorkflowService", () => {
	const service = new FulfillmentWorkflowService();

	it("plans paid orders into confirmed and pending fulfillment", () => {
		const plan = service.planCreateFulfillment({
			orderStatus: "paid",
			paymentStatus: "paid",
			fulfillmentStatus: "unfulfilled",
		});

		expect(plan).toEqual({
			nextOrderStatus: "confirmed",
			nextFulfillmentStatus: "pending",
			fulfillmentOrderStatus: "pending",
		});
	});

	it("rejects unpaid orders before fulfillment creation", () => {
		expect(() =>
			service.planCreateFulfillment({
				orderStatus: "pending_payment",
				paymentStatus: "unpaid",
				fulfillmentStatus: "unfulfilled",
			}),
		).toThrow(DomainRuleViolationError);
	});

	it("plans shipment from confirmed pending to fulfilled shipped", () => {
		const plan = service.planShipFulfillment({
			orderStatus: "confirmed",
			fulfillmentStatus: "pending",
			fulfillmentOrderStatus: "pending",
		});

		expect(plan).toEqual({
			nextOrderStatus: "fulfilled",
			nextFulfillmentStatus: "shipped",
			nextFulfillmentOrderStatus: "shipped",
		});
	});

	it("plans delivery from fulfilled shipped to completed delivered", () => {
		const plan = service.planDeliverShipment({
			orderStatus: "fulfilled",
			fulfillmentStatus: "shipped",
			fulfillmentOrderStatus: "shipped",
		});

		expect(plan).toEqual({
			nextOrderStatus: "completed",
			nextFulfillmentStatus: "delivered",
			nextFulfillmentOrderStatus: "delivered",
		});
	});
});
