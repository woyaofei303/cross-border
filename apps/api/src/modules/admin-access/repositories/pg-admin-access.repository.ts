import { Injectable } from "@nestjs/common";
import type {
	AdminScope,
	AdminScopeType,
} from "../../../common/admin/admin-access.js";
import { PgPoolService } from "../../database/pg/pg-pool.service.js";
import type { AdminAccessRepository } from "../admin-access.ports.js";
import type {
	AdminPermissionSummary,
	AdminRbacSnapshot,
	AdminRoleSummary,
	AdminScopeAssignment,
	AdminUserSummary,
} from "../admin-rbac.types.js";

type AdminScopeRow = {
	id?: string;
	admin_user_id?: string;
	scope_type: AdminScopeType;
	scope_id: string | null;
	created_at?: Date | string;
};

type AdminUserRow = {
	id: string;
	email: string;
	display_name: string;
	status: "active" | "disabled";
	last_login_at: Date | string | null;
	created_at: Date | string;
	updated_at: Date | string;
};

type AdminRoleRow = {
	id: string;
	code: string;
	name: string;
	description: string | null;
	permission_count: string | number | null;
};

type AdminPermissionRow = {
	id: string;
	code: string;
	name: string;
	type: "menu" | "action" | "data";
	resource: string;
	action: string;
	parent_id: string | null;
};

type AdminUserRoleRow = {
	admin_user_id: string;
	role_id: string;
	code: string;
	name: string;
	description: string | null;
	permission_count: string | number | null;
};

function toIso(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value;
}

function mapScope(row: AdminScopeRow): AdminScope {
	if (row.scope_type === "global") {
		return {
			scopeType: "global",
		};
	}

	return {
		scopeType: row.scope_type,
		...(row.scope_id ? { scopeId: row.scope_id } : {}),
	};
}

function mapScopeAssignment(row: Required<AdminScopeRow>): AdminScopeAssignment {
	return {
		scopeAssignmentId: row.id,
		adminUserId: row.admin_user_id,
		...mapScope(row),
		createdAt: toIso(row.created_at),
	};
}

function mapRole(row: AdminRoleRow): AdminRoleSummary {
	return {
		roleId: row.id,
		code: row.code,
		name: row.name,
		...(row.description ? { description: row.description } : {}),
		permissionCount: Number(row.permission_count ?? 0),
	};
}

function mapPermission(row: AdminPermissionRow): AdminPermissionSummary {
	return {
		permissionId: row.id,
		code: row.code,
		name: row.name,
		type: row.type,
		resource: row.resource,
		action: row.action,
		...(row.parent_id ? { parentId: row.parent_id } : {}),
	};
}

@Injectable()
export class PgAdminAccessRepository implements AdminAccessRepository {
	constructor(private readonly pool: PgPoolService) {}

	async findScopesByAdminUserId(adminUserId: string): Promise<AdminScope[]> {
		const result = await this.pool.getPool().query<AdminScopeRow>(
			`
        SELECT scope_type, scope_id
        FROM admin_user_scopes
        WHERE admin_user_id = $1
        ORDER BY
          CASE scope_type
            WHEN 'global' THEN 0
            WHEN 'vertical' THEN 1
            WHEN 'brand' THEN 2
            WHEN 'site' THEN 3
            ELSE 4
          END,
          scope_id NULLS FIRST
      `,
			[adminUserId],
		);

		return result.rows.map(mapScope);
	}

	async adminUserExists(adminUserId: string): Promise<boolean> {
		const result = await this.pool.getPool().query<{ id: string }>(
			`
        SELECT id
        FROM admin_users
        WHERE id = $1
        LIMIT 1
      `,
			[adminUserId],
		);

		return (result.rowCount ?? 0) > 0;
	}

	async scopeTargetExists(
		scopeType: Exclude<AdminScopeType, "global">,
		scopeId: string,
	): Promise<boolean> {
		const tableByScopeType = {
			vertical: "verticals",
			brand: "brands",
			site: "sites",
		} as const;
		const result = await this.pool.getPool().query<{ id: string }>(
			`
        SELECT id
        FROM ${tableByScopeType[scopeType]}
        WHERE id = $1
        LIMIT 1
      `,
			[scopeId],
		);

		return (result.rowCount ?? 0) > 0;
	}

