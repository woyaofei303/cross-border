import type {
	DomainEventType,
	FulfillmentStatus,
	OrderStatus,
	PaymentStatus,
} from "@cross-border/shared";

export type DomainEventDraft<TPayload extends Record<string, unknown>> = {
	eventType: DomainEventType;
	aggregateType: string;
	aggregateId: string;
	payload: TPayload;
};

export type OrderMoneyInput = {
	currency: string;
	subtotalAmount: string;
	discountAmount: string;
	shippingAmount: string;
	taxAmount: string;
	totalAmount: string;
};

export type CreateOrderWorkflowInput = OrderMoneyInput & {
	orderId: string;
	orderNo: string;
	userId?: string;
	guestToken?: string;
	idempotencyKey: string;
	itemCount: number;
};

export type CreateOrderWorkflowPlan = {
	initialOrderStatus: OrderStatus;
	initialPaymentStatus: PaymentStatus;
	initialFulfillmentStatus: FulfillmentStatus;
	statusLog: {
		statusType: "order";
		fromStatus: null;
		toStatus: OrderStatus;
		reason: string;
		operatorType: "user" | "system";
	};
	events: DomainEventDraft<Record<string, unknown>>[];
};

export type PaymentSucceededOrderInput = {
	orderId: string;
	paymentOrderId: string;
	currentOrderStatus: OrderStatus;
	currentPaymentStatus: PaymentStatus;
	orderTotalAmount: string;
	orderCurrency: string;
	paidAmount: string;
	paidCurrency: string;
};

export type PaymentSucceededOrderPlan = {
	nextOrderStatus: OrderStatus;
	nextPaymentStatus: PaymentStatus;
	statusLogs: Array<{
		statusType: "order" | "payment";
		fromStatus: string;
		toStatus: string;
		reason: string;
		operatorType: "system";
	}>;
	events: DomainEventDraft<Record<string, unknown>>[];
};

export type FulfillmentTransitionInput = {
	orderId: string;
	fromStatus: FulfillmentStatus;
	toStatus: FulfillmentStatus;
	reason: string;
};
