import { describe, expect, it } from "vitest";
import {
	NoopTransactionManager,
	type OutboxEventDraft,
	type OutboxPort,
	type TransactionContext,
} from "../../common/application/application-ports.js";
import { DomainRuleViolationError } from "../../common/domain/domain-errors.js";
import { defaultSiteContext } from "../../common/site/site-context.js";
import type {
	AfterSalesAdminReadRepositoryPort,
	AfterSalesWriteRepositoryPort,
	AdminAfterSalesScopeQuery,
} from "./aftersales.ports.js";
import { AfterSalesWorkflowService } from "./aftersales.service.js";
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
import {
	GetAdminAfterSalesRequestDetailUseCase,
	ListAdminAfterSalesRequestsUseCase,
	MarkRefundSucceededUseCase,
	RejectAfterSalesRequestUseCase,
	RequestRefundUseCase,
} from "./aftersales.use-cases.js";

class MemoryOutbox implements OutboxPort {
	events: OutboxEventDraft<Record<string, unknown>>[] = [];

	async append(events: OutboxEventDraft<Record<string, unknown>>[]): Promise<void> {
		this.events.push(...events);
	}
}

class MemoryAfterSalesRepository
	implements AfterSalesWriteRepositoryPort, AfterSalesAdminReadRepositoryPort
{
	listQuery: AdminAfterSalesScopeQuery | null = null;
	detailInput: {
		requestId: string;
		adminAccess: AdminAfterSalesScopeQuery["adminAccess"];
	} | null = null;
	requestByIdempotency: AfterSalesRequestSummary | null = null;
	orderSnapshot: AfterSalesOrderSnapshot = {
		orderId: "order-1",
		guestToken: "guest-1",
		paymentStatus: "paid",
		aftersalesStatus: "none",
		currency: "USD",
		totalAmount: "100.00",
		...defaultSiteContext,
	};
	approvalSnapshot: ApprovalSnapshot = {
		requestId: "request-1",
		requestNo: "R202605160001",
		orderId: "order-1",
		status: "requested",
		type: "refund_only",
		reason: "Wrong size",
		requestedAmount: "20.00",
		approvedAmount: null,
		paymentOrderId: "payment-1",
		paymentStatus: "paid",
		orderAftersalesStatus: "requested",
		currency: "USD",
		orderTotalAmount: "100.00",
		alreadyRefundedAmount: "0.00",
		...defaultSiteContext,
	};
	refundSnapshot: RefundSucceededSnapshot = {
		refundId: "refund-1",
		refundNo: "RF202605160001",
		requestId: "request-1",
		paymentOrderId: "payment-1",
		orderId: "order-1",
		status: "requested",
		amount: "20.00",
		currency: "USD",
		idempotencyKey: "approve-refund-key",
		requestStatus: "refunding",
		paymentStatus: "paid",
		orderAftersalesStatus: "refunding",
		orderTotalAmount: "100.00",
		alreadyRefundedAmount: "0.00",
		...defaultSiteContext,
	};
	refundByIdempotency: PaymentRefundSummary | null = null;
	listItems: AdminAfterSalesRequestListItem[] = [
		{
			afterSalesRequestId: "request-1",
			requestNo: "R202605160001",
			orderId: "order-1",
			orderNo: "CB202605160001",
			type: "refund_only",
			status: "requested",
			reason: "Wrong size",
			requestedAmount: "20.00",
			currency: "USD",
			orderStatus: "paid",
			paymentStatus: "paid",
			fulfillmentStatus: "delivered",
			orderAftersalesStatus: "requested",
			totalAmount: "100.00",
			itemCount: 1,
			refundCount: 0,
			createdAt: "2026-05-16T00:00:00.000Z",
			updatedAt: "2026-05-16T00:00:00.000Z",
			...defaultSiteContext,
		},
	];
	detail: AdminAfterSalesRequestDetail = {
		afterSalesRequestId: "request-1",
		requestNo: "R202605160001",
		orderId: "order-1",
		orderNo: "CB202605160001",
		type: "refund_only",
		status: "requested",
		reason: "Wrong size",
		requestedAmount: "20.00",
		currency: "USD",
		orderStatus: "paid",
		paymentStatus: "paid",
		fulfillmentStatus: "delivered",
		orderAftersalesStatus: "requested",
		totalAmount: "100.00",
		itemCount: 1,
		refundCount: 0,
		createdAt: "2026-05-16T00:00:00.000Z",
		updatedAt: "2026-05-16T00:00:00.000Z",
		...defaultSiteContext,
		order: {
			orderId: "order-1",
			orderNo: "CB202605160001",
			orderStatus: "paid",
			paymentStatus: "paid",
			fulfillmentStatus: "delivered",
			aftersalesStatus: "requested",
			currency: "USD",
			totalAmount: "100.00",
			...defaultSiteContext,
		},
		items: [],
		logs: [],
		refunds: [],
	};
	rejectedPlan: RejectAfterSalesRequestPlan | null = null;
	markSucceededPlan: MarkRefundSucceededPlan | null = null;

	async findRequestByIdempotencyKey(): Promise<AfterSalesRequestSummary | null> {
		return this.requestByIdempotency;
	}

	async getOrderForRequestForUpdate(): Promise<AfterSalesOrderSnapshot> {
		return this.orderSnapshot;
	}

	async createRequest(
		plan: CreateAfterSalesRequestPlan,
	): Promise<AfterSalesRequestSummary> {
		return {
			requestId: plan.request.requestId,
			requestNo: plan.request.requestNo,
			orderId: plan.request.orderId,
			status: plan.request.status,
			requestedAmount: plan.request.requestedAmount,
			approvedAmount: plan.request.approvedAmount,
			siteId: plan.request.siteId,
			verticalId: plan.request.verticalId,
			brandId: plan.request.brandId,
		};
	}

	async findRefundByIdempotencyKey(): Promise<PaymentRefundSummary | null> {
		return this.refundByIdempotency;
	}

	async getApprovalSnapshotForUpdate(): Promise<ApprovalSnapshot> {
		return this.approvalSnapshot;
	}

	async approveRefundRequest(
		plan: ApproveRefundPlan,
	): Promise<PaymentRefundSummary> {
		return plan.refund;
	}

	async rejectAfterSalesRequest(
		plan: RejectAfterSalesRequestPlan,
	): Promise<AfterSalesRequestSummary> {
		this.rejectedPlan = plan;
		return {
			requestId: plan.requestId,
			requestNo: this.approvalSnapshot.requestNo,
			orderId: plan.orderId,
			status: plan.toRequestStatus,
			requestedAmount: this.approvalSnapshot.requestedAmount,
			approvedAmount: this.approvalSnapshot.approvedAmount,
			siteId: plan.siteId,
			verticalId: plan.verticalId,
			brandId: plan.brandId,
		};
	}

	async getRefundSucceededSnapshotForUpdate(): Promise<RefundSucceededSnapshot> {
		return this.refundSnapshot;
	}

	async markRefundSucceeded(
		plan: MarkRefundSucceededPlan,
	): Promise<PaymentRefundSummary> {
		this.markSucceededPlan = plan;
		return {
			refundId: plan.refundId,
			refundNo: this.refundSnapshot.refundNo,
			paymentOrderId: this.refundSnapshot.paymentOrderId,
			orderId: this.refundSnapshot.orderId,
			status: "succeeded",
			amount: this.refundSnapshot.amount,
			currency: this.refundSnapshot.currency,
			idempotencyKey: this.refundSnapshot.idempotencyKey,
			providerRefundId: plan.providerRefundId,
			siteId: this.refundSnapshot.siteId,
			verticalId: this.refundSnapshot.verticalId,
			brandId: this.refundSnapshot.brandId,
			...(this.refundSnapshot.requestId
				? { requestId: this.refundSnapshot.requestId }
				: {}),
		};
	}

	async listAdminAfterSalesRequests(
		query: AdminAfterSalesScopeQuery,
	): Promise<AdminAfterSalesRequestListItem[]> {
		this.listQuery = query;
		return this.listItems;
	}

	async getAdminAfterSalesRequestDetail(input: {
		requestId: string;
		adminAccess: AdminAfterSalesScopeQuery["adminAccess"];
	}): Promise<AdminAfterSalesRequestDetail | null> {
		this.detailInput = input;
		return this.detail;
	}
}

