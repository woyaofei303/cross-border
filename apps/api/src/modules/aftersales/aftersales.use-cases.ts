import type {
	OutboxEventDraft,
	OutboxPort,
	TransactionManagerPort,
} from "../../common/application/application-ports.js";
import {
	canAccessSiteDimensions,
	type AdminAccessContext,
} from "../../common/admin/admin-access.js";
import {
	DomainRuleViolationError,
	assertDomainRule,
} from "../../common/domain/domain-errors.js";
import { defaultSiteContext } from "../../common/site/site-context.js";
import type {
	AdminAfterSalesScopeQuery,
	AfterSalesAdminReadRepositoryPort,
	AfterSalesWriteRepositoryPort,
} from "./aftersales.ports.js";
import { AfterSalesWorkflowService } from "./aftersales.service.js";
import type {
	AdminAfterSalesRequestDetail,
	AdminAfterSalesRequestListItem,
	AfterSalesRequestSummary,
	ApproveRefundInput,
	MarkRefundSucceededInput,
	PaymentRefundSummary,
	RejectAfterSalesRequestInput,
	RequestRefundInput,
} from "./aftersales.types.js";

export type RequestRefundUseCaseResult = {
	request: AfterSalesRequestSummary;
	reusedIdempotency: boolean;
	events: OutboxEventDraft<Record<string, unknown>>[];
};

export type ApproveRefundUseCaseResult = {
	refund: PaymentRefundSummary;
	reusedIdempotency: boolean;
	events: OutboxEventDraft<Record<string, unknown>>[];
};

export type RejectAfterSalesRequestUseCaseResult = {
	request: AfterSalesRequestSummary;
	events: OutboxEventDraft<Record<string, unknown>>[];
};

export type MarkRefundSucceededUseCaseResult =
	| {
			status: "processed";
			refund: PaymentRefundSummary;
			events: OutboxEventDraft<Record<string, unknown>>[];
	  }
	| {
			status: "already_succeeded";
			refund: PaymentRefundSummary;
			events: [];
	  }
	| {
			status: "failed";
			errorMessage: string;
			events: [];
	  };

export type AfterSalesUseCaseDeps = {
	transactions: TransactionManagerPort;
	afterSales: AfterSalesWriteRepositoryPort;
	outbox: OutboxPort;
	workflow: AfterSalesWorkflowService;
};

export type AfterSalesAdminReadUseCaseDeps = {
	transactions: TransactionManagerPort;
	afterSales: AfterSalesAdminReadRepositoryPort;
};

export type ListAdminAfterSalesUseCaseInput = Omit<
	AdminAfterSalesScopeQuery,
	"limit"
> & {
	limit?: number;
};

function normalizeAdminAfterSalesLimit(limit: number | undefined): number {
	if (!Number.isInteger(limit)) {
		return 50;
	}

	return Math.min(Math.max(limit ?? 50, 1), 100);
}

function assertAdminCanAccess(
	access: AdminAccessContext,
	dimensions: {
		siteId: string;
		verticalId: string;
		brandId: string;
	},
): void {
	assertDomainRule(
		canAccessSiteDimensions(access.scopes, dimensions),
		"ADMIN_SCOPE_FORBIDDEN",
		"Admin data scope does not allow this after-sales operation.",
	);
}

export class ListAdminAfterSalesRequestsUseCase {
	constructor(private readonly deps: AfterSalesAdminReadUseCaseDeps) {}

	async execute(
		input: ListAdminAfterSalesUseCaseInput,
	): Promise<AdminAfterSalesRequestListItem[]> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.afterSales.listAdminAfterSalesRequests(
				{
					adminAccess: input.adminAccess,
					...(input.selectedScope ? { selectedScope: input.selectedScope } : {}),
					limit: normalizeAdminAfterSalesLimit(input.limit),
				},
				transaction,
			),
		);
	}
}

export class GetAdminAfterSalesRequestDetailUseCase {
	constructor(private readonly deps: AfterSalesAdminReadUseCaseDeps) {}

	async execute(input: {
		requestId: string;
		adminAccess: AdminAccessContext;
	}): Promise<AdminAfterSalesRequestDetail | null> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.afterSales.getAdminAfterSalesRequestDetail(input, transaction),
		);
	}
}

export class RequestRefundUseCase {
	constructor(private readonly deps: AfterSalesUseCaseDeps) {}

	async execute(input: RequestRefundInput): Promise<RequestRefundUseCaseResult> {
		return this.deps.transactions.runInTransaction(async (transaction) => {
			const existing = await this.deps.afterSales.findRequestByIdempotencyKey(
				{
					siteId: input.siteId,
					verticalId: input.verticalId,
					brandId: input.brandId,
					idempotencyKey: input.idempotencyKey,
					allowLegacyNullScope: input.siteId === defaultSiteContext.siteId,
				},
				transaction,
			);

			if (existing) {
				return {
					request: existing,
					reusedIdempotency: true,
					events: [],
				};
			}

			const order = await this.deps.afterSales.getOrderForRequestForUpdate(
				{
					orderId: input.orderId,
					siteId: input.siteId,
					verticalId: input.verticalId,
					brandId: input.brandId,
					allowLegacyNullScope: input.siteId === defaultSiteContext.siteId,
				},
				transaction,
			);
			const plan = this.deps.workflow.planRequestRefund({
				request: input,
				order,
			});
			const request = await this.deps.afterSales.createRequest(
				plan,
				transaction,
			);
			const events: OutboxEventDraft<Record<string, unknown>>[] = [
				{
					eventType: "RefundRequested",
					aggregateType: "after_sales_request",
					aggregateId: request.requestId,
					siteId: request.siteId,
					verticalId: request.verticalId,
					brandId: request.brandId,
					payload: {
						requestId: request.requestId,
						requestNo: request.requestNo,
						orderId: request.orderId,
						requestedAmount: request.requestedAmount,
					},
				},
			];

			await this.deps.outbox.append(events, transaction);

			return {
				request,
				reusedIdempotency: false,
				events,
			};
		});
	}
}

