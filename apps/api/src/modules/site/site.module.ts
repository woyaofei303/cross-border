import { Module } from "@nestjs/common";
import { AdminAccessModule } from "../admin-access/admin-access.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AdminSiteController } from "./controllers/admin-site.controller.js";
import { SiteController } from "./controllers/site.controller.js";
import { PgSiteRepository } from "./repositories/pg-site.repository.js";
import { SiteContextMiddleware } from "./site-context.middleware.js";
import { SiteResolverService } from "./site.service.js";

@Module({
	imports: [DatabaseModule, AdminAccessModule],
	controllers: [SiteController, AdminSiteController],
	providers: [PgSiteRepository, SiteResolverService, SiteContextMiddleware],
	exports: [SiteResolverService, SiteContextMiddleware],
})
export class SiteModule {}