	async assignAdminUserScope(
		adminUserId: string,
		scope: AdminScope,
	): Promise<AdminScopeAssignment> {
		const client = this.pool.getPool();

		if (scope.scopeType === "global") {
			await client.query(
				`
          DELETE FROM admin_user_scopes
          WHERE admin_user_id = $1
        `,
				[adminUserId],
			);
		} else {
			await client.query(
				`
          DELETE FROM admin_user_scopes
          WHERE admin_user_id = $1
            AND scope_type = 'global'
        `,
				[adminUserId],
			);
		}

		const result = await client.query<Required<AdminScopeRow>>(
			`
        INSERT INTO admin_user_scopes (
          admin_user_id,
          scope_type,
          scope_id
        )
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        RETURNING
          id,
          admin_user_id,
          scope_type,
          scope_id,
          created_at
      `,
			[
				adminUserId,
				scope.scopeType,
				scope.scopeType === "global" ? null : scope.scopeId,
			],
		);

		if (result.rows[0]) {
			return mapScopeAssignment(result.rows[0]);
		}

		const existing = await client.query<Required<AdminScopeRow>>(
			`
        SELECT
          id,
          admin_user_id,
          scope_type,
          scope_id,
          created_at
        FROM admin_user_scopes
        WHERE admin_user_id = $1
          AND scope_type = $2
          AND (
            ($2 = 'global' AND scope_id IS NULL)
            OR scope_id = $3
          )
        LIMIT 1
      `,
			[
				adminUserId,
				scope.scopeType,
				scope.scopeType === "global" ? null : scope.scopeId,
			],
		);

		if (!existing.rows[0]) {
			throw new Error("Admin scope assignment was not readable after insert.");
		}

		return mapScopeAssignment(existing.rows[0]);
	}

	async listRbacSnapshot(): Promise<AdminRbacSnapshot> {
		const client = this.pool.getPool();
		const [usersResult, rolesResult, permissionsResult, userRolesResult, scopesResult] =
			await Promise.all([
				client.query<AdminUserRow>(
					`
            SELECT
              id,
              email,
              display_name,
              status,
              last_login_at,
              created_at,
              updated_at
            FROM admin_users
            ORDER BY created_at DESC
          `,
				),
				client.query<AdminRoleRow>(
					`
            SELECT
              admin_roles.id,
              admin_roles.code,
              admin_roles.name,
              admin_roles.description,
              COUNT(admin_role_permissions.permission_id) AS permission_count
            FROM admin_roles
            LEFT JOIN admin_role_permissions
              ON admin_role_permissions.role_id = admin_roles.id
            GROUP BY admin_roles.id
            ORDER BY admin_roles.code
          `,
				),
				client.query<AdminPermissionRow>(
					`
            SELECT id, code, name, type, resource, action, parent_id
            FROM admin_permissions
            ORDER BY resource, action, code
          `,
				),
				client.query<AdminUserRoleRow>(
					`
            SELECT
              admin_user_roles.admin_user_id,
              admin_roles.id AS role_id,
              admin_roles.code,
              admin_roles.name,
              admin_roles.description,
              COUNT(admin_role_permissions.permission_id) AS permission_count
            FROM admin_user_roles
            JOIN admin_roles
              ON admin_roles.id = admin_user_roles.role_id
            LEFT JOIN admin_role_permissions
              ON admin_role_permissions.role_id = admin_roles.id
            GROUP BY
              admin_user_roles.admin_user_id,
              admin_roles.id
            ORDER BY admin_roles.code
          `,
				),
				client.query<Required<AdminScopeRow>>(
					`
            SELECT
              id,
              admin_user_id,
              scope_type,
              scope_id,
              created_at
            FROM admin_user_scopes
            ORDER BY
              admin_user_id,
              CASE scope_type
                WHEN 'global' THEN 0
                WHEN 'vertical' THEN 1
                WHEN 'brand' THEN 2
                WHEN 'site' THEN 3
                ELSE 4
              END,
              scope_id NULLS FIRST
          `,
				),
			]);
		const rolesByUser = new Map<string, AdminRoleSummary[]>();

		for (const row of userRolesResult.rows) {
			const roles = rolesByUser.get(row.admin_user_id) ?? [];
			roles.push(
				mapRole({
					id: row.role_id,
					code: row.code,
					name: row.name,
					description: row.description,
					permission_count: row.permission_count,
				}),
			);
			rolesByUser.set(row.admin_user_id, roles);
		}

		const scopes = scopesResult.rows.map(mapScopeAssignment);
		const scopesByUser = new Map<string, AdminScopeAssignment[]>();

		for (const scope of scopes) {
			const userScopes = scopesByUser.get(scope.adminUserId) ?? [];
			userScopes.push(scope);
			scopesByUser.set(scope.adminUserId, userScopes);
		}

		const users: AdminUserSummary[] = usersResult.rows.map((row) => ({
			adminUserId: row.id,
			email: row.email,
			displayName: row.display_name,
			status: row.status,
			...(row.last_login_at ? { lastLoginAt: toIso(row.last_login_at) } : {}),
			createdAt: toIso(row.created_at),
			updatedAt: toIso(row.updated_at),
			roles: rolesByUser.get(row.id) ?? [],
			scopes: scopesByUser.get(row.id) ?? [],
		}));

		return {
			users,
			roles: rolesResult.rows.map(mapRole),
			permissions: permissionsResult.rows.map(mapPermission),
			scopes,
		};
	}
}
