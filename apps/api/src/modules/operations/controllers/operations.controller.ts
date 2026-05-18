import {
	Body,
	Controller,
	ForbiddenException,
	Get,
	Post,
	Query,
	Req,
} from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type {
	AdminAccessAwareRequest,
	AdminAccessContext,
} from "../../../common/admin/admin-access.js";
import { hasGlobalAdminScope } from "../../../common/admin/admin-access.js";
import { AdminAuditService } from "../../admin-audit/admin-audit.service.js";
import { AdminAccessService } from "../../admin-access/admin-access.service.js";
import { ProcessCommercePipelineUseCase } from "../operations.use-cases.js";
import { PgOperationsRepository } from "../repositories/pg-operations.repository.js";
import {
	OperationsDashboardQueryDto,
	OperationsRiskDashboardResponseDto,
	ProcessCommercePipelineRequestDto,
	ProcessCommercePipelineResponseDto,
} from "./operations.dto.js";

function assertGlobalAdminMutation(access: AdminAccessContext): void {
	if (!hasGlobalAdminScope(access.scopes)) {
		throw new ForbiddenException({
			code: "ADMIN_GLOBAL_SCOPE_REQUIRED",
			message: "This admin operation requires global data scope.",
		});
	}
}

@ApiTags("admin-operations")
@Controller("admin/operations")
export class AdminOperationsController {
	constructor(
		private readonly operations: PgOperationsRepository,
		private readonly adminAccess: AdminAccessService,
		private readonly adminAudit: AdminAuditService,
		private readonly processCommercePipeline: ProcessCommercePipelineUseCase,
	) {}

	@Get("risk-dashboard")
	@ApiOperation({
		summary: "List high-risk order, payment, and inventory operations",
		description:
			"Returns recent scoped records for order state, payment webhook idempotency, inventory locks, and inventory transactions.",
	})
	@ApiOkResponse({ type: OperationsRiskDashboardResponseDto })
	async getRiskDashboard(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: OperationsDashboardQueryDto,
	): Promise<OperationsRiskDashboardResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);

		return this.operations.listRiskDashboard(query, access);
	}

	@Post("process-pending-commerce")
	@ApiOperation({
		summary: "Process pending commerce operational events",
		description:
			"Claims a bounded batch of payment webhooks, applies PaymentSucceeded events to orders and inventory, then projects OrderPaid analytics.",
	})
	@ApiOkResponse({ type: ProcessCommercePipelineResponseDto })
	async processPendingCommerce(
		@Req() request: AdminAccessAwareRequest,
		@Body() body: ProcessCommercePipelineRequestDto,
	): Promise<ProcessCommercePipelineResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);

		try {
			assertGlobalAdminMutation(access);
			const result = await this.processCommercePipeline.execute(
				body.limit === undefined ? {} : { limit: body.limit },
			);
			await this.adminAudit.record({
				request,
				access,
				action: "operations.process_pending_commerce",
				resourceType: "commerce_pipeline",
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
						? "operations.process_pending_commerce.denied"
						: "operations.process_pending_commerce.failed",
				resourceType: "commerce_pipeline",
				afterSnapshot: {
					request: body,
					errorMessage: error instanceof Error ? error.message : String(error),
				},
			});
			throw error;
		}
	}
}
