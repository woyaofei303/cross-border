import { Module } from "@nestjs/common";
import { AdminAuditModule } from "../admin-audit/admin-audit.module.js";
import { AdminAccessModule } from "../admin-access/admin-access.module.js";
import { PgEventProcessLogRepository } from "../database/pg/pg-event-process-log.repository.js";
import { PgTransactionManager } from "../database/pg/pg-transaction-manager.js";
import { DatabaseModule } from "../database/database.module.js";
import { AdminAnalyticsController } from "./controllers/analytics.controller.js";
import { PgAnalyticsRepository } from "./repositories/pg-analytics.repository.js";
import { AnalyticsProjectionService } from "./analytics.service.js";
import {
	ProcessPendingAnalyticsEventsUseCase,
	ProjectOrderPaidAnalyticsUseCase,
} from "./analytics.use-cases.js";

@Module({
	imports: [DatabaseModule, AdminAccessModule, AdminAuditModule],
	controllers: [AdminAnalyticsController],
	providers: [
		PgAnalyticsRepository,
		AnalyticsProjectionService,
		{
			provide: ProjectOrderPaidAnalyticsUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				analytics: PgAnalyticsRepository,
				eventProcessLog: PgEventProcessLogRepository,
				projection: AnalyticsProjectionService,
			) =>
				new ProjectOrderPaidAnalyticsUseCase({
					transactions,
					analytics,
					eventProcessLog,
					projection,
				}),
			inject: [
				PgTransactionManager,
				PgAnalyticsRepository,
				PgEventProcessLogRepository,
				AnalyticsProjectionService,
			],
		},
		{
			provide: ProcessPendingAnalyticsEventsUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				analytics: PgAnalyticsRepository,
				projectOrderPaid: ProjectOrderPaidAnalyticsUseCase,
			) =>
				new ProcessPendingAnalyticsEventsUseCase({
					transactions,
					analytics,
					projectOrderPaid,
				}),
			inject: [
				PgTransactionManager,
				PgAnalyticsRepository,
				ProjectOrderPaidAnalyticsUseCase,
			],
		},
	],
	exports: [
		PgAnalyticsRepository,
		AnalyticsProjectionService,
		ProjectOrderPaidAnalyticsUseCase,
		ProcessPendingAnalyticsEventsUseCase,
	],
})
export class AnalyticsModule {}
