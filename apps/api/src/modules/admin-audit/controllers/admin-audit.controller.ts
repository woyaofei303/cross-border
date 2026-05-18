import { BadRequestException, Controller, Get, Query, Req } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import type {
	AdminAccessAwareRequest,
	AdminScope,
	AdminScopeType,
} from "../../../common/admin/admin-access.js";
import { AdminAccessService } from "../../admin-access/admin-access.service.js";
import { AdminAuditQueryService } from "../admin-audit-query.service.js";
import type { AdminAuditLogListItem } from "../admin-audit-query.types.js";

export class AdminAuditLogListQueryDto {
	@IsOptional()
	@IsIn(["global", "vertical", "brand", "site"])
	scopeType?: AdminScopeType;

	@IsOptional()
	@IsUUID()
	scopeId?: string;

	@IsOptional()
	@IsString()
	action?: string;

	@IsOptional()
	@IsString()
	resourceType?: string;

	@IsOptional()
	@IsString()
	resourceId?: string;

	@IsOptional()
	@IsUUID()
	actorId?: string;

	@IsOptional()
	@IsString()
	query?: string;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number;
}

function selectedScopeFromQuery(
	query: AdminAuditLogListQueryDto,
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

@ApiTags("admin-audit")
@Controller("admin/audit-logs")
export class AdminAuditController {
	constructor(
		private readonly adminAccess: AdminAccessService,
		private readonly auditQuery: AdminAuditQueryService,
	) {}

	@Get()
	@ApiOperation({ summary: "List audit logs visible to the current admin scope" })
	@ApiOkResponse({ description: "Scoped audit log rows." })
	async listAuditLogs(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AdminAuditLogListQueryDto,
	): Promise<{ items: AdminAuditLogListItem[] }> {
		const access = await this.adminAccess.resolveForRequest(request);
		const selectedScope = selectedScopeFromQuery(query);
		const items = await this.auditQuery.listAuditLogs({
			adminScopes: access.scopes,
			...(selectedScope ? { selectedScope } : {}),
			...(query.action ? { action: query.action } : {}),
			...(query.resourceType ? { resourceType: query.resourceType } : {}),
			...(query.resourceId ? { resourceId: query.resourceId } : {}),
			...(query.actorId ? { actorId: query.actorId } : {}),
			...(query.query ? { query: query.query } : {}),
			...(query.limit !== undefined ? { limit: Number(query.limit) } : {}),
		});

		return { items };
	}
}
