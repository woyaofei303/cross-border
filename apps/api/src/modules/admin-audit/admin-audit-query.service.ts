import { Injectable } from "@nestjs/common";
import { PgAdminAuditRepository } from "./repositories/pg-admin-audit.repository.js";
import type {
	AdminAuditLogListInput,
	AdminAuditLogListItem,
} from "./admin-audit-query.types.js";

@Injectable()
export class AdminAuditQueryService {
	constructor(private readonly audit: PgAdminAuditRepository) {}

	async listAuditLogs(
		input: AdminAuditLogListInput,
	): Promise<AdminAuditLogListItem[]> {
		return this.audit.listAuditLogs(input);
	}
}
