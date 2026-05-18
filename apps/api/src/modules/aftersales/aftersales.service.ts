import { Injectable } from "@nestjs/common";
import type { PaymentStatus } from "@cross-border/shared";
import { assertDomainRule } from "../../common/domain/domain-errors.js";
import { assertIdempotencyKey } from "../../common/idempotency/assert-idempotency-key.js";
import { parseMoneyToMinorUnits } from "../../common/money/money.js";
import type {
	AfterSalesOrderSnapshot,
	ApprovalSnapshot,
	ApproveRefundInput,
	ApproveRefundPlan,
	CreateAfterSalesRequestPlan,
	MarkRefundSucceededInput,
	MarkRefundSucceededPlan,
	RejectAfterSalesRequestInput,
	RejectAfterSalesRequestPlan,
	RequestRefundInput,
	RefundSucceededSnapshot,
} from "./aftersales.types.js";

function assertPositiveMoney(amount: string, code: string, message: string): void {
	assertDomainRule(parseMoneyToMinorUnits(amount) > 0n, code, message);
}

function formatMinorUnits(value: bigint): string {
	const sign = value < 0n ? "-" : "";
	const absolute = value < 0n ? -value : value;
	const major = absolute / 100n;
	const minor = (absolute % 100n).toString().padStart(2, "0");

	return `${sign}${major}.${minor}`;
}

function assertRefundablePaymentStatus(status: PaymentStatus): void {
	assertDomainRule(
		status === "paid" || status === "partially_refunded",
		"AFTERSALES_ORDER_NOT_REFUNDABLE",
		"Only paid or partially refunded orders can be refunded.",
	);
}

@Injectable()
export class AfterSalesWorkflowService {
	planRequestRefund(input: {
		request: RequestRefundInput;
		order: AfterSalesOrderSnapshot;
	}): CreateAfterSalesRequestPlan {
		assertIdempotencyKey(input.request.idempotencyKey);
		assertPositiveMoney(
			input.request.requestedAmount,
			"AFTERSALES_REQUEST_AMOUNT_INVALID",
			"Requested refund amount must be greater than zero.",
		);
		assertDomainRule(
			input.request.reason.trim().length > 0,
			"AFTERSALES_REASON_REQUIRED",
			"After-sales reason is required.",
		);
		assertDomainRule(
			input.request.items.length > 0,
			"AFTERSALES_ITEMS_REQUIRED",
			"At least one after-sales item is required.",
		);
		assertDomainRule(
			Boolean(input.request.userId || input.request.guestToken),
			"AFTERSALES_BUYER_SCOPE_REQUIRED",
			"After-sales request must include a user or guest buyer scope.",
		);
		assertDomainRule(
			input.request.siteId === input.order.siteId &&
				input.request.verticalId === input.order.verticalId &&
				input.request.brandId === input.order.brandId,
			"AFTERSALES_SITE_SCOPE_MISMATCH",
			"After-sales request site scope does not match the order.",
		);
		assertRefundablePaymentStatus(input.order.paymentStatus);

		if (input.request.userId) {
			assertDomainRule(
				input.order.userId === input.request.userId,
				"AFTERSALES_USER_MISMATCH",
				"After-sales user does not match the order owner.",
			);
		}

		if (input.request.guestToken) {
			assertDomainRule(
				input.order.guestToken === input.request.guestToken,
				"AFTERSALES_GUEST_MISMATCH",
				"After-sales guest token does not match the order owner.",
			);
		}

		for (const item of input.request.items) {
			assertDomainRule(
				item.quantity > 0,
				"AFTERSALES_ITEM_QUANTITY_INVALID",
				"After-sales item quantity must be greater than zero.",
			);

			if (item.requestedAmount) {
				assertPositiveMoney(
					item.requestedAmount,
					"AFTERSALES_ITEM_AMOUNT_INVALID",
					"After-sales item requested amount must be greater than zero.",
				);
			}
		}

		return {
			request: {
				requestId: input.request.requestId,
				requestNo: input.request.requestNo,
				orderId: input.request.orderId,
				siteId: input.request.siteId,
				verticalId: input.request.verticalId,
				brandId: input.request.brandId,
				status: "requested",
				type: input.request.type,
				reason: input.request.reason,
				...(input.request.userId ? { userId: input.request.userId } : {}),
				requestedAmount: input.request.requestedAmount,
				approvedAmount: null,
				idempotencyKey: input.request.idempotencyKey,
			},
			items: input.request.items,
			orderAftersalesFromStatus: input.order.aftersalesStatus,
		};
	}

