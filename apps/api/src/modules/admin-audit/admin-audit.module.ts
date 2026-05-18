import { Module, forwardRef } from "@nestjs/common";
import { AdminAccessModule } from "../admin-access/admin-access.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AdminAuditQueryService } from "./admin-audit-query.service.js";
import { AdminAuditService } from "./admin-audit.service.js";
import { AdminAuditController } from "./controllers/admin-audit.controller.js";
import { PgAdminAuditRepository } from "./repositories/pg-admin-audit.repository.js";

@Module({
	imports: [DatabaseModule, forwardRef(() => AdminAccessModule)],
	controllers: [AdminAuditController],
	providers: [
		PgAdminAuditRepository,
		AdminAuditService,
		AdminAuditQueryService,
	],
	exports: [AdminAuditService, AdminAuditQueryService],
})
export class AdminAuditModule {}
