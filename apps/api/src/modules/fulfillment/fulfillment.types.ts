import type {
	FulfillmentOrderStatus,
	FulfillmentStatus,
	OrderStatus,
	PaymentStatus,
	ShipmentStatus,
} from "@cross-border/shared";

export type FulfillmentOrderSummary = {
	fulfillmentOrderId: string;
	fulfillmentNo: string;
	orderId: string;
	orderNo: string;
	warehouseId?: string;
	status: FulfillmentOrderStatus;
	siteId: string;
	verticalId: string;
	brandId: string;
	itemCount: number;
};

export type ShipmentSummary = {
	shipmentId: string;
	fulfillmentOrderId: string;
	providerId: string;
	providerCode: string;
	trackingNo: string;
	status: ShipmentStatus;
	siteId: string;
	verticalId: string;
	brandId: string;
};

export type FulfillmentOrderSnapshot = FulfillmentOrderSummary & {
	orderStatus: OrderStatus;
	paymentStatus: PaymentStatus;
	fulfillmentStatus: FulfillmentStatus;
};

export type OrderFulfillmentSnapshot = {
	orderId: string;
	orderNo: string;
	siteId: string;
	verticalId: string;
	brandId: string;
	orderStatus: OrderStatus;
	paymentStatus: PaymentStatus;
	fulfillmentStatus: FulfillmentStatus;
};

export type ShipmentDeliverySnapshot = ShipmentSummary & {
	orderId: string;
	orderNo: string;
	orderStatus: OrderStatus;
	fulfillmentOrderStatus: FulfillmentOrderStatus;
	fulfillmentStatus: FulfillmentStatus;
};
