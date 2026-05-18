import { Injectable } from "@nestjs/common";
import type { OrderCreatedPayload, OrderPaidPayload } from "@cross-border/shared";
import { assertDomainRule } from "../../common/domain/domain-errors.js";
import { assertIdempotencyKey } from "../../common/idempotency/assert-idempotency-key.js";
import {
	assertOrderTotal,
	assertSameCurrency,
	parseMoneyToMinorUnits,
} from "../../common/money/money.js";
import {
	assertFulfillmentStatusTransition,
	assertOrderStatusTransition,
	assertPaymentStatusTransition,
} from "./order-state-machine.js";
import type {
	CreateOrderWorkflowInput,
	CreateOrderWorkflowPlan,
	FulfillmentTransitionInput,
	PaymentSucceededOrderInput,
	PaymentSucceededOrderPlan,
} from "./order.types.js";

@Injectable()
export class OrderWorkflowService {
	planCreateOrder(input: CreateOrderWorkflowInput): CreateOrderWorkflowPlan {
		assertIdempotencyKey(input.idempotencyKey);
		assertDomainRule(
			Boolean(input.userId) || Boolean(input.guestToken),
			"ORDER_BUYER_REQUIRED",
			"Order requires a user id or guest token.",
		);
		assertDomainRule(
			input.itemCount > 0,
			"ORDER_ITEMS_REQUIRED",
			"Order requires at least one item.",
		);
		assertOrderTotal(input);

		const payload: OrderCreatedPayload = {
			orderId: input.orderId,
			orderNo: input.orderNo,
			...(input.userId ? { userId: input.userId } : {}),
			...(input.guestToken ? { guestToken: input.guestToken } : {}),
			totalAmount: input.totalAmount,
			currency: input.currency,
		};

		return {
			initialOrderStatus: "pending_payment",
			initialPaymentStatus: "unpaid",
			initialFulfillmentStatus: "unfulfilled",
			statusLog: {
				statusType: "order",
				fromStatus: null,
				toStatus: "pending_payment",
				reason: "order_created",
				operatorType: input.userId ? "user" : "system",
			},
			events: [
				{
					eventType: "OrderCreated",
					aggregateType: "order",
					aggregateId: input.orderId,
					payload,
				},
			],
		};
	}

	planPaymentSucceeded(
		input: PaymentSucceededOrderInput,
	): PaymentSucceededOrderPlan {
		assertSameCurrency(
			{ amount: input.orderTotalAmount, currency: input.orderCurrency },
			{ amount: input.paidAmount, currency: input.paidCurrency },
		);
		assertDomainRule(
			parseMoneyToMinorUnits(input.orderTotalAmount) ===
				parseMoneyToMinorUnits(input.paidAmount),
			"ORDER_PAYMENT_AMOUNT_MISMATCH",
			"Paid amount must equal order total amount.",
		);
		assertDomainRule(
			input.currentPaymentStatus !== "paid",
			"ORDER_ALREADY_PAID",
			"Order payment has already been marked as paid.",
		);

		const fromOrderStatus = input.currentOrderStatus;
		const fromPaymentStatus = input.currentPaymentStatus;
		const nextOrderStatus = "paid";
		const nextPaymentStatus = "paid";

		if (fromOrderStatus !== nextOrderStatus) {
			assertOrderStatusTransition(fromOrderStatus, nextOrderStatus);
		}

		assertPaymentStatusTransition(fromPaymentStatus, nextPaymentStatus);

		const payload: OrderPaidPayload = {
			orderId: input.orderId,
			paymentOrderId: input.paymentOrderId,
			amount: input.paidAmount,
			currency: input.paidCurrency,
		};

		return {
			nextOrderStatus,
			nextPaymentStatus,
			statusLogs: [
				{
					statusType: "order",
					fromStatus: fromOrderStatus,
					toStatus: nextOrderStatus,
					reason: "payment_succeeded",
					operatorType: "system",
				},
				{
					statusType: "payment",
					fromStatus: fromPaymentStatus,
					toStatus: nextPaymentStatus,
					reason: "payment_succeeded",
					operatorType: "system",
				},
			],
			events: [
				{
					eventType: "OrderPaid",
					aggregateType: "order",
					aggregateId: input.orderId,
					payload,
				},
			],
		};
	}

	planFulfillmentTransition(input: FulfillmentTransitionInput): {
		nextFulfillmentStatus: typeof input.toStatus;
	} {
		assertFulfillmentStatusTransition(input.fromStatus, input.toStatus);

		return {
			nextFulfillmentStatus: input.toStatus,
		};
	}
}
