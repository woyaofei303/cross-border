import {
	BadRequestException,
	Body,
	Controller,
	ForbiddenException,
	Get,
	Post,
	Query,
	Req,
} from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AdminAccessAwareRequest } from "../../../common/admin/admin-access.js";
import {
	type AdminAccessContext,
	hasGlobalAdminScope,
} from "../../../common/admin/admin-access.js";
import { AdminAuditService } from "../../admin-audit/admin-audit.service.js";
import { AdminAccessService } from "../../admin-access/admin-access.service.js";
import { PgAnalyticsRepository } from "../repositories/pg-analytics.repository.js";
import {
	ProcessPendingAnalyticsEventsUseCase,
	ProjectOrderPaidAnalyticsUseCase,
} from "../analytics.use-cases.js";
import {
	AnalyticsStatsQueryDto,
	ChannelPerformanceStatsResponseDto,
	CustomerLtvStatsResponseDto,
	DailySalesStatsResponseDto,
	ProcessPendingAnalyticsEventsRequestDto,
	ProcessPendingAnalyticsEventsResponseDto,
	ProductPerformanceStatsResponseDto,
	ProjectAnalyticsEventRequestDto,
	ProjectAnalyticsEventResponseDto,
} from "./analytics.dto.js";

function assertValidScopeQuery(query: AnalyticsStatsQueryDto): void {
	if (query.scopeType && query.scopeType !== "global" && !query.scopeId) {
		throw new BadRequestException({
			code: "ANALYTICS_SCOPE_ID_REQUIRED",
			message: "scopeId is required for vertical, brand, and site scopes.",
		});
	}

	if (query.scopeType === "global" && query.scopeId) {
		throw new BadRequestException({
			code: "ANALYTICS_GLOBAL_SCOPE_ID_FORBIDDEN",
			message: "scopeId must not be provided for global scope.",
		});
	}
}

function assertGlobalAdminMutation(access: AdminAccessContext): void {
	if (!hasGlobalAdminScope(access.scopes)) {
		throw new ForbiddenException({
			code: "ADMIN_GLOBAL_SCOPE_REQUIRED",
			message: "This admin operation requires global data scope.",
		});
	}
}

@ApiTags("admin-analytics")
@Controller("admin/analytics")
export class AdminAnalyticsController {
	constructor(
		private readonly analytics: PgAnalyticsRepository,
		private readonly adminAccess: AdminAccessService,
		private readonly adminAudit: AdminAuditService,
		private readonly projectOrderPaidAnalytics: ProjectOrderPaidAnalyticsUseCase,
		private readonly processPendingAnalyticsEvents: ProcessPendingAnalyticsEventsUseCase,
	) {}

	@Get("daily-sales")
	@ApiOperation({
		summary: "List daily sales stats with admin data scope applied",
	})
	@ApiOkResponse({ type: DailySalesStatsResponseDto })
	async listDailySales(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AnalyticsStatsQueryDto,
	): Promise<DailySalesStatsResponseDto> {
		assertValidScopeQuery(query);
		const access = await this.adminAccess.resolveForRequest(request);

		return {
			items: await this.analytics.listDailySalesStats(query, access),
		};
	}

	@Get("channel-performance")
	@ApiOperation({
		summary: "List channel performance stats with admin data scope applied",
	})
	@ApiOkResponse({ type: ChannelPerformanceStatsResponseDto })
	async listChannelPerformance(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AnalyticsStatsQueryDto,
	): Promise<ChannelPerformanceStatsResponseDto> {
		assertValidScopeQuery(query);
		const access = await this.adminAccess.resolveForRequest(request);

		return {
			items: await this.analytics.listChannelPerformanceStats(query, access),
		};
	}

	@Get("product-performance")
	@ApiOperation({
		summary: "List product performance stats with admin data scope applied",
	})
	@ApiOkResponse({ type: ProductPerformanceStatsResponseDto })
	async listProductPerformance(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AnalyticsStatsQueryDto,
	): Promise<ProductPerformanceStatsResponseDto> {
		assertValidScopeQuery(query);
		const access = await this.adminAccess.resolveForRequest(request);

		return {
			items: await this.analytics.listProductPerformanceStats(query, access),
		};
	}

	@Get("customer-ltv")
	@ApiOperation({
		summary: "List customer LTV stats with admin data scope applied",
	})
	@ApiOkResponse({ type: CustomerLtvStatsResponseDto })
	async listCustomerLtv(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AnalyticsStatsQueryDto,
	): Promise<CustomerLtvStatsResponseDto> {
		assertValidScopeQuery(query);
		const access = await this.adminAccess.resolveForRequest(request);

		return {
			items: await this.analytics.listCustomerLtvStats(query, access),
		};
	}

	@Post("project-order-paid")
	@ApiOperation({
		summary: "Project an OrderPaid domain event into analytics stats",
		description:
			"Admin/manual entry point for the MVP outbox projection worker. Processing is idempotent through event_process_logs and analytics_events.",
	})
	@ApiOkResponse({ type: ProjectAnalyticsEventResponseDto })
	async projectOrderPaid(
		@Req() request: AdminAccessAwareRequest,
		@Body() body: ProjectAnalyticsEventRequestDto,
	): Promise<ProjectAnalyticsEventResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);

		try {
			assertGlobalAdminMutation(access);
			const result = await this.projectOrderPaidAnalytics.execute(body.eventId);
			await this.adminAudit.record({
				request,
				access,
				action: "analytics.project_order_paid",
				resourceType: "domain_event",
				resourceId: body.eventId,
				afterSnapshot: {
					request: body,
					result,
				},
			});

			return result;
		} catch (error) {
			await this.adminAudit.record({
				request,
				access,
				action:
					error instanceof ForbiddenException
						? "analytics.project_order_paid.denied"
						: "analytics.project_order_paid.failed",
				resourceType: "domain_event",
				resourceId: body.eventId,
				afterSnapshot: {
					request: body,
					errorMessage: error instanceof Error ? error.message : String(error),
				},
			});
			throw error;
		}
	}

	@Post("process-pending")
	@ApiOperation({
		summary: "Claim and process pending OrderPaid analytics outbox events",
		description:
			"Processes a bounded batch of pending or retryable OrderPaid domain events into BI statistics.",
	})
	@ApiOkResponse({ type: ProcessPendingAnalyticsEventsResponseDto })
	async processPending(
		@Req() request: AdminAccessAwareRequest,
		@Body() body: ProcessPendingAnalyticsEventsRequestDto,
	): Promise<ProcessPendingAnalyticsEventsResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);

		try {
			assertGlobalAdminMutation(access);
			const result = await this.processPendingAnalyticsEvents.execute(
				body.limit === undefined ? {} : { limit: body.limit },
			);
			await this.adminAudit.record({
				request,
				access,
				action: "analytics.process_pending",
				resourceType: "domain_event",
				afterSnapshot: {
					request: body,
					result,
				},
			});

			return result;
		} catch (error) {
			await this.adminAudit.record({
				request,
				access,
				action:
					error instanceof ForbiddenException
						? "analytics.process_pending.denied"
						: "analytics.process_pending.failed",
				resourceType: "domain_event",
				afterSnapshot: {
					request: body,
					errorMessage: error instanceof Error ? error.message : String(error),
				},
			});
			throw error;
		}
	}
}
