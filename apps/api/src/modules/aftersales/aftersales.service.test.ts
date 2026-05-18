import { describe, expect, it } from "vitest";
import { DomainRuleViolationError } from "../../common/domain/domain-errors.js";
import { defaultSiteContext } from "../../common/site/site-context.js";
import { AfterSalesWorkflowService } from "./aftersales.service.js";
import type {
	ApprovalSnapshot,
	RefundSucceededSnapshot,
	RequestRefundInput,
} from "./aftersales.types.js";

const service = new AfterSalesWorkflowService();

function requestInput(
	overrides: Partial<RequestRefundInput> = {},
): RequestRefundInput {
	return {
		requestId: "00000000-0000-4000-8000-00000000a101",
		requestNo: "R202605160001",
		orderId: "00000000-0000-4000-8000-00000000b101",
		userId: "00000000-0000-4000-8000-00000000c101",
		type: "refund_only",
		reason: "Wrong size",
		requestedAmount: "20.00",
		idempotencyKey: "refund-request-key",
		items: [
			{
				afterSalesItemId: "00000000-0000-4000-8000-00000000d101",
				orderItemId: "00000000-0000-4000-8000-00000000e101",
				quantity: 1,
				requestedAmount: "20.00",
			},
		],
		...defaultSiteContext,
		...overrides,
	};
}

function approvalSnapshot(
	overrides: Partial<ApprovalSnapshot> = {},
): ApprovalSnapshot {
	return {
		requestId: "00000000-0000-4000-8000-00000000a101",
		requestNo: "R202605160001",
		orderId: "00000000-0000-4000-8000-00000000b101",
		status: "requested",
		type: "refund_only",
		reason: "Wrong size",
		requestedAmount: "20.00",
		approvedAmount: null,
		paymentOrderId: "00000000-0000-4000-8000-00000000f101",
		paymentStatus: "paid",
		orderAftersalesStatus: "requested",
		currency: "USD",
		orderTotalAmount: "100.00",
		alreadyRefundedAmount: "0.00",
		...defaultSiteContext,
		...overrides,
	};
}

function refundSnapshot(
	overrides: Partial<RefundSucceededSnapshot> = {},
): RefundSucceededSnapshot {
	return {
		refundId: "00000000-0000-4000-8000-00000000f201",
		refundNo: "RF202605160001",
		requestId: "00000000-0000-4000-8000-00000000a101",
		paymentOrderId: "00000000-0000-4000-8000-00000000f101",
		orderId: "00000000-0000-4000-8000-00000000b101",
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
		...overrides,
	};
}

describe("AfterSalesWorkflowService", () => {
	it("plans a site-scoped refund request", () => {
		const request = requestInput();
		const plan = service.planRequestRefund({
			request,
			order: {
				orderId: request.orderId,
				...(request.userId ? { userId: request.userId } : {}),
				paymentStatus: "paid",
				aftersalesStatus: "none",
				currency: "USD",
				totalAmount: "100.00",
				...defaultSiteContext,
			},
		});

		expect(plan.request).toMatchObject({
			requestId: request.requestId,
			status: "requested",
			requestedAmount: "20.00",
			idempotencyKey: "refund-request-key",
		});
		expect(plan.orderAftersalesFromStatus).toBe("none");
	});

	it("rejects refund requests for unpaid orders", () => {
		const request = requestInput();

		expect(() =>
			service.planRequestRefund({
				request,
				order: {
					orderId: request.orderId,
					...(request.userId ? { userId: request.userId } : {}),
					paymentStatus: "unpaid",
					aftersalesStatus: "none",
					currency: "USD",
					totalAmount: "100.00",
					...defaultSiteContext,
				},
			}),
		).toThrow(DomainRuleViolationError);
	});

	it("rejects refund requests without a buyer scope", () => {
		const request = requestInput();
		delete request.userId;
		delete request.guestToken;

		expect(() =>
			service.planRequestRefund({
				request,
				order: {
					orderId: request.orderId,
					paymentStatus: "paid",
					aftersalesStatus: "none",
					currency: "USD",
					totalAmount: "100.00",
					...defaultSiteContext,
				},
			}),
		).toThrow(DomainRuleViolationError);
	});

	it("plans approval only within remaining refundable amount", () => {
		const plan = service.planApproveRefund({
			command: {
				requestId: "00000000-0000-4000-8000-00000000a101",
				refundId: "00000000-0000-4000-8000-00000000f201",
				refundNo: "RF202605160001",
				approvedAmount: "20.00",
				idempotencyKey: "approve-refund-key",
				adminAccess: { source: "fallback", scopes: [{ scopeType: "global" }] },
			},
			snapshot: approvalSnapshot(),
		});

		expect(plan.refund).toMatchObject({
			status: "requested",
			amount: "20.00",
			currency: "USD",
		});
		expect(plan.toRequestStatus).toBe("refunding");
	});

	it("rejects approval above requested amount", () => {
		expect(() =>
			service.planApproveRefund({
				command: {
					requestId: "00000000-0000-4000-8000-00000000a101",
					refundId: "00000000-0000-4000-8000-00000000f201",
					refundNo: "RF202605160001",
					approvedAmount: "30.00",
					idempotencyKey: "approve-refund-key",
					adminAccess: {
						source: "fallback",
						scopes: [{ scopeType: "global" }],
					},
				},
				snapshot: approvalSnapshot(),
			}),
		).toThrow(DomainRuleViolationError);
	});

	it("plans rejecting a reviewable after-sales request", () => {
		const plan = service.planRejectRequest({
			command: {
				requestId: "00000000-0000-4000-8000-00000000a101",
				reason: "Evidence does not match the order item.",
				adminAccess: { source: "fallback", scopes: [{ scopeType: "global" }] },
			},
			snapshot: approvalSnapshot({ status: "reviewing" }),
		});

		expect(plan).toMatchObject({
			requestId: "00000000-0000-4000-8000-00000000a101",
			fromRequestStatus: "reviewing",
			toRequestStatus: "rejected",
			toOrderAftersalesStatus: "rejected",
			reason: "Evidence does not match the order item.",
		});
	});

	it("rejects after-sales rejection without a reason", () => {
		expect(() =>
			service.planRejectRequest({
				command: {
					requestId: "00000000-0000-4000-8000-00000000a101",
					reason: " ",
					adminAccess: {
						source: "fallback",
						scopes: [{ scopeType: "global" }],
					},
				},
				snapshot: approvalSnapshot(),
			}),
		).toThrow(DomainRuleViolationError);
	});

	it("marks partial and full refunds through payment status transitions", () => {
		const partial = service.planMarkRefundSucceeded({
			command: {
				refundId: "00000000-0000-4000-8000-00000000f201",
				providerRefundId: "provider-refund-1",
				adminAccess: { source: "fallback", scopes: [{ scopeType: "global" }] },
			},
			snapshot: refundSnapshot(),
		});
		const full = service.planMarkRefundSucceeded({
			command: {
				refundId: "00000000-0000-4000-8000-00000000f201",
				providerRefundId: "provider-refund-2",
				adminAccess: { source: "fallback", scopes: [{ scopeType: "global" }] },
			},
			snapshot: refundSnapshot({
				amount: "20.00",
				alreadyRefundedAmount: "80.00",
			}),
		});

		expect(partial.toPaymentStatus).toBe("partially_refunded");
		expect(full.toPaymentStatus).toBe("refunded");
	});
});
