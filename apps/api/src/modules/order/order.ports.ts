import type {
	AftersalesStatus,
	AfterSalesRequestStatus,
	AfterSalesRequestType,
	FulfillmentOrderStatus,
	FulfillmentStatus,
	InventoryLockStatus,
	InventoryTransactionType,
	PaymentOrderStatus,
	PaymentRefundStatus,
	PaymentStatus,
	PaymentTransactionStatus,
	PaymentTransactionType,
	OrderStatus,
	ShipmentStatus,
} from "@cross-border/shared";
import type {
	AdminAccessContext,
	AdminScope,
} from "../../common/admin/admin-access.js";
import type { TransactionContext } from "../../common/application/application-ports.js";
import type { SiteDimensions } from "../../common/site/site-context.js";
import type {
	CreateOrderWorkflowPlan,
	PaymentSucceededOrderPlan,
} from "./order.types.js";

export type BuyerIdempotencyScope = SiteDimensions & {
	userId?: string;
	guestToken?: string;
	idempotencyKey: string;
	allowLegacyNullScope?: boolean;
};

export type OrderSummary = {
	orderId: string;
	orderNo: string;
	idempotencyKey: string;
};

export type CreateOrderItemInput = {
	orderItemId: string;
	productId: string;
	skuId: string;
	skuCode: string;
	productTitle: string;
	skuTitle?: string;
	imageUrl?: string;
	unitPrice: string;
	quantity: number;
	discountAmount: string;
	totalAmount: string;
	snapshot: Record<string, unknown>;
	warehouseId: string;
	lockExpiresAt: string;
};

export type CreateOrderRecord = SiteDimensions & {
	orderId: string;
	orderNo: string;
	userId?: string;
	guestToken?: string;
	idempotencyKey: string;
	currency: string;
	subtotalAmount: string;
	discountAmount: string;
	shippingAmount: string;
	taxAmount: string;
	totalAmount: string;
	orderStatus: OrderStatus;
	paymentStatus: PaymentStatus;
	fulfillmentStatus: FulfillmentStatus;
	shippingAddressSnapshot?: Record<string, unknown>;
	priceSnapshot?: Record<string, unknown>;
};

export type CreateOrderItemRecord = Omit<
	CreateOrderItemInput,
	"warehouseId" | "lockExpiresAt"
> & {
	orderId: string;
} & SiteDimensions;

export type OrderStatusLogRecord =
	CreateOrderWorkflowPlan["statusLog"] | PaymentSucceededOrderPlan["statusLogs"][number];

export type OrderPaymentApplicationSnapshot = {
	orderId: string;
	paymentOrderId: string;
	siteId: string;
	verticalId: string;
	brandId: string;
	orderStatus: OrderStatus;
	paymentStatus: PaymentStatus;
	totalAmount: string;
	currency: string;
};

export type OrderCheckoutResultBuyerScope = SiteDimensions & {
	orderId: string;
	userId?: string;
	guestToken?: string;
	allowLegacyNullScope?: boolean;
};

export type OrderLookupBuyerScope = SiteDimensions & {
	userId?: string;
	guestToken?: string;
	allowLegacyNullScope?: boolean;
};

export type StorefrontOrderListItem = SiteDimensions & {
	orderId: string;
	orderNo: string;
	userId?: string;
	guestToken?: string;
	orderStatus: OrderStatus;
	paymentStatus: PaymentStatus;
	fulfillmentStatus: FulfillmentStatus;
	aftersalesStatus: AftersalesStatus;
	currency: string;
	totalAmount: string;
	itemCount: number;
	firstItemTitle?: string;
	firstItemImageUrl?: string;
	createdAt: string;
	updatedAt: string;
	paidAt?: string;
	latestPaymentOrder?: {
		paymentOrderId: string;
		paymentNo: string;
		status: PaymentOrderStatus;
		channelCode: string;
	};
};

export type StorefrontOrderItem = SiteDimensions & {
	orderItemId: string;
	productId: string;
	skuId: string;
	skuCode: string;
	productTitle: string;
	skuTitle?: string;
	imageUrl?: string;
	unitPrice: string;
	quantity: number;
	discountAmount: string;
	totalAmount: string;
	snapshot: Record<string, unknown>;
};

export type StorefrontShipmentTrackingEvent = {
	trackingStatus: string;
	description?: string;
	location?: string;
	occurredAt: string;
};