function deps() {
	const afterSales = new MemoryAfterSalesRepository();
	const outbox = new MemoryOutbox();

	return {
		afterSales,
		outbox,
		transactions: new NoopTransactionManager(),
		workflow: new AfterSalesWorkflowService(),
	};
}

describe("AfterSales use cases", () => {
	it("creates a site-scoped refund request and queues RefundRequested", async () => {
		const testDeps = deps();
		const useCase = new RequestRefundUseCase(testDeps);
		const result = await useCase.execute({
			requestId: "request-1",
			requestNo: "R202605160001",
			orderId: "order-1",
			guestToken: "guest-1",
			type: "refund_only",
			reason: "Wrong size",
			requestedAmount: "20.00",
			idempotencyKey: "refund-request-key",
			items: [
				{
					afterSalesItemId: "after-sales-item-1",
					orderItemId: "order-item-1",
					quantity: 1,
					requestedAmount: "20.00",
				},
			],
			...defaultSiteContext,
		});

		expect(result.reusedIdempotency).toBe(false);
		expect(testDeps.outbox.events[0]).toMatchObject({
			eventType: "RefundRequested",
			aggregateId: "request-1",
			siteId: defaultSiteContext.siteId,
		});
	});

	it("lists admin after-sales requests with selected scope and normalized limit", async () => {
		const testDeps = deps();
		const useCase = new ListAdminAfterSalesRequestsUseCase(testDeps);
		const access = {
			source: "database" as const,
			adminUserId: "admin-1",
			scopes: [{ scopeType: "site" as const, scopeId: defaultSiteContext.siteId }],
		};

		await useCase.execute({
			adminAccess: access,
			selectedScope: {
				scopeType: "site",
				scopeId: defaultSiteContext.siteId,
			},
			limit: 999,
		});

		expect(testDeps.afterSales.listQuery).toEqual({
			adminAccess: access,
			selectedScope: {
				scopeType: "site",
				scopeId: defaultSiteContext.siteId,
			},
			limit: 100,
		});
	});

	it("gets admin after-sales detail with admin access context", async () => {
		const testDeps = deps();
		const useCase = new GetAdminAfterSalesRequestDetailUseCase(testDeps);
		const access = {
			source: "fallback" as const,
			scopes: [{ scopeType: "global" as const }],
		};

		const detail = await useCase.execute({
			requestId: "request-1",
			adminAccess: access,
		});

		expect(detail?.afterSalesRequestId).toBe("request-1");
		expect(testDeps.afterSales.detailInput).toEqual({
			requestId: "request-1",
			adminAccess: access,
		});
	});

	it("rejects an after-sales request with scope checks and queues RefundRejected", async () => {
		const testDeps = deps();
		const useCase = new RejectAfterSalesRequestUseCase(testDeps);
		const result = await useCase.execute({
			requestId: "request-1",
			reason: "Evidence mismatch",
			adminAccess: {
				source: "database",
				scopes: [
					{ scopeType: "site", scopeId: defaultSiteContext.siteId },
				],
			},
		});

		expect(result.request.status).toBe("rejected");
		expect(testDeps.afterSales.rejectedPlan).toMatchObject({
			toRequestStatus: "rejected",
			toOrderAftersalesStatus: "rejected",
		});
		expect(testDeps.outbox.events[0]).toMatchObject({
			eventType: "RefundRejected",
			aggregateId: "request-1",
			payload: {
				reason: "Evidence mismatch",
			},
		});
	});

	it("blocks reject when admin scope cannot access the request site", async () => {
		const testDeps = deps();
		const useCase = new RejectAfterSalesRequestUseCase(testDeps);

		await expect(
			useCase.execute({
				requestId: "request-1",
				reason: "Evidence mismatch",
				adminAccess: {
					source: "database",
					scopes: [{ scopeType: "site", scopeId: "other-site" }],
				},
			}),
		).rejects.toBeInstanceOf(DomainRuleViolationError);
	});

	it("marks refund succeeded idempotently through payment status propagation", async () => {
		const testDeps = deps();
		const useCase = new MarkRefundSucceededUseCase(testDeps);
		const result = await useCase.execute({
			refundId: "refund-1",
			providerRefundId: "provider-refund-1",
			adminAccess: {
				source: "fallback",
				scopes: [{ scopeType: "global" }],
			},
		});

		expect(result.status).toBe("processed");
		expect(testDeps.afterSales.markSucceededPlan).toMatchObject({
			toPaymentStatus: "partially_refunded",
			toOrderAftersalesStatus: "completed",
		});
		expect(testDeps.outbox.events[0]).toMatchObject({
			eventType: "RefundSucceeded",
			aggregateId: "refund-1",
		});
	});
});
