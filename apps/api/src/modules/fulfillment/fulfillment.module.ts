import { Module } from "@nestjs/common";
import { AdminAccessModule } from "../admin-access/admin-access.module.js";
import { AdminAuditModule } from "../admin-audit/admin-audit.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { PgTransactionManager } from "../database/pg/pg-transaction-manager.js";
import { AdminFulfillmentController } from "./controllers/fulfillment.controller.js";
import { FulfillmentWorkflowService } from "./fulfillment.service.js";
import {
	CreateFulfillmentUseCase,
	DeliverShipmentUseCase,
	ShipFulfillmentUseCase,
} from "./fulfillment.use-cases.js";
import { PgFulfillmentRepository } from "./repositories/pg-fulfillment.repository.js";

@Module({
	imports: [DatabaseModule, AdminAccessModule, AdminAuditModule],
	controllers: [AdminFulfillmentController],
	providers: [
		FulfillmentWorkflowService,
		PgFulfillmentRepository,
		{
			provide: CreateFulfillmentUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				fulfillment: PgFulfillmentRepository,
				workflow: FulfillmentWorkflowService,
			) =>
				new CreateFulfillmentUseCase({
					transactions,
					fulfillment,
					workflow,
				}),
			inject: [
				PgTransactionManager,
				PgFulfillmentRepository,
				FulfillmentWorkflowService,
			],
		},
		{
			provide: ShipFulfillmentUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				fulfillment: PgFulfillmentRepository,
				workflow: FulfillmentWorkflowService,
			) =>
				new ShipFulfillmentUseCase({
					transactions,
					fulfillment,
					workflow,
				}),
			inject: [
				PgTransactionManager,
				PgFulfillmentRepository,
				FulfillmentWorkflowService,
			],
		},
		{
			provide: DeliverShipmentUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				fulfillment: PgFulfillmentRepository,
				workflow: FulfillmentWorkflowService,
			) =>
				new DeliverShipmentUseCase({
					transactions,
					fulfillment,
					workflow,
				}),
			inject: [
				PgTransactionManager,
				PgFulfillmentRepository,
				FulfillmentWorkflowService,
			],
		},
	],
	exports: [
		FulfillmentWorkflowService,
		PgFulfillmentRepository,
		CreateFulfillmentUseCase,
		ShipFulfillmentUseCase,
		DeliverShipmentUseCase,
	],
})
export class FulfillmentModule {}
