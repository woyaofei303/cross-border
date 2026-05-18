import { describe, expect, it } from "vitest";
import { DomainRuleViolationError } from "../../common/domain/domain-errors.js";
import { OrderWorkflowService } from "./order.service.js";

describe("OrderWorkflowService", () => {
	const service = new OrderWorkflowService();

	it("plans order creation with immutable initial states and an outbox event", () => {
		const plan = service.planCreateOrder({
			orderId: "order-1",
			orderNo: "CB202605160001",
			userId: "user-1",
			idempotencyKey: "create-order-1",
			itemCount: 2,
			currency: "USD",
			subtotalAmount: "100.00",
			discountAmount: "10.00",
			shippingAmount: "5.00",
			taxAmount: "3.00",
			totalAmount: "98.00",
		});

		expect(plan.initialOrderStatus).toBe("pending_payment");
		expect(plan.initialPaymentStatus).toBe("unpaid");
		expect(plan.initialFulfillmentStatus).toBe("unfulfilled");
		expect(plan.events[0]).toMatchObject({
			eventType: "OrderCreated",
			aggregateType: "order",
			aggregateId: "order-1",
		});
	});

	it("rejects order creation without an idempotency key", () => {
		expect(() =>
			service.planCreateOrder({
				orderId: "order-1",
				orderNo: "CB202605160001",
				userId: "user-1",
				idempotencyKey: " ",
				itemCount: 1,
				currency: "USD",
				subtotalAmount: "10.00",
				discountAmount: "0.00",
				shippingAmount: "0.00",
				taxAmount: "0.00",
				totalAmount: "10.00",
			}),
		).toThrow(DomainRuleViolationError);
	});

	it("rejects mismatched payment amounts before marking an order paid", () => {
		expect(() =>
			service.planPaymentSucceeded({
				orderId: "order-1",
				paymentOrderId: "pay-1",
				currentOrderStatus: "payment_processing",
				currentPaymentStatus: "processing",
				orderTotalAmount: "100.00",
				orderCurrency: "USD",
				paidAmount: "99.99",
				paidCurrency: "USD",
			}),
		).toThrow(DomainRuleViolationError);
	});

	it("rejects fulfilled to cancelled order status transitions", () => {
		expect(() =>
			service.planPaymentSucceeded({
				orderId: "order-1",
				paymentOrderId: "pay-1",
				currentOrderStatus: "fulfilled",
				currentPaymentStatus: "processing",
				orderTotalAmount: "100.00",
				orderCurrency: "USD",
				paidAmount: "100.00",
				paidCurrency: "USD",
			}),
		).toThrow(DomainRuleViolationError);
	});

	it("plans payment success as order and payment status changes plus OrderPaid event", () => {
		const plan = service.planPaymentSucceeded({
			orderId: "order-1",
			paymentOrderId: "pay-1",
			currentOrderStatus: "payment_processing",
			currentPaymentStatus: "processing",
			orderTotalAmount: "100.00",
			orderCurrency: "USD",
			paidAmount: "100.00",
			paidCurrency: "USD",
		});

		expect(plan.nextOrderStatus).toBe("paid");
		expect(plan.nextPaymentStatus).toBe("paid");
		expect(plan.statusLogs).toHaveLength(2);
		expect(plan.events[0]?.eventType).toBe("OrderPaid");
	});

	it("allows a provider success webhook to pay an order still pending payment", () => {
		const plan = service.planPaymentSucceeded({
			orderId: "order-1",
			paymentOrderId: "pay-1",
			currentOrderStatus: "pending_payment",
			currentPaymentStatus: "unpaid",
			orderTotalAmount: "100.00",
			orderCurrency: "USD",
			paidAmount: "100.00",
			paidCurrency: "USD",
		});

		expect(plan.nextOrderStatus).toBe("paid");
		expect(plan.nextPaymentStatus).toBe("paid");
		expect(plan.statusLogs).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					statusType: "order",
					fromStatus: "pending_payment",
					toStatus: "paid",
				}),
				expect.objectContaining({
					statusType: "payment",
					fromStatus: "unpaid",
					toStatus: "paid",
				}),
			]),
		);
	});
});