export type StorefrontShipment = SiteDimensions & {
	shipmentId: string;
	fulfillmentOrderId: string;
	fulfillmentNo: string;
	fulfillmentStatus: FulfillmentOrderStatus;
	providerCode: string;
	providerName: string;
	trackingNo: string;
	status: ShipmentStatus;
	shippedAt?: string;
	deliveredAt?: string;
	trackingEvents: StorefrontShipmentTrackingEvent[];
};

export type OrderCheckoutResult = SiteDimensions & {
	orderId: string;
	orderNo: string;
	userId?: string;
	guestToken?: string;
	orderStatus: OrderStatus;
	paymentStatus: PaymentStatus;
	fulfillmentStatus: FulfillmentStatus;
	aftersalesStatus: AftersalesStatus;
	currency: string;
	subtotalAmount: string;
	discountAmount: string;
	shippingAmount: string;
	taxAmount: string;
	totalAmount: string;
	createdAt: string;
	updatedAt: string;
	paidAt?: string;
	paymentOrder?: {
		paymentOrderId: string;
		paymentNo: string;
		status: PaymentOrderStatus;
		channelCode: string;
		amount: string;
		currency: string;
	};
};

export type StorefrontOrderDetail = OrderCheckoutResult & {
	shippingAddressSnapshot: Record<string, unknown>;
	priceSnapshot: Record<string, unknown>;
	items: StorefrontOrderItem[];
	shipments: StorefrontShipment[];
};

export type AdminOrderScopeQuery = {
	adminAccess: AdminAccessContext;
	selectedScope?: AdminScope;
	limit: number;
};

export type AdminOrderListItem = SiteDimensions & {
	orderId: string;
	orderNo: string;
	userId?: string;
	guestToken?: string;
	orderStatus: OrderStatus;
	paymentStatus: PaymentStatus;
	fulfillmentStatus: FulfillmentStatus;
	aftersalesStatus: AftersalesStatus;
	currency: string;
	totalAmount: string;
	itemCount: number;
	statusLogCount: number;
	createdAt: string;
	updatedAt: string;
	paidAt?: string;
	cancelledAt?: string;
	latestPaymentOrder?: {
		paymentOrderId: string;
		paymentNo: string;
		status: PaymentOrderStatus;
		channelCode: string;
	};
};

export type AdminOrderPaymentOrder = SiteDimensions & {
	paymentOrderId: string;
	paymentNo: string;
	channelCode: string;
	status: PaymentOrderStatus;
	amount: string;
	currency: string;
	providerPaymentId?: string;
	idempotencyKey: string;
	createdAt: string;
	updatedAt: string;
	succeededAt?: string;
	failedAt?: string;
};

export type AdminOrderPaymentTransaction = SiteDimensions & {
	paymentTransactionId: string;
	paymentOrderId: string;
	channelCode: string;
	providerTransactionId: string;
	transactionType: PaymentTransactionType;
	status: PaymentTransactionStatus;
	amount: string;
	currency: string;
	rawPayload: Record<string, unknown>;
	createdAt: string;
};

export type AdminOrderInventoryLock = SiteDimensions & {
	inventoryLockId: string;
	orderItemId: string;
	skuId: string;
	warehouseId: string;
	quantity: number;
	status: InventoryLockStatus;
	idempotencyKey: string;
	expiresAt: string;
	releasedAt?: string;
	deductedAt?: string;
	createdAt: string;
};

export type AdminOrderInventoryTransaction = SiteDimensions & {
	inventoryTransactionId: string;
	skuId: string;
	warehouseId: string;
	type: InventoryTransactionType;
	quantity: number;
	beforeAvailable: number;
	afterAvailable: number;
	beforeLocked: number;
	afterLocked: number;
	beforePhysical: number;
	afterPhysical: number;
	idempotencyKey: string;
	createdAt: string;
};

export type AdminOrderFulfillmentOrder = SiteDimensions & {
	fulfillmentOrderId: string;
	fulfillmentNo: string;
	warehouseId?: string;
	status: FulfillmentOrderStatus;
	itemCount: number;
	createdAt: string;
	updatedAt: string;
};

export type AdminOrderFulfillmentItem = SiteDimensions & {
	fulfillmentItemId: string;
	fulfillmentOrderId: string;
	orderItemId: string;
	skuId: string;
	quantity: number;
	createdAt: string;
};

export type AdminOrderShipment = StorefrontShipment;

