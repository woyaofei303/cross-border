import type { AdminScope, AdminScopeType } from "../../common/admin/admin-access.js";

export type AdminUserStatus = "active" | "disabled";

export type AdminRoleSummary = {
	roleId: string;
	code: string;
	name: string;
	description?: string;
	permissionCount: number;
};

export type AdminPermissionSummary = {
	permissionId: string;
	code: string;
	name: string;
	type: "menu" | "action" | "data";
	resource: string;
	action: string;
	parentId?: string;
};

export type AdminScopeAssignment = AdminScope & {
	scopeAssignmentId: string;
	adminUserId: string;
	createdAt: string;
};

export type AdminUserSummary = {
	adminUserId: string;
	email: string;
	displayName: string;
	status: AdminUserStatus;
	lastLoginAt?: string;
	createdAt: string;
	updatedAt: string;
	roles: AdminRoleSummary[];
	scopes: AdminScopeAssignment[];
};

export type AdminRbacSnapshot = {
	users: AdminUserSummary[];
	roles: AdminRoleSummary[];
	permissions: AdminPermissionSummary[];
	scopes: AdminScopeAssignment[];
};

export type AssignAdminScopeInput = {
	actorScopes: AdminScope[];
	adminUserId: string;
	scopeType: AdminScopeType;
	scopeId?: string;
};
