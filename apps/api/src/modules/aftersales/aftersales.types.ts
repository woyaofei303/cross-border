import type {
	AfterSalesRequestStatus,
	AfterSalesRequestType,
	PaymentRefundStatus,
	PaymentStatus,
} from "@cross-border/shared";
import type { AdminAccessContext } from "../../common/admin/admin-access.js";
import type { SiteDimensions } from "../../common/site/site-context.js";

export type AfterSalesRequestItemInput = {
	afterSalesItemId: string;
	orderItemId: string;
	quantity: number;
	requestedAmount?: string;
};

export type RequestRefundInput = SiteDimensions & {
	requestId: string;
	requestNo: string;
	orderId: string;
	userId?: string;
	guestToken?: string;
	type: AfterSalesRequestType;
	reason: string;
	requestedAmount: string;
	idempotencyKey: string;
	items: AfterSalesRequestItemInput[];
};

export type ApproveRefundInput = {
	requestId: string;
	refundId: string;
	refundNo: string;
	approvedAmount: string;
	idempotencyKey: string;
	adminAccess: AdminAccessContext;
};

export type RejectAfterSalesRequestInput = {
	requestId: string;
	reason: string;
	adminAccess: AdminAccessContext;
};

export type MarkRefundSucceededInput = {
	refundId: string;
	providerRefundId: string;
	responsePayload?: Record<string, unknown>;
	adminAccess: AdminAccessContext;
};

export type AfterSalesRequestSummary = SiteDimensions & {
	requestId: string;
	requestNo: string;
	orderId: string;
	status: AfterSalesRequestStatus;
	requestedAmount: string | null;
	approvedAmount: string | null;
};

export type PaymentRefundSummary = SiteDimensions & {
	refundId: string;
	refundNo: string;
	requestId?: string;
	paymentOrderId: string;
	orderId: string;
	status: PaymentRefundStatus;
	amount: string;
	currency: string;
	idempotencyKey: string;
	providerRefundId?: string;
};

export type AfterSalesOrderSnapshot = SiteDimensions & {
	orderId: string;
	userId?: string;
	guestToken?: string;
	paymentStatus: PaymentStatus;
	aftersalesStatus: AfterSalesRequestStatus | "none";
	currency: string;
	totalAmount: string;
};

export type ApprovalSnapshot = AfterSalesRequestSummary & {
	type: AfterSalesRequestType;
	reason: string;
	paymentOrderId: string;
	paymentStatus: PaymentStatus;
	orderAftersalesStatus: AfterSalesRequestStatus | "none";
	currency: string;
	orderTotalAmount: string;
	alreadyRefundedAmount: string;
};

export type RefundSucceededSnapshot = PaymentRefundSummary & {
	requestStatus?: AfterSalesRequestStatus;
	paymentStatus: PaymentStatus;
	orderAftersalesStatus: AfterSalesRequestStatus | "none";
	orderTotalAmount: string;
	alreadyRefundedAmount: string;
};

export type AdminAfterSalesOrderContext = SiteDimensions & {
	orderId: string;
	orderNo: string;
	orderStatus: string;
	paymentStatus: PaymentStatus;
	fulfillmentStatus: string;
	aftersalesStatus: AfterSalesRequestStatus | "none";
	currency: string;
	totalAmount: string;
	userId?: string;
	guestToken?: string;
};

export type AdminAfterSalesRequestListItem = SiteDimensions & {
	afterSalesRequestId: string;
	requestNo: string;
	orderId: string;
	orderNo: string;
	type: AfterSalesRequestType;
	status: AfterSalesRequestStatus;
	reason: string;
	requestedAmount?: string;
	approvedAmount?: string;
	currency: string;
	orderStatus: string;
	paymentStatus: PaymentStatus;
	fulfillmentStatus: string;
	orderAftersalesStatus: AfterSalesRequestStatus | "none";
	totalAmount: string;
	userId?: string;
	guestToken?: string;
	itemCount: number;
	refundCount: number;
	latestRefundId?: string;
	latestRefundStatus?: PaymentRefundStatus;
	createdAt: string;
	updatedAt: string;
};

export type AdminAfterSalesItem = {
	afterSalesItemId: string;
	afterSalesRequestId: string;
	orderItemId: string;
	productTitle?: string;
	skuCode?: string;
	skuTitle?: string;
	quantity: number;
	requestedAmount?: string;
	approvedAmount?: string;
	returnQualityStatus?: string;
	createdAt: string;
};

export type AdminAfterSalesLog = {
	afterSalesLogId: string;
	afterSalesRequestId: string;
	action: string;
	fromStatus?: string;
	toStatus?: string;
	operatorType: string;
	operatorId?: string;
	note?: string;
	createdAt: string;
};

export type AdminAfterSalesRefund = PaymentRefundSummary & {
	createdAt: string;
	updatedAt: string;
	succeededAt?: string;
	failedAt?: string;
};

export type AdminAfterSalesRequestDetail = AdminAfterSalesRequestListItem & {
	order: AdminAfterSalesOrderContext;
	items: AdminAfterSalesItem[];
	logs: AdminAfterSalesLog[];
	refunds: AdminAfterSalesRefund[];
};

export type CreateAfterSalesRequestPlan = {
	request: AfterSalesRequestSummary & {
		type: AfterSalesRequestType;
		reason: string;
		userId?: string;
		idempotencyKey: string;
	};
	items: Array<AfterSalesRequestItemInput & { approvedAmount?: string }>;
	orderAftersalesFromStatus: AfterSalesRequestStatus | "none";
};

export type ApproveRefundPlan = {
	requestId: string;
	refund: {
		refundId: string;
		refundNo: string;
		requestId: string;
		paymentOrderId: string;
		orderId: string;
		siteId: string;
		verticalId: string;
		brandId: string;
		status: PaymentRefundStatus;
		amount: string;
		currency: string;
		reason: string;
		idempotencyKey: string;
		requestPayload: Record<string, unknown>;
	};
	fromRequestStatus: AfterSalesRequestStatus;
	fromOrderAftersalesStatus: AfterSalesRequestStatus | "none";
	toRequestStatus: AfterSalesRequestStatus;
};

export type MarkRefundSucceededPlan = {
	refundId: string;
	providerRefundId: string;
	responsePayload: Record<string, unknown>;
	fromRefundStatus: PaymentRefundStatus;
	fromPaymentStatus: PaymentStatus;
	toPaymentStatus: PaymentStatus;
	fromOrderAftersalesStatus: AfterSalesRequestStatus | "none";
	toOrderAftersalesStatus: AfterSalesRequestStatus;
	fromRequestStatus?: AfterSalesRequestStatus;
	toRequestStatus?: AfterSalesRequestStatus;
	transaction: {
		paymentOrderId: string;
		siteId: string;
		verticalId: string;
		brandId: string;
		channelCode: string;
		providerTransactionId: string;
		amount: string;
		currency: string;
		rawPayload: Record<string, unknown>;
	};
};

export type RejectAfterSalesRequestPlan = {
	requestId: string;
	orderId: string;
	siteId: string;
	verticalId: string;
	brandId: string;
	reason: string;
	fromRequestStatus: AfterSalesRequestStatus;
	toRequestStatus: "rejected";
	fromOrderAftersalesStatus: AfterSalesRequestStatus | "none";
	toOrderAftersalesStatus: "rejected";
};
