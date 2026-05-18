import { Injectable } from "@nestjs/common";
import type { AdminScope } from "../../common/admin/admin-access.js";
import { readHeaderValue } from "../../common/site/site-context.js";
import type {
	AdminAuditDimensions,
	AdminAuditRecordInput,
} from "./admin-audit.types.js";
import { PgAdminAuditRepository } from "./repositories/pg-admin-audit.repository.js";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | undefined): value is string {
	return Boolean(value && UUID_PATTERN.test(value));
}

function knownDatabaseAdminUserId(input: AdminAuditRecordInput): string | undefined {
	if (input.access.source !== "database" || input.access.scopes.length === 0) {
		return undefined;
	}

	return isUuid(input.access.adminUserId) ? input.access.adminUserId : undefined;
}

function firstHeader(
	headers: Record<string, string | string[] | undefined>,
	name: string,
): string | undefined {
	return readHeaderValue(headers[name]);
}

function firstForwardedIp(value: string | undefined): string | undefined {
	return value?.split(",")[0]?.trim() || undefined;
}

function deriveDimensions(scopes: readonly AdminScope[]): AdminAuditDimensions {
	const siteScope = scopes.find(
		(scope) => scope.scopeType === "site" && scope.scopeId,
	);

	if (siteScope?.scopeId) {
		return {
			siteId: siteScope.scopeId,
		};
	}

	const verticalScope = scopes.find(
		(scope) => scope.scopeType === "vertical" && scope.scopeId,
	);

	if (verticalScope?.scopeId) {
		return {
			verticalId: verticalScope.scopeId,
		};
	}

	const brandScope = scopes.find(
		(scope) => scope.scopeType === "brand" && scope.scopeId,
	);

	if (brandScope?.scopeId) {
		return {
			brandId: brandScope.scopeId,
		};
	}

	return {};
}

@Injectable()
export class AdminAuditService {
	constructor(private readonly audit: PgAdminAuditRepository) {}

	async record(input: AdminAuditRecordInput): Promise<void> {
		const inferredDimensions = deriveDimensions(input.access.scopes);
		const dimensions = {
			...inferredDimensions,
			...(input.siteId ? { siteId: input.siteId } : {}),
			...(input.verticalId ? { verticalId: input.verticalId } : {}),
			...(input.brandId ? { brandId: input.brandId } : {}),
		};
		const actorId = knownDatabaseAdminUserId(input);
		const ipAddress = firstForwardedIp(
			firstHeader(input.request.headers, "x-forwarded-for"),
		);
		const userAgent = firstHeader(input.request.headers, "user-agent");
		const requestId =
			firstHeader(input.request.headers, "x-request-id") ??
			firstHeader(input.request.headers, "x-correlation-id");
		const common = {
			...dimensions,
			action: input.action,
			resourceType: input.resourceType,
			...(input.resourceId ? { resourceId: input.resourceId } : {}),
			...(input.beforeSnapshot !== undefined
				? { beforeSnapshot: input.beforeSnapshot }
				: {}),
			...(input.afterSnapshot !== undefined
				? { afterSnapshot: input.afterSnapshot }
				: {}),
			...(ipAddress ? { ipAddress } : {}),
			...(userAgent ? { userAgent } : {}),
			...(requestId ? { requestId } : {}),
		};

		await this.audit.appendAuditLog({
			...common,
			actorType: "admin",
			...(actorId ? { actorId } : {}),
		});

		if (actorId) {
			await this.audit.appendAdminOperationLog({
				...common,
				adminUserId: actorId,
			});
		}
	}
}
