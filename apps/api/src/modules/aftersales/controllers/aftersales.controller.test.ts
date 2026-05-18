import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import type { AdminAccessService } from "../../admin-access/admin-access.service.js";
import type { AdminAuditService } from "../../admin-audit/admin-audit.service.js";
import type {
	ApproveRefundUseCase,
	GetAdminAfterSalesRequestDetailUseCase,
	ListAdminAfterSalesRequestsUseCase,
	MarkRefundSucceededUseCase,
	RejectAfterSalesRequestUseCase,
	RequestRefundUseCase,
} from "../aftersales.use-cases.js";
import { AfterSalesController } from "./aftersales.controller.js";

function createController(input: {
	requestRefund?: unknown;
	listAdmin?: unknown;
	getAdminDetail?: unknown;
	approveRefund?: unknown;
	rejectRequest?: unknown;
	markSucceeded?: unknown;
	access?: unknown;
	audit?: unknown;
}) {
	return new AfterSalesController(
		(input.requestRefund ?? { execute: async () => ({}) }) as RequestRefundUseCase,
		(input.listAdmin ?? { execute: async () => [] }) as ListAdminAfterSalesRequestsUseCase,
		(input.getAdminDetail ?? { execute: async () => null }) as GetAdminAfterSalesRequestDetailUseCase,
		(input.approveRefund ?? { execute: async () => ({}) }) as ApproveRefundUseCase,
		(input.rejectRequest ?? { execute: async () => ({}) }) as RejectAfterSalesRequestUseCase,
		(input.markSucceeded ?? { execute: async () => ({}) }) as MarkRefundSucceededUseCase,
		(input.access ?? {
			resolveForRequest: async () => ({
				source: "fallback",
				scopes: [{ scopeType: "global" }],
			}),
		}) as AdminAccessService,
		(input.audit ?? { record: async () => undefined }) as AdminAuditService,
	);
}

const adminAccess = {
	source: "database" as const,
	adminUserId: "admin-1",
	scopes: [{ scopeType: "site" as const, scopeId: defaultSiteContext.siteId }],
};

const adminRequest = {
	headers: { "x-admin-user-id": "admin-1" },
};

describe("AfterSalesController admin routes", () => {
	it("lists scoped after-sales requests", async () => {
		const resolveForRequest = vi.fn(async () => adminAccess);
		const execute = vi.fn(async () => [
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
		]);
		const controller = createController({
			access: { resolveForRequest },
			listAdmin: { execute },
		});

		const response = await controller.listAdminRequests(adminRequest, {
			scopeType: "site",
			scopeId: defaultSiteContext.siteId,
			limit: 20,
		});

		expect(execute).toHaveBeenCalledWith({
			adminAccess,
			selectedScope: {
				scopeType: "site",
				scopeId: defaultSiteContext.siteId,
			},
			limit: 20,
		});
		expect(response.afterSalesRequests[0]?.requestNo).toBe("R202605160001");
	});

	it("rejects non-global selected scope without scope id", async () => {
		const controller = createController({
			access: {
				resolveForRequest: async () => adminAccess,
			},
			listAdmin: {
				execute: async () => {
					throw new Error("Should not list without scope id.");
				},
			},
		});

		await expect(
			controller.listAdminRequests(adminRequest, { scopeType: "site" }),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it("returns scoped after-sales detail or a not-found error", async () => {
		const execute = vi.fn(async () => ({
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
			...defaultSiteContext,
		}));
		const controller = createController({
			access: {
				resolveForRequest: async () => adminAccess,
			},
			getAdminDetail: { execute },
		});

		const detail = await controller.getAdminRequestDetail(
			adminRequest,
			"request-1",
		);

		expect(detail.afterSalesRequestId).toBe("request-1");
		expect(execute).toHaveBeenCalledWith({
			requestId: "request-1",
			adminAccess,
		});

		const missingController = createController({
			access: {
				resolveForRequest: async () => adminAccess,
			},
			getAdminDetail: { execute: async () => null },
		});

		await expect(
			missingController.getAdminRequestDetail(adminRequest, "missing"),
		).rejects.toBeInstanceOf(NotFoundException);
	});

	it("audits approve refund with site dimensions", async () => {
		const record = vi.fn(async () => undefined);
		const execute = vi.fn(async () => ({
			refund: {
				refundId: "refund-1",
				refundNo: "RF202605160001",
				requestId: "request-1",
				paymentOrderId: "payment-1",
				orderId: "order-1",
				status: "requested",
				amount: "20.00",
				currency: "USD",
				idempotencyKey: "approve-refund-key",
				...defaultSiteContext,
			},
			reusedIdempotency: false,
			events: [{ eventType: "RefundApproved" }],
		}));
		const controller = createController({
			access: {
				resolveForRequest: async () => adminAccess,
			},
			audit: { record },
			approveRefund: { execute },
		});

		const response = await controller.approveRefundRequest(
			adminRequest,
			"request-1",
			{
				approvedAmount: "20.00",
				idempotencyKey: "approve-refund-key",
			},
		);

		expect(response.refundId).toBe("refund-1");
		expect(record).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "aftersales.approve_refund",
				resourceId: "request-1",
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
			}),
		);
	});

	it("audits reject request with site dimensions", async () => {
		const record = vi.fn(async () => undefined);
		const execute = vi.fn(async () => ({
			request: {
				requestId: "request-1",
				requestNo: "R202605160001",
				orderId: "order-1",
				status: "rejected",
				requestedAmount: "20.00",
				approvedAmount: null,
				...defaultSiteContext,
			},
			events: [{ eventType: "RefundRejected" }],
		}));
		const controller = createController({
			access: {
				resolveForRequest: async () => adminAccess,
			},
			audit: { record },
			rejectRequest: { execute },
		});

		const response = await controller.rejectRequest(
			adminRequest,
			"request-1",
			{ reason: "Evidence mismatch" },
		);

		expect(response.status).toBe("rejected");
		expect(record).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "aftersales.reject_request",
				resourceId: "request-1",
				siteId: defaultSiteContext.siteId,
			}),
		);
	});

	it("audits successful payment refund completion with site dimensions", async () => {
		const record = vi.fn(async () => undefined);
		const execute = vi.fn(async () => ({
			status: "processed" as const,
			refund: {
				refundId: "refund-1",
				refundNo: "RF202605160001",
				requestId: "request-1",
				paymentOrderId: "payment-1",
				orderId: "order-1",
				status: "succeeded",
				amount: "20.00",
				currency: "USD",
				idempotencyKey: "approve-refund-key",
				providerRefundId: "provider-refund-1",
				...defaultSiteContext,
			},
			events: [{ eventType: "RefundSucceeded" }],
		}));
		const controller = createController({
			access: {
				resolveForRequest: async () => adminAccess,
			},
			audit: { record },
			markSucceeded: { execute },
		});

		const response = await controller.markSucceeded(adminRequest, "refund-1", {
			providerRefundId: "provider-refund-1",
		});

		expect(response).toMatchObject({
			status: "processed",
			refundId: "refund-1",
			providerRefundId: "provider-refund-1",
			eventsQueued: 1,
		});
		expect(record).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "payment_refund.mark_succeeded",
				resourceId: "refund-1",
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
			}),
		);
	});
});
