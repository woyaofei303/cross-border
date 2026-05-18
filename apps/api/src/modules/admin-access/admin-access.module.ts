import { Module, forwardRef } from "@nestjs/common";
import { AdminAuditModule } from "../admin-audit/admin-audit.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AdminRbacController } from "./controllers/admin-rbac.controller.js";
import { AdminAccessService } from "./admin-access.service.js";
import { AdminRbacService } from "./admin-rbac.service.js";
import { PgAdminAccessRepository } from "./repositories/pg-admin-access.repository.js";

@Module({
	imports: [DatabaseModule, forwardRef(() => AdminAuditModule)],
	controllers: [AdminRbacController],
	providers: [PgAdminAccessRepository, AdminAccessService, AdminRbacService],
	exports: [AdminAccessService, AdminRbacService],
})
export class AdminAccessModule {}
