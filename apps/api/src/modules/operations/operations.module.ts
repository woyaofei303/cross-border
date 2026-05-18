import { Module } from "@nestjs/common";
import { AdminAccessModule } from "../admin-access/admin-access.module.js";
import { AdminAuditModule } from "../admin-audit/admin-audit.module.js";
import { AnalyticsModule } from "../analytics/analytics.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { PgTransactionManager } from "../database/pg/pg-transaction-manager.js";
import { OrderModule } from "../order/order.module.js";
import { ApplyPaymentSucceededUseCase } from "../order/order.use-cases.js";
import { PaymentModule } from "../payment/payment.module.js";
import { ProcessPaymentWebhookUseCase } from "../payment/payment.use-cases.js";
import { ProcessPendingAnalyticsEventsUseCase } from "../analytics/analytics.use-cases.js";
import { AdminOperationsController } from "./controllers/operations.controller.js";
import { ProcessCommercePipelineUseCase } from "./operations.use-cases.js";
import { PgCommercePipelineRepository } from "./repositories/pg-commerce-pipeline.repository.js";
import { PgOperationsRepository } from "./repositories/pg-operations.repository.js";

@Module({
	imports: [
		DatabaseModule,
		AdminAccessModule,
		AdminAuditModule,
		PaymentModule,
		OrderModule,
		AnalyticsModule,
	],
	controllers: [AdminOperationsController],
	providers: [
		PgOperationsRepository,
		PgCommercePipelineRepository,
		{
			provide: ProcessCommercePipelineUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				pipeline: PgCommercePipelineRepository,
				processPaymentWebhook: ProcessPaymentWebhookUseCase,
				applyPaymentSucceeded: ApplyPaymentSucceededUseCase,
				processPendingAnalyticsEvents: ProcessPendingAnalyticsEventsUseCase,
			) =>
				new ProcessCommercePipelineUseCase({
					transactions,
					pipeline,
					processPaymentWebhook,
					applyPaymentSucceeded,
					processPendingAnalyticsEvents,
				}),
			inject: [
				PgTransactionManager,
				PgCommercePipelineRepository,
				ProcessPaymentWebhookUseCase,
				ApplyPaymentSucceededUseCase,
				ProcessPendingAnalyticsEventsUseCase,
			],
		},
	],
	exports: [PgOperationsRepository, ProcessCommercePipelineUseCase],
})
export class OperationsModule {}
