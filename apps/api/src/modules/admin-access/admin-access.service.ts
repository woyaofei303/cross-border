import { Injectable } from "@nestjs/common";
import {
	type AdminAccessAwareRequest,
	type AdminAccessContext,
	fallbackGlobalAdminAccess,
} from "../../common/admin/admin-access.js";
import { readHeaderValue } from "../../common/site/site-context.js";
import { PgAdminAccessRepository } from "./repositories/pg-admin-access.repository.js";

function isDatabaseUnavailable(error: unknown): error is Error {
	return (
		error instanceof Error &&
		error.message.includes("DATABASE_URL is required")
	);
}

@Injectable()
export class AdminAccessService {
	constructor(private readonly adminAccess: PgAdminAccessRepository) {}

	async resolveForRequest(
		request: AdminAccessAwareRequest,
	): Promise<AdminAccessContext> {
		const adminUserId = readHeaderValue(request.headers["x-admin-user-id"]);

		if (!adminUserId) {
			return fallbackGlobalAdminAccess;
		}

		try {
			const scopes =
				await this.adminAccess.findScopesByAdminUserId(adminUserId);

			return {
				source: "database",
				adminUserId,
				scopes,
			};
		} catch (error) {
			if (isDatabaseUnavailable(error)) {
				return {
					...fallbackGlobalAdminAccess,
					source: "database_unavailable",
					adminUserId,
				};
			}

			throw error;
		}
	}
}