export type AdminOrderPaymentRefund = SiteDimensions & {
	refundId: string;
	refundNo: string;
	afterSalesRequestId?: string;
	paymentOrderId: string;
	status: PaymentRefundStatus;
	amount: string;
	currency: string;
	providerRefundId?: string;
	createdAt: string;
	updatedAt: string;
	succeededAt?: string;
	failedAt?: string;
};

export type AdminOrderAfterSalesItem = SiteDimensions & {
	afterSalesItemId: string;
	afterSalesRequestId: string;
	orderItemId: string;
	quantity: number;
	requestedAmount?: string;
	approvedAmount?: string;
	returnQualityStatus?: string;
	createdAt: string;
};

export type AdminOrderAfterSalesRequest = SiteDimensions & {
	afterSalesRequestId: string;
	requestNo: string;
	userId?: string;
	type: AfterSalesRequestType;
	status: AfterSalesRequestStatus;
	reason: string;
	requestedAmount?: string;
	approvedAmount?: string;
	createdAt: string;
	updatedAt: string;
};

export type AdminOrderStatusLog = SiteDimensions & {
	statusLogId: string;
	statusType: "order" | "payment" | "fulfillment" | "aftersales";
	fromStatus?: string;
	toStatus: string;
	reason?: string;
	operatorType: "user" | "admin" | "system";
	operatorId?: string;
	metadata: Record<string, unknown>;
	createdAt: string;
};

export type AdminOrderDetail = OrderCheckoutResult & {
	shippingAddressSnapshot: Record<string, unknown>;
	priceSnapshot: Record<string, unknown>;
	cartOrigin: {
		userId?: string;
		guestToken?: string;
		idempotencyKey: string;
	};
	items: StorefrontOrderItem[];
	paymentOrders: AdminOrderPaymentOrder[];
	paymentTransactions: AdminOrderPaymentTransaction[];
	inventoryLocks: AdminOrderInventoryLock[];
	inventoryTransactions: AdminOrderInventoryTransaction[];
	fulfillmentOrders: AdminOrderFulfillmentOrder[];
	fulfillmentItems: AdminOrderFulfillmentItem[];
	shipments: AdminOrderShipment[];
	paymentRefunds: AdminOrderPaymentRefund[];
	afterSalesRequests: AdminOrderAfterSalesRequest[];
	afterSalesItems: AdminOrderAfterSalesItem[];
	statusLogs: AdminOrderStatusLog[];
};

export type ApplyPaymentSucceededRecord = {
	orderId: string;
	orderStatus: OrderStatus;
	paymentStatus: PaymentStatus;
	paidAt: string;
};

export interface OrderWriteRepositoryPort {
	findByIdempotencyKey(
		scope: BuyerIdempotencyScope,
		transaction: TransactionContext,
	): Promise<OrderSummary | null>;

	createOrder(
		record: CreateOrderRecord,
		transaction: TransactionContext,
	): Promise<OrderSummary>;

	createOrderItems(
		records: CreateOrderItemRecord[],
		transaction: TransactionContext,
	): Promise<void>;

	appendStatusLogs(
		orderId: string,
		records: OrderStatusLogRecord[],
		dimensions: SiteDimensions,
		transaction: TransactionContext,
	): Promise<void>;

	getPaymentApplicationSnapshot(
		orderId: string,
		transaction: TransactionContext,
	): Promise<OrderPaymentApplicationSnapshot>;

	getCheckoutResult(
		scope: OrderCheckoutResultBuyerScope,
		transaction: TransactionContext,
	): Promise<OrderCheckoutResult | null>;

	listStorefrontOrders(
		scope: OrderLookupBuyerScope & { limit: number },
		transaction: TransactionContext,
	): Promise<StorefrontOrderListItem[]>;

	getStorefrontOrderDetail(
		scope: OrderLookupBuyerScope & { orderId: string },
		transaction: TransactionContext,
	): Promise<StorefrontOrderDetail | null>;

	listAdminOrders(
		query: AdminOrderScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminOrderListItem[]>;

	getAdminOrderDetail(
		input: {
			orderId: string;
			adminAccess: AdminAccessContext;
		},
		transaction: TransactionContext,
	): Promise<AdminOrderDetail | null>;

	applyPaymentSucceeded(
		record: ApplyPaymentSucceededRecord,
		transaction: TransactionContext,
	): Promise<void>;
}