	planApproveRefund(input: {
		command: ApproveRefundInput;
		snapshot: ApprovalSnapshot;
	}): ApproveRefundPlan {
		assertIdempotencyKey(input.command.idempotencyKey);
		assertPositiveMoney(
			input.command.approvedAmount,
			"AFTERSALES_APPROVED_AMOUNT_INVALID",
			"Approved refund amount must be greater than zero.",
		);
		assertDomainRule(
			input.snapshot.status === "requested" ||
				input.snapshot.status === "reviewing",
			"AFTERSALES_REQUEST_STATUS_NOT_APPROVABLE",
			"Only requested or reviewing after-sales requests can be approved.",
		);
		assertRefundablePaymentStatus(input.snapshot.paymentStatus);

		const requestedAmount = input.snapshot.requestedAmount
			? parseMoneyToMinorUnits(input.snapshot.requestedAmount)
			: undefined;
		const approvedAmount = parseMoneyToMinorUnits(input.command.approvedAmount);
		const orderTotal = parseMoneyToMinorUnits(input.snapshot.orderTotalAmount);
		const alreadyRefunded = parseMoneyToMinorUnits(
			input.snapshot.alreadyRefundedAmount,
		);
		const remaining = orderTotal - alreadyRefunded;

		assertDomainRule(
			requestedAmount === undefined || approvedAmount <= requestedAmount,
			"AFTERSALES_APPROVED_AMOUNT_EXCEEDS_REQUESTED",
			"Approved refund amount cannot exceed the requested amount.",
		);
		assertDomainRule(
			approvedAmount <= remaining,
			"AFTERSALES_APPROVED_AMOUNT_EXCEEDS_REMAINING",
			"Approved refund amount cannot exceed the remaining refundable amount.",
		);

		return {
			requestId: input.snapshot.requestId,
			fromRequestStatus: input.snapshot.status,
			fromOrderAftersalesStatus: input.snapshot.orderAftersalesStatus,
			toRequestStatus: "refunding",
			refund: {
				refundId: input.command.refundId,
				refundNo: input.command.refundNo,
				requestId: input.snapshot.requestId,
				paymentOrderId: input.snapshot.paymentOrderId,
				orderId: input.snapshot.orderId,
				siteId: input.snapshot.siteId,
				verticalId: input.snapshot.verticalId,
				brandId: input.snapshot.brandId,
				status: "requested",
				amount: input.command.approvedAmount,
				currency: input.snapshot.currency,
				reason: input.snapshot.reason,
				idempotencyKey: input.command.idempotencyKey,
				requestPayload: {
					afterSalesRequestId: input.snapshot.requestId,
					approvedAmount: input.command.approvedAmount,
					remainingRefundableAmount: formatMinorUnits(remaining),
				},
			},
		};
	}

	planRejectRequest(input: {
		command: RejectAfterSalesRequestInput;
		snapshot: ApprovalSnapshot;
	}): RejectAfterSalesRequestPlan {
		assertDomainRule(
			input.command.reason.trim().length > 0,
			"AFTERSALES_REJECT_REASON_REQUIRED",
			"Reject reason is required.",
		);
		assertDomainRule(
			input.snapshot.status === "requested" ||
				input.snapshot.status === "reviewing",
			"AFTERSALES_REQUEST_STATUS_NOT_REJECTABLE",
			"Only requested or reviewing after-sales requests can be rejected.",
		);

		return {
			requestId: input.snapshot.requestId,
			orderId: input.snapshot.orderId,
			siteId: input.snapshot.siteId,
			verticalId: input.snapshot.verticalId,
			brandId: input.snapshot.brandId,
			reason: input.command.reason,
			fromRequestStatus: input.snapshot.status,
			toRequestStatus: "rejected",
			fromOrderAftersalesStatus: input.snapshot.orderAftersalesStatus,
			toOrderAftersalesStatus: "rejected",
		};
	}

	planMarkRefundSucceeded(input: {
		command: MarkRefundSucceededInput;
		snapshot: RefundSucceededSnapshot;
	}): MarkRefundSucceededPlan {
		assertDomainRule(
			input.snapshot.status === "requested" ||
				input.snapshot.status === "processing",
			"PAYMENT_REFUND_STATUS_NOT_COMPLETABLE",
			"Only requested or processing refunds can be marked as succeeded.",
		);
		assertRefundablePaymentStatus(input.snapshot.paymentStatus);

		const refundAmount = parseMoneyToMinorUnits(input.snapshot.amount);
		const orderTotal = parseMoneyToMinorUnits(input.snapshot.orderTotalAmount);
		const alreadyRefunded = parseMoneyToMinorUnits(
			input.snapshot.alreadyRefundedAmount,
		);
		const refundedAfterThis = alreadyRefunded + refundAmount;
		const nextPaymentStatus: PaymentStatus =
			refundedAfterThis >= orderTotal ? "refunded" : "partially_refunded";
		const responsePayload = input.command.responsePayload ?? {
			providerRefundId: input.command.providerRefundId,
		};

		return {
			refundId: input.snapshot.refundId,
			providerRefundId: input.command.providerRefundId,
			responsePayload,
			fromRefundStatus: input.snapshot.status,
			fromPaymentStatus: input.snapshot.paymentStatus,
			toPaymentStatus: nextPaymentStatus,
			fromOrderAftersalesStatus: input.snapshot.orderAftersalesStatus,
			toOrderAftersalesStatus: "completed",
			...(input.snapshot.requestStatus
				? {
						fromRequestStatus: input.snapshot.requestStatus,
						toRequestStatus: "completed" as const,
					}
				: {}),
			transaction: {
				paymentOrderId: input.snapshot.paymentOrderId,
				siteId: input.snapshot.siteId,
				verticalId: input.snapshot.verticalId,
				brandId: input.snapshot.brandId,
				channelCode: "manual",
				providerTransactionId: input.command.providerRefundId,
				amount: input.snapshot.amount,
				currency: input.snapshot.currency,
				rawPayload: responsePayload,
			},
		};
	}
}