export class ApproveRefundUseCase {
	constructor(private readonly deps: AfterSalesUseCaseDeps) {}

	async execute(input: ApproveRefundInput): Promise<ApproveRefundUseCaseResult> {
		return this.deps.transactions.runInTransaction(async (transaction) => {
			const existing = await this.deps.afterSales.findRefundByIdempotencyKey(
				input.idempotencyKey,
				transaction,
			);

			if (existing) {
				assertAdminCanAccess(input.adminAccess, existing);

				return {
					refund: existing,
					reusedIdempotency: true,
					events: [],
				};
			}

			const snapshot =
				await this.deps.afterSales.getApprovalSnapshotForUpdate(
					input.requestId,
					transaction,
				);
			assertAdminCanAccess(input.adminAccess, snapshot);

			const plan = this.deps.workflow.planApproveRefund({
				command: input,
				snapshot,
			});
			const refund = await this.deps.afterSales.approveRefundRequest(
				plan,
				transaction,
			);
			const events: OutboxEventDraft<Record<string, unknown>>[] = [
				{
					eventType: "RefundApproved",
					aggregateType: "after_sales_request",
					aggregateId: snapshot.requestId,
					siteId: snapshot.siteId,
					verticalId: snapshot.verticalId,
					brandId: snapshot.brandId,
					payload: {
						requestId: snapshot.requestId,
						refundId: refund.refundId,
						orderId: snapshot.orderId,
						approvedAmount: refund.amount,
						currency: refund.currency,
					},
				},
			];

			await this.deps.outbox.append(events, transaction);

			return {
				refund,
				reusedIdempotency: false,
				events,
			};
		});
	}
}

export class RejectAfterSalesRequestUseCase {
	constructor(private readonly deps: AfterSalesUseCaseDeps) {}

	async execute(
		input: RejectAfterSalesRequestInput,
	): Promise<RejectAfterSalesRequestUseCaseResult> {
		return this.deps.transactions.runInTransaction(async (transaction) => {
			const snapshot =
				await this.deps.afterSales.getApprovalSnapshotForUpdate(
					input.requestId,
					transaction,
				);
			assertAdminCanAccess(input.adminAccess, snapshot);

			const plan = this.deps.workflow.planRejectRequest({
				command: input,
				snapshot,
			});
			const request = await this.deps.afterSales.rejectAfterSalesRequest(
				plan,
				transaction,
			);
			const events: OutboxEventDraft<Record<string, unknown>>[] = [
				{
					eventType: "RefundRejected",
					aggregateType: "after_sales_request",
					aggregateId: request.requestId,
					siteId: request.siteId,
					verticalId: request.verticalId,
					brandId: request.brandId,
					payload: {
						requestId: request.requestId,
						requestNo: request.requestNo,
						orderId: request.orderId,
						reason: input.reason,
					},
				},
			];

			await this.deps.outbox.append(events, transaction);

			return {
				request,
				events,
			};
		});
	}
}

export class MarkRefundSucceededUseCase {
	constructor(private readonly deps: AfterSalesUseCaseDeps) {}

	async execute(
		input: MarkRefundSucceededInput,
	): Promise<MarkRefundSucceededUseCaseResult> {
		return this.deps.transactions.runInTransaction(async (transaction) => {
			const snapshot =
				await this.deps.afterSales.getRefundSucceededSnapshotForUpdate(
					input.refundId,
					transaction,
				);
			assertAdminCanAccess(input.adminAccess, snapshot);

			if (snapshot.status === "succeeded") {
				return {
					status: "already_succeeded",
					refund: snapshot,
					events: [],
				};
			}

			try {
				const plan = this.deps.workflow.planMarkRefundSucceeded({
					command: input,
					snapshot,
				});
				const refund = await this.deps.afterSales.markRefundSucceeded(
					plan,
					transaction,
				);
				const events: OutboxEventDraft<Record<string, unknown>>[] = [
					{
						eventType: "RefundSucceeded",
						aggregateType: "payment_refund",
						aggregateId: refund.refundId,
						siteId: refund.siteId,
						verticalId: refund.verticalId,
						brandId: refund.brandId,
						payload: {
							refundId: refund.refundId,
							requestId: refund.requestId,
							orderId: refund.orderId,
							amount: refund.amount,
							currency: refund.currency,
							providerRefundId: refund.providerRefundId,
						},
					},
				];

				await this.deps.outbox.append(events, transaction);

				return {
					status: "processed",
					refund,
					events,
				};
			} catch (error) {
				if (error instanceof DomainRuleViolationError) {
					return {
						status: "failed",
						errorMessage: error.message,
						events: [],
					};
				}

				throw error;
			}
		});
	}
}
