import type { AdminScopeType } from "@/lib/admin-sites";
import { getAdminApiBaseUrl } from "@/lib/admin-sites";

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

export type AdminScopeAssignment = {
	scopeAssignmentId: string;
	adminUserId: string;
	scopeType: AdminScopeType;
	scopeId?: string;
	createdAt: string;
};

export type AdminUserSummary = {
	adminUserId: string;
	email: string;
	displayName: string;
	status: "active" | "disabled";
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

const emptySnapshot: AdminRbacSnapshot = {
	users: [],
	roles: [],
	permissions: [],
	scopes: [],
};

async function fetchJson<T>(pathname: string): Promise<T> {
	const apiBaseUrl = getAdminApiBaseUrl();

	if (!apiBaseUrl) {
		throw new Error("Admin API base URL is not configured.");
	}

	const response = await fetch(new URL(pathname, apiBaseUrl), {
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`Admin RBAC API request failed: ${pathname}`);
	}

	return (await response.json()) as T;
}

export async function loadAdminRbacSnapshot(): Promise<AdminRbacSnapshot> {
	if (!getAdminApiBaseUrl()) {
		return emptySnapshot;
	}

	try {
		return await fetchJson<AdminRbacSnapshot>("/api/admin/rbac");
	} catch {
		return emptySnapshot;
	}
}

export function scopeLabel(scope: {
	scopeType: AdminScopeType;
	scopeId?: string;
}) {
	return scope.scopeId ? `${scope.scopeType}:${scope.scopeId.slice(0, 8)}` : "global";
}

export function adminStatusClassName(status: string) {
	return status === "active"
		? "border-[#bbdfcc] bg-[#eef8f1] text-[#1d7053]"
		: "border-[#e5dac0] bg-[#fff8e6] text-[#8a5a13]";
}

export function shortAdminId(value: string | undefined) {
	return value ? value.slice(0, 8) : "-";
}

export function formatAdminDateTime(value: string | undefined) {
	return value ? value.slice(0, 16).replace("T", " ") : "-";
}
