import { Injectable } from "@nestjs/common";
import {
	type AdminScope,
	hasGlobalAdminScope,
} from "../../../common/admin/admin-access.js";
import { PgPoolService } from "../../database/pg/pg-pool.service.js";
import type {
	AdminAuditLogListInput,
	AdminAuditLogListItem,
} from "../admin-audit-query.types.js";
import type {
	AdminAuditLogRecord,
	AdminOperationLogRecord,
} from "../admin-audit.types.js";

function nullableJson(value: unknown): string | null {
	return value === undefined ? null : JSON.stringify(value);
}

type AuditLogRow = {
	id: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	actor_type: "user" | "admin" | "system";
	actor_id: string | null;
	action: string;
	resource_type: string;
	resource_id: string | null;
	before_snapshot: unknown | null;
	after_snapshot: unknown | null;
	ip_address: string | null;
	user_agent: string | null;
	request_id: string | null;
	created_at: Date | string;
};

function toIso(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value;
}

function mapAuditLog(row: AuditLogRow): AdminAuditLogListItem {
	return {
		auditLogId: row.id,
		...(row.site_id ? { siteId: row.site_id } : {}),
		...(row.vertical_id ? { verticalId: row.vertical_id } : {}),
		...(row.brand_id ? { brandId: row.brand_id } : {}),
		actorType: row.actor_type,
		...(row.actor_id ? { actorId: row.actor_id } : {}),
		action: row.action,
		resourceType: row.resource_type,
		...(row.resource_id ? { resourceId: row.resource_id } : {}),
		...(row.before_snapshot !== null
			? { beforeSnapshot: row.before_snapshot }
			: {}),
		...(row.after_snapshot !== null ? { afterSnapshot: row.after_snapshot } : {}),
		...(row.ip_address ? { ipAddress: row.ip_address } : {}),
		...(row.user_agent ? { userAgent: row.user_agent } : {}),
		...(row.request_id ? { requestId: row.request_id } : {}),
		createdAt: toIso(row.created_at),
	};
}

function buildScopePredicate(
	alias: string,
	scopes: readonly AdminScope[],
	params: unknown[],
) {
	if (hasGlobalAdminScope(scopes)) {
		return "TRUE";
	}

	const clauses: string[] = [];

	for (const scope of scopes) {
		if (scope.scopeType === "site" && scope.scopeId) {
			params.push(scope.scopeId);
			clauses.push(`${alias}.site_id = $${params.length}`);
		}

		if (scope.scopeType === "vertical" && scope.scopeId) {
			params.push(scope.scopeId);
			clauses.push(`${alias}.vertical_id = $${params.length}`);
		}

		if (scope.scopeType === "brand" && scope.scopeId) {
			params.push(scope.scopeId);
			clauses.push(`${alias}.brand_id = $${params.length}`);
		}
	}

	return clauses.length ? `(${clauses.join(" OR ")})` : "FALSE";
}

function buildSelectedScopePredicate(
	alias: string,
	scope: AdminScope | undefined,
	params: unknown[],
) {
	if (!scope || scope.scopeType === "global") {
		return "TRUE";
	}

	if (scope.scopeType === "site" && scope.scopeId) {
		params.push(scope.scopeId);
		return `${alias}.site_id = $${params.length}`;
	}

	if (scope.scopeType === "vertical" && scope.scopeId) {
		params.push(scope.scopeId);
		return `${alias}.vertical_id = $${params.length}`;
	}

	if (scope.scopeType === "brand" && scope.scopeId) {
		params.push(scope.scopeId);
		return `${alias}.brand_id = $${params.length}`;
	}

	return "FALSE";
}

@Injectable()
export class PgAdminAuditRepository {
	constructor(private readonly pool: PgPoolService) {}

	async appendAuditLog(record: AdminAuditLogRecord): Promise<void> {
		await this.pool.getPool().query(
			`
        INSERT INTO audit_logs (
          site_id,
          vertical_id,
          brand_id,
          actor_type,
          actor_id,
          action,
          resource_type,
          resource_id,
          before_snapshot,
          after_snapshot,
          ip_address,
          user_agent,
          request_id
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9::jsonb,
          $10::jsonb,
          $11,
          $12,
          $13
        )
      `,
			[
				record.siteId ?? null,
				record.verticalId ?? null,
				record.brandId ?? null,
				record.actorType,
				record.actorId ?? null,
				record.action,
				record.resourceType,
				record.resourceId ?? null,
				nullableJson(record.beforeSnapshot),
				nullableJson(record.afterSnapshot),
				record.ipAddress ?? null,
				record.userAgent ?? null,
				record.requestId ?? null,
			],
		);
	}

	async appendAdminOperationLog(record: AdminOperationLogRecord): Promise<void> {
		await this.pool.getPool().query(
			`
        INSERT INTO admin_operation_logs (
          site_id,
          vertical_id,
          brand_id,
          admin_user_id,
          action,
          resource_type,
          resource_id,
          before_snapshot,
          after_snapshot,
          ip_address,
          user_agent,
          request_id
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          $8::jsonb,
          $9::jsonb,
          $10,
          $11,
          $12
        )
      `,
			[
				record.siteId ?? null,
				record.verticalId ?? null,
				record.brandId ?? null,
				record.adminUserId,
				record.action,
				record.resourceType,
				record.resourceId ?? null,
				nullableJson(record.beforeSnapshot),
				nullableJson(record.afterSnapshot),
				record.ipAddress ?? null,
				record.userAgent ?? null,
				record.requestId ?? null,
			],
		);
	}

	async listAuditLogs(
		input: AdminAuditLogListInput,
	): Promise<AdminAuditLogListItem[]> {
		const params: unknown[] = [];
		const accessPredicate = buildScopePredicate(
			"audit_logs",
			input.adminScopes,
			params,
		);
		const selectedPredicate = buildSelectedScopePredicate(
			"audit_logs",
			input.selectedScope,
			params,
		);
		const filters = [`(${accessPredicate})`, `(${selectedPredicate})`];

		if (input.action) {
			params.push(input.action);
			filters.push(`audit_logs.action = $${params.length}`);
		}

		if (input.resourceType) {
			params.push(input.resourceType);
			filters.push(`audit_logs.resource_type = $${params.length}`);
		}

		if (input.resourceId) {
			params.push(input.resourceId);
			filters.push(`audit_logs.resource_id = $${params.length}`);
		}

		if (input.actorId) {
			params.push(input.actorId);
			filters.push(`audit_logs.actor_id = $${params.length}`);
		}

		if (input.query) {
			params.push(`%${input.query}%`);
			filters.push(`(
        audit_logs.action ILIKE $${params.length}
        OR audit_logs.resource_type ILIKE $${params.length}
        OR audit_logs.resource_id ILIKE $${params.length}
        OR audit_logs.actor_id::TEXT ILIKE $${params.length}
        OR audit_logs.request_id ILIKE $${params.length}
      )`);
		}

		const limit = input.limit ?? 100;
		params.push(limit);
		const result = await this.pool.getPool().query<AuditLogRow>(
			`
        SELECT
          id,
          site_id,
          vertical_id,
          brand_id,
          actor_type,
          actor_id,
          action,
          resource_type,
          resource_id,
          before_snapshot,
          after_snapshot,
          ip_address,
          user_agent,
          request_id,
          created_at
        FROM audit_logs
        WHERE ${filters.join("\n          AND ")}
        ORDER BY created_at DESC
        LIMIT $${params.length}
      `,
			params,
		);

		return result.rows.map(mapAuditLog);
	}
}
