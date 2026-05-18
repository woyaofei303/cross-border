import type {
	AftersalesStatus,
	AfterSalesRequestStatus,
	AfterSalesRequestType,
	FulfillmentStatus,
	InventoryLockStatus,
	InventoryTransactionType,
	OrderStatus,
	PaymentOrderStatus,
	PaymentRefundStatus,
	PaymentStatus,
	PaymentWebhookStatus,
} from "@cross-border/shared";

export type OperationsDashboardQuery = {
	limit?: number;
};

export type OperationsOrderRiskRow = {
	id: string;
	orderNo: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	orderStatus: OrderStatus;
	paymentStatus: PaymentStatus;
	fulfillmentStatus: FulfillmentStatus;
	aftersalesStatus: AftersalesStatus;
	currency: string;
	totalAmount: string;
	paymentNo?: string;
	paymentOrderStatus?: PaymentOrderStatus;
	paymentChannelCode?: string;
	itemCount: number;
	statusLogCount: number;
	createdAt: string;
	updatedAt: string;
	paidAt?: string;
	cancelledAt?: string;
};

export type OperationsPaymentWebhookRow = {
	id: string;
	paymentOrderId?: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	channelCode: string;
	providerEventId: string;
	eventType: string;
	providerObjectId?: string;
	status: PaymentWebhookStatus;
	errorMessage?: string;
	receivedAt: string;
	processedAt?: string;
};

export type OperationsInventoryLockRow = {
	id: string;
	orderId: string;
	orderItemId: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	skuId: string;
	warehouseId: string;
	quantity: number;
	status: InventoryLockStatus;
	expiresAt: string;
	releasedAt?: string;
	deductedAt?: string;
	createdAt: string;
};

export type OperationsInventoryTransactionRow = {
	id: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	skuId: string;
	warehouseId: string;
	orderId?: string;
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

export type OperationsAfterSalesRequestRow = {
	id: string;
	requestNo: string;
	orderId: string;
	orderNo?: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	type: AfterSalesRequestType;
	status: AfterSalesRequestStatus;
	reason: string;
	requestedAmount?: string;
	approvedAmount?: string;
	createdAt: string;
	updatedAt: string;
};

export type OperationsPaymentRefundRow = {
	id: string;
	refundNo: string;
	requestId?: string;
	requestNo?: string;
	paymentOrderId: string;
	orderId: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	status: PaymentRefundStatus;
	amount: string;
	currency: string;
	providerRefundId?: string;
	createdAt: string;
	updatedAt: string;
	succeededAt?: string;
	failedAt?: string;
};

export type OperationsAuditLogRow = {
	id: string;
	source: "audit" | "admin_operation";
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	actorType: "user" | "admin" | "system";
	actorId?: string;
	action: string;
	resourceType: string;
	resourceId?: string;
	ipAddress?: string;
	requestId?: string;
	createdAt: string;
};

export type OperationsRiskDashboard = {
	orders: OperationsOrderRiskRow[];
	paymentWebhooks: OperationsPaymentWebhookRow[];
	inventoryLocks: OperationsInventoryLockRow[];
	inventoryTransactions: OperationsInventoryTransactionRow[];
	afterSalesRequests: OperationsAfterSalesRequestRow[];
	paymentRefunds: OperationsPaymentRefundRow[];
	auditLogs: OperationsAuditLogRow[];
};

export type CommercePipelineDomainEvent = {
	id: string;
	payload: Record<string, unknown>;
};

export type CommercePipelineResultItem = {
	id: string;
	status: string;
	reason?: string;
	errorMessage?: string;
};

export type CommercePipelineBatchResult = {
	claimed: number;
	processed: number;
	skipped: number;
	alreadyProcessed: number;
	failed: number;
	results: CommercePipelineResultItem[];
};

export type CommercePipelineResult = {
	paymentWebhooks: CommercePipelineBatchResult;
	paymentSucceededEvents: CommercePipelineBatchResult;
	analyticsEvents: {
		claimed: number;
		processed: number;
		alreadyProcessed: number;
		ignored: number;
		failed: number;
		results: CommercePipelineResultItem[];
	};
};
