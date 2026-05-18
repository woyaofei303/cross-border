import type { AdminAccessContext } from "../../common/admin/admin-access.js";
import type { AdminAccessAwareRequest } from "../../common/admin/admin-access.js";

export type AdminAuditDimensions = {
	siteId?: string;
	verticalId?: string;
	brandId?: string;
};

export type AdminAuditRecordInput = AdminAuditDimensions & {
	request: AdminAccessAwareRequest;
	access: AdminAccessContext;
	action: string;
	resourceType: string;
	resourceId?: string;
	beforeSnapshot?: unknown;
	afterSnapshot?: unknown;
};

export type AdminAuditLogRecord = AdminAuditDimensions & {
	actorType: "admin";
	actorId?: string;
	action: string;
	resourceType: string;
	resourceId?: string;
	beforeSnapshot?: unknown;
	afterSnapshot?: unknown;
	ipAddress?: string;
	userAgent?: string;
	requestId?: string;
};

export type AdminOperationLogRecord = AdminAuditDimensions & {
	adminUserId: string;
	action: string;
	resourceType: string;
	resourceId?: string;
	beforeSnapshot?: unknown;
	afterSnapshot?: unknown;
	ipAddress?: string;
	userAgent?: string;
	requestId?: string;
};
