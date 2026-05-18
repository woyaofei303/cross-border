import type { AdminScopeType } from "@/lib/admin-sites";
import { getAdminApiBaseUrl } from "@/lib/admin-sites";

export type AdminAuditLogListItem = {
	auditLogId: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	actorType: "user" | "admin" | "system";
	actorId?: string;
	action: string;
	resourceType: string;
	resourceId?: string;
	beforeSnapshot?: unknown;
	afterSnapshot?: unknown;
	ipAddress?: string;
	userAgent?: string;
	requestId?: string;
	createdAt: string;
};

type AdminAuditLogListResponse = {
	items: AdminAuditLogListItem[];
};

export function buildAdminAuditPath(input: {
	scopeType: AdminScopeType;
	scopeId?: string;
	siteId?: string;
	query?: string;
	action?: string;
	resourceType?: string;
	limit?: number;
}) {
	const params = new URLSearchParams();
	params.set("scopeType", input.scopeType);

	if (input.scopeId) {
		params.set("scopeId", input.scopeId);
	}

	if (input.siteId) {
		params.set("siteId", input.siteId);
	}

	if (input.query) {
		params.set("query", input.query);
	}

	if (input.action) {
		params.set("action", input.action);
	}

	if (input.resourceType) {
		params.set("resourceType", input.resourceType);
	}

	if (input.limit) {
		params.set("limit", String(input.limit));
	}

	return `/audit?${params.toString()}`;
}

function buildAdminAuditApiPath(input: {
	scopeType: AdminScopeType;
	scopeId?: string;
	query?: string;
	action?: string;
	resourceType?: string;
	limit?: number;
}) {
	const params = new URLSearchParams();
	params.set("scopeType", input.scopeType);

	if (input.scopeId) {
		params.set("scopeId", input.scopeId);
	}

	if (input.query) {
		params.set("query", input.query);
	}

	if (input.action) {
		params.set("action", input.action);
	}

	if (input.resourceType) {
		params.set("resourceType", input.resourceType);
	}

	if (input.limit) {
		params.set("limit", String(input.limit));
	}

	return `/api/admin/audit-logs?${params.toString()}`;
}

async function fetchJson<T>(pathname: string): Promise<T> {
	const apiBaseUrl = getAdminApiBaseUrl();

	if (!apiBaseUrl) {
		throw new Error("Admin API base URL is not configured.");
	}

	const response = await fetch(new URL(pathname, apiBaseUrl), {
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`Admin audit API request failed: ${pathname}`);
	}

	return (await response.json()) as T;
}

export async function loadAdminAuditLogs(input: {
	scopeType: AdminScopeType;
	scopeId?: string;
	query?: string;
	action?: string;
	resourceType?: string;
	limit?: number;
}) {
	if (!getAdminApiBaseUrl()) {
		return [];
	}

	try {
		const payload = await fetchJson<AdminAuditLogListResponse>(
			buildAdminAuditApiPath(input),
		);

		return payload.items;
	} catch {
		return [];
	}
}

export function shortAuditId(value: string | undefined) {
	return value ? value.slice(0, 8) : "-";
}

export function formatAuditDateTime(value: string | undefined) {
	return value ? value.slice(0, 16).replace("T", " ") : "-";
}
