import { Injectable } from "@nestjs/common";
import type {
	PaymentFailedPayload,
	PaymentSucceededPayload,
} from "@cross-border/shared";
import { assertDomainRule } from "../../common/domain/domain-errors.js";
import { assertIdempotencyKey } from "../../common/idempotency/assert-idempotency-key.js";
import {
	assertSameCurrency,
	parseMoneyToMinorUnits,
} from "../../common/money/money.js";
import { assertPaymentOrderStatusTransition } from "./payment-state-machine.js";
import type {
	CreatePaymentOrderInput,
	CreatePaymentOrderPlan,
	PaymentWebhookReceiptPlan,
	ProcessPaymentWebhookInput,
	ProcessPaymentWebhookPlan,
	ReceivePaymentWebhookInput,
} from "./payment.types.js";

const succeededProviderEvents = new Set([
	"payment_intent.succeeded",
	"checkout.session.completed",
	"PAYMENT.CAPTURE.COMPLETED",
]);

const failedProviderEvents = new Set([
	"payment_intent.payment_failed",
	"checkout.session.expired",
	"PAYMENT.CAPTURE.DENIED",
]);

export type PaymentWebhookOutcome = "succeeded" | "failed";

@Injectable()
export class PaymentWorkflowService {
	planCreatePaymentOrder(
		input: CreatePaymentOrderInput,
	): CreatePaymentOrderPlan {
		assertIdempotencyKey(input.idempotencyKey);
		assertDomainRule(
			parseMoneyToMinorUnits(input.amount) >= 0n,
			"PAYMENT_AMOUNT_NEGATIVE",
			"Payment amount cannot be negative.",
		);

		return {
			status: "created",
			paymentOrder: {
				id: input.paymentOrderId,
				orderId: input.orderId,
				paymentNo: input.paymentNo,
				channelCode: input.channelCode,
				amount: input.amount,
				currency: input.currency,
				idempotencyKey: input.idempotencyKey,
			},
		};
	}

	planReceiveWebhook(
		input: ReceivePaymentWebhookInput,
	): PaymentWebhookReceiptPlan {
		assertDomainRule(
			input.providerEventId.trim().length > 0,
			"PAYMENT_WEBHOOK_EVENT_ID_REQUIRED",
			"Payment webhook provider event id is required.",
		);
		assertDomainRule(
			input.eventType.trim().length > 0,
			"PAYMENT_WEBHOOK_EVENT_TYPE_REQUIRED",
			"Payment webhook event type is required.",
		);
		assertDomainRule(
			succeededProviderEvents.has(input.eventType) ||
				failedProviderEvents.has(input.eventType),
			"PAYMENT_WEBHOOK_EVENT_TYPE_UNSUPPORTED",
			`Unsupported payment webhook event type: ${input.eventType}`,
		);

		return {
			dedupeKey: {
				channelCode: input.channelCode,
				providerEventId: input.providerEventId,
			},
			status: "received",
			webhookEvent: {
				channelCode: input.channelCode,
				providerEventId: input.providerEventId,
				eventType: input.eventType,
				...(input.providerObjectId
					? { providerObjectId: input.providerObjectId }
					: {}),
				...(input.signatureHeader
					? { signatureHeader: input.signatureHeader }
					: {}),
				rawPayload: input.rawPayload,
			},
		};
	}

	planProcessWebhook(
		input: ProcessPaymentWebhookInput,
	): ProcessPaymentWebhookPlan {
		assertSameCurrency(
			{ amount: input.expectedAmount, currency: input.expectedCurrency },
			{ amount: input.amount, currency: input.currency },
		);
		assertDomainRule(
			parseMoneyToMinorUnits(input.expectedAmount) ===
				parseMoneyToMinorUnits(input.amount),
			"PAYMENT_WEBHOOK_AMOUNT_MISMATCH",
			"Payment webhook amount must match the local payment order.",
		);

		const outcome = this.getWebhookOutcome(input.eventType);
		const nextPaymentOrderStatus =
			outcome === "succeeded" ? "succeeded" : "failed";
		assertPaymentOrderStatusTransition(
			input.currentPaymentOrderStatus,
			nextPaymentOrderStatus,
		);

		if (outcome === "succeeded") {
			const payload: PaymentSucceededPayload = {
				paymentOrderId: input.paymentOrderId,
				orderId: input.orderId,
				amount: input.amount,
				currency: input.currency,
				providerTransactionId: input.providerTransactionId,
			};

			return {
				nextPaymentOrderStatus,
				transaction: {
					paymentOrderId: input.paymentOrderId,
					channelCode: input.channelCode,
					providerTransactionId: input.providerTransactionId,
					transactionType: "sale",
					status: "succeeded",
					amount: input.amount,
					currency: input.currency,
					rawPayload: input.rawPayload,
					siteId: input.siteId,
					verticalId: input.verticalId,
					brandId: input.brandId,
				},
				events: [
					{
						eventType: "PaymentSucceeded",
						aggregateType: "payment_order",
						aggregateId: input.paymentOrderId,
						siteId: input.siteId,
						verticalId: input.verticalId,
						brandId: input.brandId,
						payload,
					},
				],
			};
		}

		const payload: PaymentFailedPayload = {
			paymentOrderId: input.paymentOrderId,
			orderId: input.orderId,
			reason: input.eventType,
			providerTransactionId: input.providerTransactionId,
		};

		return {
			nextPaymentOrderStatus,
			transaction: {
				paymentOrderId: input.paymentOrderId,
				channelCode: input.channelCode,
				providerTransactionId: input.providerTransactionId,
				transactionType: "sale",
				status: "failed",
				amount: input.amount,
				currency: input.currency,
				rawPayload: input.rawPayload,
				siteId: input.siteId,
				verticalId: input.verticalId,
				brandId: input.brandId,
			},
			events: [
				{
					eventType: "PaymentFailed",
					aggregateType: "payment_order",
					aggregateId: input.paymentOrderId,
					siteId: input.siteId,
					verticalId: input.verticalId,
					brandId: input.brandId,
					payload,
				},
			],
		};
	}

	getWebhookOutcome(eventType: string): PaymentWebhookOutcome {
		if (succeededProviderEvents.has(eventType)) {
			return "succeeded";
		}

		if (failedProviderEvents.has(eventType)) {
			return "failed";
		}

		assertDomainRule(
			false,
			"PAYMENT_WEBHOOK_EVENT_TYPE_UNSUPPORTED",
			`Unsupported payment webhook event type: ${eventType}`,
		);
	}
}
