import {
	BadRequestException,
	Body,
	Controller,
	Get,
	NotFoundException,
	Param,
	Post,
	Query,
	Req,
} from "@nestjs/common";
import {
	ApiBadRequestResponse,
	ApiCreatedResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from "@nestjs/swagger";
import {
	createPublicNumber,
	createUuid,
} from "../../../common/ids/public-ids.js";
import {
	getResolvedSiteFromRequest,
	getSiteDimensions,
	type SiteAwareRequest,
} from "../../../common/site/site-context.js";
import type { AdminAccessAwareRequest } from "../../../common/admin/admin-access.js";
import type {
	AdminScope,
	AdminScopeType,
} from "../../../common/admin/admin-access.js";
import { AdminAccessService } from "../../admin-access/admin-access.service.js";
import { AdminAuditService } from "../../admin-audit/admin-audit.service.js";
import {
	ApproveRefundUseCase,
	GetAdminAfterSalesRequestDetailUseCase,
	ListAdminAfterSalesRequestsUseCase,
	MarkRefundSucceededUseCase,
	RejectAfterSalesRequestUseCase,
	RequestRefundUseCase,
} from "../aftersales.use-cases.js";
import {
	AdminAfterSalesListQueryDto,
	AdminAfterSalesListResponseDto,
	AdminAfterSalesRequestDetailDto,
	ApproveRefundRequestDto,
	ApproveRefundResponseDto,
	CreateAfterSalesRequestDto,
	CreateAfterSalesRequestResponseDto,
	MarkRefundSucceededRequestDto,
	MarkRefundSucceededResponseDto,
	RejectAfterSalesRequestDto,
	RejectAfterSalesResponseDto,
} from "./aftersales.dto.js";

function selectedScopeFromQuery(
	query: AdminAfterSalesListQueryDto,
): AdminScope | undefined {
	if (!query.scopeType || query.scopeType === "global") {
		return query.scopeType === "global" ? { scopeType: "global" } : undefined;
	}

	if (!query.scopeId) {
		throw new BadRequestException({
			code: "ADMIN_SCOPE_ID_REQUIRED",
			message: "scopeId is required when scopeType is vertical, brand, or site.",
		});
	}

	return {
		scopeType: query.scopeType as Exclude<AdminScopeType, "global">,
		scopeId: query.scopeId,
	};
}

@ApiTags("after-sales")
@Controller()
export class AfterSalesController {
	constructor(
		private readonly requestRefund: RequestRefundUseCase,
		private readonly listAdminAfterSalesRequests: ListAdminAfterSalesRequestsUseCase,
		private readonly getAdminAfterSalesRequestDetail: GetAdminAfterSalesRequestDetailUseCase,
		private readonly approveRefund: ApproveRefundUseCase,
		private readonly rejectAfterSalesRequest: RejectAfterSalesRequestUseCase,
		private readonly markRefundSucceeded: MarkRefundSucceededUseCase,
		private readonly adminAccess: AdminAccessService,
		private readonly adminAudit: AdminAuditService,
	) {}

	@Post("after-sales/refund-requests")
	@ApiOperation({
		summary: "Create a site-scoped after-sales refund request",
		description:
			"Creates a refund or return-refund request idempotently and writes after-sales/order logs.",
	})
	@ApiCreatedResponse({ type: CreateAfterSalesRequestResponseDto })
	@ApiBadRequestResponse({
		description: "Invalid request shape or domain rule violation.",
	})
	async createRefundRequest(
		@Req() request: SiteAwareRequest,
		@Body() body: CreateAfterSalesRequestDto,
	): Promise<CreateAfterSalesRequestResponseDto> {
		const site = getResolvedSiteFromRequest(request);

		if (!site) {
			throw new NotFoundException({
				code: "SITE_NOT_FOUND",
				message: "No active site is configured for this request domain.",
			});
		}

		const result = await this.requestRefund.execute({
			requestId: body.requestId ?? createUuid(),
			requestNo: body.requestNo ?? createPublicNumber("refund"),
			...getSiteDimensions(site),
			orderId: body.orderId,
			...(body.userId ? { userId: body.userId } : {}),
			...(body.guestToken ? { guestToken: body.guestToken } : {}),
			type: body.type,
			reason: body.reason,
			requestedAmount: body.requestedAmount,
			idempotencyKey: body.idempotencyKey,
			items: body.items.map((item) => ({
				afterSalesItemId: item.afterSalesItemId ?? createUuid(),
				orderItemId: item.orderItemId,
				quantity: item.quantity,
				...(item.requestedAmount
					? { requestedAmount: item.requestedAmount }
					: {}),
			})),
		});

		return {
			requestId: result.request.requestId,
			requestNo: result.request.requestNo,
			orderId: result.request.orderId,
			status: result.request.status,
			reusedIdempotency: result.reusedIdempotency,
			eventsQueued: result.events.length,
		};
	}

	@Get("admin/after-sales/requests")
	@ApiOperation({
		summary: "List after-sales requests visible to the current admin scope",
		description:
			"Returns scoped after-sales requests with order context, item counts and latest refund status.",
	})
	@ApiOkResponse({ type: AdminAfterSalesListResponseDto })
	async listAdminRequests(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AdminAfterSalesListQueryDto,
	): Promise<AdminAfterSalesListResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const selectedScope = selectedScopeFromQuery(query);
		const afterSalesRequests =
			await this.listAdminAfterSalesRequests.execute({
				adminAccess: access,
				...(selectedScope ? { selectedScope } : {}),
				...(query.limit ? { limit: query.limit } : {}),
			});

		return { afterSalesRequests };
	}

	@Get("admin/after-sales/requests/:requestId")
	@ApiOperation({
		summary: "Get after-sales request detail visible to the current admin scope",
		description:
			"Returns request, order context, requested items, logs and linked payment refunds.",
	})
	@ApiOkResponse({ type: AdminAfterSalesRequestDetailDto })
	async getAdminRequestDetail(
		@Req() request: AdminAccessAwareRequest,
		@Param("requestId") requestId: string,
	): Promise<AdminAfterSalesRequestDetailDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const detail = await this.getAdminAfterSalesRequestDetail.execute({
			requestId,
			adminAccess: access,
		});

		if (!detail) {
			throw new NotFoundException({
				code: "AFTERSALES_REQUEST_NOT_FOUND",
				message: "After-sales request was not found for this admin scope.",
			});
		}

		return detail;
	}

	@Post("admin/after-sales/:requestId/approve-refund")
	@ApiOperation({
		summary: "Approve an after-sales request and create a payment refund",
		description:
			"Applies admin RBAC scope, creates a refund order idempotently, and queues RefundApproved.",
	})
	@ApiOkResponse({ type: ApproveRefundResponseDto })
	async approveRefundRequest(
		@Req() request: AdminAccessAwareRequest,
		@Param("requestId") requestId: string,
		@Body() body: ApproveRefundRequestDto,
	): Promise<ApproveRefundResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);

		try {
			const result = await this.approveRefund.execute({
				requestId,
				refundId: body.refundId ?? createUuid(),
				refundNo: body.refundNo ?? createPublicNumber("refund"),
				approvedAmount: body.approvedAmount,
				idempotencyKey: body.idempotencyKey,
				adminAccess: access,
			});
			await this.adminAudit.record({
				request,
				access,
				action: "aftersales.approve_refund",
				resourceType: "after_sales_request",
				resourceId: requestId,
				siteId: result.refund.siteId,
				verticalId: result.refund.verticalId,
				brandId: result.refund.brandId,
				afterSnapshot: {
					refundId: result.refund.refundId,
					status: result.refund.status,
					reusedIdempotency: result.reusedIdempotency,
				},
			});

			return {
				refundId: result.refund.refundId,
				refundNo: result.refund.refundNo,
				requestId: result.refund.requestId ?? requestId,
				orderId: result.refund.orderId,
				status: result.refund.status,
				reusedIdempotency: result.reusedIdempotency,
				eventsQueued: result.events.length,
			};
		} catch (error) {
			await this.adminAudit.record({
				request,
				access,
				action: "aftersales.approve_refund.failed",
				resourceType: "after_sales_request",
				resourceId: requestId,
				afterSnapshot: {
					request: body,
					errorMessage: error instanceof Error ? error.message : String(error),
				},
			});
			throw error;
		}
	}

	@Post("admin/after-sales/:requestId/reject")
	@ApiOperation({
		summary: "Reject an after-sales request",
		description:
			"Applies admin RBAC scope, rejects a reviewable request, updates order after-sales status and queues RefundRejected.",
	})
	@ApiOkResponse({ type: RejectAfterSalesResponseDto })
	async rejectRequest(
		@Req() request: AdminAccessAwareRequest,
		@Param("requestId") requestId: string,
		@Body() body: RejectAfterSalesRequestDto,
	): Promise<RejectAfterSalesResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);

		try {
			const result = await this.rejectAfterSalesRequest.execute({
				requestId,
				reason: body.reason,
				adminAccess: access,
			});
			await this.adminAudit.record({
				request,
				access,
				action: "aftersales.reject_request",
				resourceType: "after_sales_request",
				resourceId: requestId,
				siteId: result.request.siteId,
				verticalId: result.request.verticalId,
				brandId: result.request.brandId,
				afterSnapshot: {
					status: result.request.status,
					reason: body.reason,
				},
			});

			return {
				requestId: result.request.requestId,
				requestNo: result.request.requestNo,
				orderId: result.request.orderId,
				status: result.request.status,
				eventsQueued: result.events.length,
			};
		} catch (error) {
			await this.adminAudit.record({
				request,
				access,
				action: "aftersales.reject_request.failed",
				resourceType: "after_sales_request",
				resourceId: requestId,
				afterSnapshot: {
					request: body,
					errorMessage: error instanceof Error ? error.message : String(error),
				},
			});
			throw error;
		}
	}

	@Post("admin/payment-refunds/:refundId/mark-succeeded")
	@ApiOperation({
		summary: "Mark a payment refund as succeeded",
		description:
			"Records provider refund success, updates order payment/after-sales status, and queues RefundSucceeded.",
	})
	@ApiOkResponse({ type: MarkRefundSucceededResponseDto })
	async markSucceeded(
		@Req() request: AdminAccessAwareRequest,
		@Param("refundId") refundId: string,
		@Body() body: MarkRefundSucceededRequestDto,
	): Promise<MarkRefundSucceededResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);

		try {
			const result = await this.markRefundSucceeded.execute({
				refundId,
				providerRefundId: body.providerRefundId,
				...(body.responsePayload
					? { responsePayload: body.responsePayload }
					: {}),
				adminAccess: access,
			});
			await this.adminAudit.record({
				request,
				access,
				action: "payment_refund.mark_succeeded",
				resourceType: "payment_refund",
				resourceId: refundId,
				...(result.status === "failed"
					? {}
					: {
							siteId: result.refund.siteId,
							verticalId: result.refund.verticalId,
							brandId: result.refund.brandId,
						}),
				afterSnapshot: result,
			});

			return {
				status: result.status,
				...(result.status === "failed"
					? { errorMessage: result.errorMessage }
					: {
							refundId: result.refund.refundId,
							...(result.refund.providerRefundId
								? { providerRefundId: result.refund.providerRefundId }
								: {}),
						}),
				eventsQueued: result.events.length,
			};
		} catch (error) {
			await this.adminAudit.record({
				request,
				access,
				action: "payment_refund.mark_succeeded.failed",
				resourceType: "payment_refund",
				resourceId: refundId,
				afterSnapshot: {
					request: body,
					errorMessage: error instanceof Error ? error.message : String(error),
				},
			});
			throw error;
		}
	}
}
