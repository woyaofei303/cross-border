import type { TransactionContext } from "../../common/application/application-ports.js";
import type {
	AdminAccessContext,
	AdminScope,
} from "../../common/admin/admin-access.js";
import type {
	AdminAfterSalesRequestDetail,
	AdminAfterSalesRequestListItem,
	AfterSalesOrderSnapshot,
	AfterSalesRequestSummary,
	ApprovalSnapshot,
	ApproveRefundPlan,
	CreateAfterSalesRequestPlan,
	MarkRefundSucceededPlan,
	PaymentRefundSummary,
	RejectAfterSalesRequestPlan,
	RefundSucceededSnapshot,
} from "./aftersales.types.js";
import type { SiteDimensions } from "../../common/site/site-context.js";

export type AdminAfterSalesScopeQuery = {
	adminAccess: AdminAccessContext;
	selectedScope?: AdminScope;
	limit: number;
};

export interface AfterSalesWriteRepositoryPort {
	findRequestByIdempotencyKey(
		input: SiteDimensions & {
			idempotencyKey: string;
			allowLegacyNullScope?: boolean;
		},
		transaction: TransactionContext,
	): Promise<AfterSalesRequestSummary | null>;

	getOrderForRequestForUpdate(
		input: SiteDimensions & {
			orderId: string;
			allowLegacyNullScope?: boolean;
		},
		transaction: TransactionContext,
	): Promise<AfterSalesOrderSnapshot>;

	createRequest(
		plan: CreateAfterSalesRequestPlan,
		transaction: TransactionContext,
	): Promise<AfterSalesRequestSummary>;

	findRefundByIdempotencyKey(
		idempotencyKey: string,
		transaction: TransactionContext,
	): Promise<PaymentRefundSummary | null>;

	getApprovalSnapshotForUpdate(
		requestId: string,
		transaction: TransactionContext,
	): Promise<ApprovalSnapshot>;

	approveRefundRequest(
		plan: ApproveRefundPlan,
		transaction: TransactionContext,
	): Promise<PaymentRefundSummary>;

	rejectAfterSalesRequest(
		plan: RejectAfterSalesRequestPlan,
		transaction: TransactionContext,
	): Promise<AfterSalesRequestSummary>;

	getRefundSucceededSnapshotForUpdate(
		refundId: string,
		transaction: TransactionContext,
	): Promise<RefundSucceededSnapshot>;

	markRefundSucceeded(
		plan: MarkRefundSucceededPlan,
		transaction: TransactionContext,
	): Promise<PaymentRefundSummary>;
}

export interface AfterSalesAdminReadRepositoryPort {
	listAdminAfterSalesRequests(
		query: AdminAfterSalesScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminAfterSalesRequestListItem[]>;

	getAdminAfterSalesRequestDetail(
		input: {
			requestId: string;
			adminAccess: AdminAccessContext;
		},
		transaction: TransactionContext,
	): Promise<AdminAfterSalesRequestDetail | null>;
}
