import type {
	DomainEventType,
	PaymentOrderStatus,
	PaymentTransactionType,
} from "@cross-border/shared";
import type { SiteDimensions } from "../../common/site/site-context.js";

export type PaymentProvider = "stripe" | "paypal" | string;

export type DomainEventDraft<TPayload> = Partial<SiteDimensions> & {
	eventType: DomainEventType;
	aggregateType: string;
	aggregateId: string;
	payload: TPayload;
};

export type CreatePaymentOrderInput = {
	orderId: string;
	paymentOrderId: string;
	paymentNo: string;
	channelCode: PaymentProvider;
	amount: string;
	currency: string;
	idempotencyKey: string;
};

export type CreatePaymentOrderPlan = {
	status: PaymentOrderStatus;
	paymentOrder: {
		id: string;
		orderId: string;
		paymentNo: string;
		channelCode: PaymentProvider;
		amount: string;
		currency: string;
		idempotencyKey: string;
	};
};

export type ReceivePaymentWebhookInput = {
	channelCode: PaymentProvider;
	providerEventId: string;
	eventType: string;
	providerObjectId?: string;
	signatureHeader?: string;
	rawPayload: Record<string, unknown>;
};

export type PaymentWebhookReceiptPlan = {
	dedupeKey: {
		channelCode: PaymentProvider;
		providerEventId: string;
	};
	status: "received";
	webhookEvent: {
		channelCode: PaymentProvider;
		providerEventId: string;
		eventType: string;
		providerObjectId?: string;
		signatureHeader?: string;
		rawPayload: Record<string, unknown>;
	};
};

export type ProcessPaymentWebhookInput = SiteDimensions & {
	paymentOrderId: string;
	orderId: string;
	currentPaymentOrderStatus: PaymentOrderStatus;
	channelCode: PaymentProvider;
	providerEventId: string;
	providerTransactionId: string;
	eventType: string;
	amount: string;
	currency: string;
	expectedAmount: string;
	expectedCurrency: string;
	rawPayload: Record<string, unknown>;
};

export type ProcessPaymentWebhookPlan = {
	nextPaymentOrderStatus: PaymentOrderStatus;
	transaction: {
		paymentOrderId: string;
		channelCode: PaymentProvider;
		providerTransactionId: string;
		transactionType: PaymentTransactionType;
		status: "succeeded" | "failed";
		amount: string;
		currency: string;
		rawPayload: Record<string, unknown>;
	} & SiteDimensions;
	events: DomainEventDraft<Record<string, unknown>>[];
};
