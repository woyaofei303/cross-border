import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from "@nestjs/common";
import {
	type AdminScope,
	hasGlobalAdminScope,
} from "../../common/admin/admin-access.js";
import { PgAdminAccessRepository } from "./repositories/pg-admin-access.repository.js";
import type {
	AdminRbacSnapshot,
	AdminScopeAssignment,
	AssignAdminScopeInput,
} from "./admin-rbac.types.js";

function normalizeScope(input: AssignAdminScopeInput): AdminScope {
	if (input.scopeType === "global") {
		return { scopeType: "global" };
	}

	if (!input.scopeId) {
		throw new BadRequestException({
			code: "ADMIN_SCOPE_ID_REQUIRED",
			message: "scopeId is required for vertical, brand, and site scopes.",
		});
	}

	return {
		scopeType: input.scopeType,
		scopeId: input.scopeId,
	};
}

@Injectable()
export class AdminRbacService {
	constructor(private readonly adminAccess: PgAdminAccessRepository) {}

	async getSnapshot(): Promise<AdminRbacSnapshot> {
		return this.adminAccess.listRbacSnapshot();
	}

	async assignScope(input: AssignAdminScopeInput): Promise<AdminScopeAssignment> {
		if (!hasGlobalAdminScope(input.actorScopes)) {
			throw new ForbiddenException({
				code: "ADMIN_GLOBAL_SCOPE_REQUIRED",
				message: "Only a global admin can assign admin data scopes.",
			});
		}

		const scope = normalizeScope(input);
		const userExists = await this.adminAccess.adminUserExists(input.adminUserId);

		if (!userExists) {
			throw new NotFoundException({
				code: "ADMIN_USER_NOT_FOUND",
				message: "Admin user was not found.",
			});
		}

		if (scope.scopeType !== "global") {
			const scopeId = scope.scopeId;

			if (!scopeId) {
				throw new BadRequestException({
					code: "ADMIN_SCOPE_ID_REQUIRED",
					message: "scopeId is required for vertical, brand, and site scopes.",
				});
			}

			const scopeExists = await this.adminAccess.scopeTargetExists(
				scope.scopeType,
				scopeId,
			);

			if (!scopeExists) {
				throw new BadRequestException({
					code: "ADMIN_SCOPE_TARGET_NOT_FOUND",
					message: "Requested scope target was not found.",
				});
			}
		}

		return this.adminAccess.assignAdminUserScope(input.adminUserId, scope);
	}
}
