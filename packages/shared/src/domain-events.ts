export const domainEventTypes = [
	"UserRegistered",
	"ProductPublished",
	"CartAbandoned",
	"OrderCreated",
	"OrderCancelled",
	"OrderPaid",
	"PaymentSucceeded",
	"PaymentFailed",
	"InventoryLocked",
	"InventoryReleased",
	"InventoryDeducted",
	"FulfillmentCreated",
	"ShipmentCreated",
	"ShipmentDelivered",
	"RefundRequested",
	"RefundApproved",
	"RefundRejected",
	"RefundSucceeded",
	"TicketCreated",
	"CouponUsed",
] as const;

export type DomainEventType = (typeof domainEventTypes)[number];

export type DomainEventPayload = Record<string, unknown>;

export type DomainEventEnvelope<TPayload extends DomainEventPayload> = {
	id: string;
	eventType: DomainEventType;
	aggregateType: string;
	aggregateId: string;
	payload: TPayload;
	createdAt: string;
};

export type PaymentSucceededPayload = {
	paymentOrderId: string;
	orderId: string;
	amount: string;
	currency: string;
	providerTransactionId: string;
};

export type PaymentFailedPayload = {
	paymentOrderId: string;
	orderId: string;
	reason: string;
	providerTransactionId?: string;
};

export type OrderCreatedPayload = {
	orderId: string;
	orderNo: string;
	userId?: string;
	guestToken?: string;
	totalAmount: string;
	currency: string;
};

export type OrderPaidPayload = {
	orderId: string;
	paymentOrderId: string;
	amount: string;
	currency: string;
};

export type InventoryLockedPayload = {
	orderId: string;
	locks: Array<{
		orderItemId: string;
		skuId: string;
		warehouseId: string;
		quantity: number;
		expiresAt: string;
	}>;
};

export type InventoryReleasedPayload = {
	orderId: string;
	locks: Array<{
		skuId: string;
		warehouseId: string;
		quantity: number;
	}>;
	reason: string;
};

export type InventoryDeductedPayload = {
	orderId: string;
	locks: Array<{
		skuId: string;
		warehouseId: string;
		quantity: number;
	}>;
};
