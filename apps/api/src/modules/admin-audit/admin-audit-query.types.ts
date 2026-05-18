import type { AdminScope } from "../../common/admin/admin-access.js";

export type AdminAuditLogListInput = {
	adminScopes: AdminScope[];
	selectedScope?: AdminScope;
	action?: string;
	resourceType?: string;
	resourceId?: string;
	actorId?: string;
	query?: string;
	limit?: number;
};

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
