import { Module } from "@nestjs/common";
import { AdminAccessModule } from "../admin-access/admin-access.module.js";
import { AdminAuditModule } from "../admin-audit/admin-audit.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { PgOutboxRepository } from "../database/pg/pg-outbox.repository.js";
import { PgTransactionManager } from "../database/pg/pg-transaction-manager.js";
import { AfterSalesController } from "./controllers/aftersales.controller.js";
import { AfterSalesWorkflowService } from "./aftersales.service.js";
import {
	ApproveRefundUseCase,
	GetAdminAfterSalesRequestDetailUseCase,
	ListAdminAfterSalesRequestsUseCase,
	MarkRefundSucceededUseCase,
	RejectAfterSalesRequestUseCase,
	RequestRefundUseCase,
} from "./aftersales.use-cases.js";
import { PgAfterSalesRepository } from "./repositories/pg-aftersales.repository.js";

@Module({
	imports: [DatabaseModule, AdminAccessModule, AdminAuditModule],
	controllers: [AfterSalesController],
	providers: [
		AfterSalesWorkflowService,
		PgAfterSalesRepository,
		{
			provide: ListAdminAfterSalesRequestsUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				afterSales: PgAfterSalesRepository,
			) =>
				new ListAdminAfterSalesRequestsUseCase({
					transactions,
					afterSales,
				}),
			inject: [PgTransactionManager, PgAfterSalesRepository],
		},
		{
			provide: GetAdminAfterSalesRequestDetailUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				afterSales: PgAfterSalesRepository,
			) =>
				new GetAdminAfterSalesRequestDetailUseCase({
					transactions,
					afterSales,
				}),
			inject: [PgTransactionManager, PgAfterSalesRepository],
		},
		{
			provide: RequestRefundUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				afterSales: PgAfterSalesRepository,
				outbox: PgOutboxRepository,
				workflow: AfterSalesWorkflowService,
			) =>
				new RequestRefundUseCase({
					transactions,
					afterSales,
					outbox,
					workflow,
				}),
			inject: [
				PgTransactionManager,
				PgAfterSalesRepository,
				PgOutboxRepository,
				AfterSalesWorkflowService,
			],
		},
		{
			provide: ApproveRefundUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				afterSales: PgAfterSalesRepository,
				outbox: PgOutboxRepository,
				workflow: AfterSalesWorkflowService,
			) =>
				new ApproveRefundUseCase({
					transactions,
					afterSales,
					outbox,
					workflow,
				}),
			inject: [
				PgTransactionManager,
				PgAfterSalesRepository,
				PgOutboxRepository,
				AfterSalesWorkflowService,
			],
		},
		{
			provide: RejectAfterSalesRequestUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				afterSales: PgAfterSalesRepository,
				outbox: PgOutboxRepository,
				workflow: AfterSalesWorkflowService,
			) =>
				new RejectAfterSalesRequestUseCase({
					transactions,
					afterSales,
					outbox,
					workflow,
				}),
			inject: [
				PgTransactionManager,
				PgAfterSalesRepository,
				PgOutboxRepository,
				AfterSalesWorkflowService,
			],
		},
		{
			provide: MarkRefundSucceededUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				afterSales: PgAfterSalesRepository,
				outbox: PgOutboxRepository,
				workflow: AfterSalesWorkflowService,
			) =>
				new MarkRefundSucceededUseCase({
					transactions,
					afterSales,
					outbox,
					workflow,
				}),
			inject: [
				PgTransactionManager,
				PgAfterSalesRepository,
				PgOutboxRepository,
				AfterSalesWorkflowService,
			],
		},
	],
	exports: [
		AfterSalesWorkflowService,
		PgAfterSalesRepository,
		ListAdminAfterSalesRequestsUseCase,
		GetAdminAfterSalesRequestDetailUseCase,
		RequestRefundUseCase,
		ApproveRefundUseCase,
		RejectAfterSalesRequestUseCase,
		MarkRefundSucceededUseCase,
	],
})
export class AfterSalesModule {}
