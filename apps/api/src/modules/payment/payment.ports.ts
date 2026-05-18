import type {
	PaymentOrderStatus,
	PaymentTransactionStatus,
	PaymentTransactionType,
	PaymentWebhookStatus,
} from "@cross-border/shared";
import type {
	AdminAccessContext,
	AdminScope,
} from "../../common/admin/admin-access.js";
import type { TransactionContext } from "../../common/application/application-ports.js";
import type { SiteDimensions } from "../../common/site/site-context.js";
import type {
	CreatePaymentOrderPlan,
	PaymentProvider,
	PaymentWebhookReceiptPlan,
	ProcessPaymentWebhookPlan,
} from "./payment.types.js";

export type PaymentOrderSummary = SiteDimensions & {
	paymentOrderId: string;
	paymentNo: string;
	orderId: string;
	channelCode: PaymentProvider;
	status: PaymentOrderStatus;
	amount: string;
	currency: string;
	idempotencyKey: string;
	providerPaymentId?: string;
};

export type PaymentWebhookRecord = Partial<SiteDimensions> & {
	webhookEventId: string;
	paymentOrderId?: string;
	channelCode: PaymentProvider;
	providerEventId: string;
	eventType: string;
	providerObjectId?: string;
	rawPayload: Record<string, unknown>;
	status: PaymentWebhookStatus;
};

export type AdminPaymentScopeQuery = {
	adminAccess: AdminAccessContext;
	selectedScope?: AdminScope;
	limit: number;
};

export type AdminPaymentOrderListItem = SiteDimensions & {
	paymentOrderId: string;
	paymentNo: string;
	orderId: string;
	orderNo: string;
	channelCode: string;
	status: PaymentOrderStatus;
	amount: string;
	currency: string;
	providerPaymentId?: string;
	idempotencyKey: string;
	transactionCount: number;
	latestWebhookEventId?: string;
	latestWebhookStatus?: PaymentWebhookStatus;
	createdAt: string;
	updatedAt: string;
	succeededAt?: string;
	failedAt?: string;
};

export type AdminPaymentTransactionListItem = SiteDimensions & {
	paymentTransactionId: string;
	paymentOrderId: string;
	paymentNo: string;
	orderId: string;
	orderNo: string;
	channelCode: string;
	providerTransactionId: string;
	transactionType: PaymentTransactionType;
	status: PaymentTransactionStatus;
	amount: string;
	currency: string;
	createdAt: string;
};

export type AdminPaymentWebhookListItem = SiteDimensions & {
	webhookEventId: string;
	paymentOrderId?: string;
	paymentNo?: string;
	orderId?: string;
	orderNo?: string;
	channelCode: string;
	providerEventId: string;
	eventType: string;
	providerObjectId?: string;
	dedupeKey: string;
	duplicateCount: number;
	status: PaymentWebhookStatus;
	errorMessage?: string;
	receivedAt: string;
	processedAt?: string;
};

export interface PaymentWriteRepositoryPort {
	findPaymentOrderByIdempotencyKey(
		idempotencyKey: string,
		transaction: TransactionContext,
	): Promise<PaymentOrderSummary | null>;

	createPaymentOrder(
		plan: CreatePaymentOrderPlan,
		transaction: TransactionContext,
	): Promise<PaymentOrderSummary>;

	insertWebhookIfNew(
		plan: PaymentWebhookReceiptPlan,
		transaction: TransactionContext,
	): Promise<{ inserted: boolean; webhookEventId: string }>;

	getWebhookForProcessing(
		webhookEventId: string,
		transaction: TransactionContext,
	): Promise<PaymentWebhookRecord>;

	findPaymentOrderForWebhook(
		webhook: PaymentWebhookRecord,
		transaction: TransactionContext,
	): Promise<PaymentOrderSummary>;

	attachWebhookToPaymentOrder(input: {
		webhookEventId: string;
		paymentOrder: PaymentOrderSummary;
		transaction: TransactionContext;
	}): Promise<void>;

	updateWebhookStatus(input: {
		webhookEventId: string;
		status: PaymentWebhookStatus;
		errorMessage?: string;
		transaction: TransactionContext;
	}): Promise<void>;

	appendTransaction(
		transactionRecord: ProcessPaymentWebhookPlan["transaction"],
		transaction: TransactionContext,
	): Promise<void>;

	updatePaymentOrderStatus(input: {
		paymentOrderId: string;
		status: PaymentOrderStatus;
		transaction: TransactionContext;
	}): Promise<void>;
}

export interface PaymentAdminReadRepositoryPort {
	listAdminPaymentOrders(
		query: AdminPaymentScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminPaymentOrderListItem[]>;

	listAdminPaymentTransactions(
		query: AdminPaymentScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminPaymentTransactionListItem[]>;

	listAdminPaymentWebhooks(
		query: AdminPaymentScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminPaymentWebhookListItem[]>;
}
