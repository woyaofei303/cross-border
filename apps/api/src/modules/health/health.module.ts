import { Module } from "@nestjs/common";
import { ApiConfigModule } from "../config/api-config.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";

@Module({
	imports: [ApiConfigModule, DatabaseModule],
	controllers: [HealthController],
	providers: [HealthService],
})
export class HealthModule {}
