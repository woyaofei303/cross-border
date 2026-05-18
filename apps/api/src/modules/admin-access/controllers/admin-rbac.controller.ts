import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import {
	ApiCreatedResponse,
	ApiForbiddenResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from "@nestjs/swagger";
import { IsIn, IsOptional, IsUUID } from "class-validator";
import type {
	AdminAccessAwareRequest,
	AdminScopeType,
} from "../../../common/admin/admin-access.js";
import { AdminAuditService } from "../../admin-audit/admin-audit.service.js";
import { AdminAccessService } from "../admin-access.service.js";
import { AdminRbacService } from "../admin-rbac.service.js";
import type {
	AdminRbacSnapshot,
	AdminScopeAssignment,
} from "../admin-rbac.types.js";

export class AssignAdminScopeDto {
	@IsIn(["global", "vertical", "brand", "site"])
	scopeType!: AdminScopeType;

	@IsOptional()
	@IsUUID()
	scopeId?: string;
}

function dimensionsFromAssignedScope(scope: AdminScopeAssignment) {
	if (scope.scopeType === "site" && scope.scopeId) {
		return { siteId: scope.scopeId };
	}

	if (scope.scopeType === "vertical" && scope.scopeId) {
		return { verticalId: scope.scopeId };
	}

	if (scope.scopeType === "brand" && scope.scopeId) {
		return { brandId: scope.scopeId };
	}

	return {};
}

@ApiTags("admin-rbac")
@Controller("admin/rbac")
export class AdminRbacController {
	constructor(
		private readonly adminAccess: AdminAccessService,
		private readonly adminRbac: AdminRbacService,
		private readonly adminAudit: AdminAuditService,
	) {}

	@Get()
	@ApiOperation({ summary: "Read admin users, roles, permissions, and scopes" })
	@ApiOkResponse({ description: "RBAC snapshot visible to global admins." })
	async getRbacSnapshot(): Promise<AdminRbacSnapshot> {
		return this.adminRbac.getSnapshot();
	}

	@Post("users/:adminUserId/scopes")
	@ApiOperation({ summary: "Assign an Admin RBAC data scope" })
	@ApiCreatedResponse({ description: "Assigned admin scope." })
	@ApiForbiddenResponse({ description: "Only global admins can assign scopes." })
	async assignAdminScope(
		@Req() request: AdminAccessAwareRequest,
		@Param("adminUserId") adminUserId: string,
		@Body() body: AssignAdminScopeDto,
	): Promise<{ scope: AdminScopeAssignment }> {
		const access = await this.adminAccess.resolveForRequest(request);
		const scope = await this.adminRbac.assignScope({
			actorScopes: access.scopes,
			adminUserId,
			scopeType: body.scopeType,
			...(body.scopeId ? { scopeId: body.scopeId } : {}),
		});

		await this.adminAudit.record({
			access,
			request,
			...dimensionsFromAssignedScope(scope),
			action: "admin_scope.assign",
			resourceType: "admin_user",
			resourceId: adminUserId,
			afterSnapshot: scope,
		});

		return { scope };
	}
}
