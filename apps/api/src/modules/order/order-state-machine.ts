import type {
	FulfillmentStatus,
	OrderStatus,
	PaymentStatus,
} from "@cross-border/shared";
import { assertDomainRule } from "../../common/domain/domain-errors.js";

const orderTransitions: Record<OrderStatus, readonly OrderStatus[]> = {
	pending_payment: ["payment_processing", "paid", "cancelled", "closed"],
	payment_processing: ["paid", "cancelled", "closed"],
	paid: ["confirmed", "cancelled"],
	confirmed: ["partially_fulfilled", "fulfilled"],
	partially_fulfilled: ["fulfilled"],
	fulfilled: ["completed"],
	completed: [],
	cancelled: [],
	closed: [],
};

const paymentTransitions: Record<PaymentStatus, readonly PaymentStatus[]> = {
	unpaid: ["processing", "paid", "failed"],
	processing: ["paid", "failed"],
	paid: ["partially_refunded", "refunded", "chargeback"],
	partially_refunded: ["refunded", "chargeback"],
	failed: [],
	refunded: [],
	chargeback: [],
};

const fulfillmentTransitions: Record<FulfillmentStatus, readonly FulfillmentStatus[]> = {
	unfulfilled: ["pending"],
	pending: ["partially_shipped", "shipped", "failed"],
	partially_shipped: ["shipped"],
	shipped: ["delivered"],
	delivered: [],
	failed: [],
};

export function assertOrderStatusTransition(
	fromStatus: OrderStatus,
	toStatus: OrderStatus,
): void {
	assertDomainRule(
		orderTransitions[fromStatus].includes(toStatus),
		"ORDER_STATUS_TRANSITION_NOT_ALLOWED",
		`Order status cannot transition from ${fromStatus} to ${toStatus}.`,
	);
}

export function assertPaymentStatusTransition(
	fromStatus: PaymentStatus,
	toStatus: PaymentStatus,
): void {
	assertDomainRule(
		paymentTransitions[fromStatus].includes(toStatus),
		"PAYMENT_STATUS_TRANSITION_NOT_ALLOWED",
		`Payment status cannot transition from ${fromStatus} to ${toStatus}.`,
	);
}

export function assertFulfillmentStatusTransition(
	fromStatus: FulfillmentStatus,
	toStatus: FulfillmentStatus,
): void {
	assertDomainRule(
		fulfillmentTransitions[fromStatus].includes(toStatus),
		"FULFILLMENT_STATUS_TRANSITION_NOT_ALLOWED",
		`Fulfillment status cannot transition from ${fromStatus} to ${toStatus}.`,
	);
}
