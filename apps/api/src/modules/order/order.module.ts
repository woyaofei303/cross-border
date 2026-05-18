import { Module } from "@nestjs/common";
import { AdminAccessModule } from "../admin-access/admin-access.module.js";
import { PgEventProcessLogRepository } from "../database/pg/pg-event-process-log.repository.js";
import { PgOutboxRepository } from "../database/pg/pg-outbox.repository.js";
import { PgTransactionManager } from "../database/pg/pg-transaction-manager.js";
import { DatabaseModule } from "../database/database.module.js";
import { InventoryWorkflowService } from "../inventory/inventory.service.js";
import { InventoryModule } from "../inventory/inventory.module.js";
import { PgInventoryRepository } from "../inventory/repositories/pg-inventory.repository.js";
import { AdminOrderController } from "./controllers/admin-order.controller.js";
import { OrderController } from "./controllers/order.controller.js";
import { PgOrderRepository } from "./repositories/pg-order.repository.js";
import { OrderWorkflowService } from "./order.service.js";
import {
	ApplyPaymentSucceededUseCase,
	CreateOrderUseCase,
	GetAdminOrderDetailUseCase,
	GetStorefrontOrderDetailUseCase,
	GetOrderCheckoutResultUseCase,
	ListAdminOrdersUseCase,
	ListStorefrontOrdersUseCase,
} from "./order.use-cases.js";

@Module({
	imports: [DatabaseModule, InventoryModule, AdminAccessModule],
	controllers: [OrderController, AdminOrderController],
	providers: [
		OrderWorkflowService,
		PgOrderRepository,
		{
			provide: CreateOrderUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				orders: PgOrderRepository,
				inventory: PgInventoryRepository,
				outbox: PgOutboxRepository,
				orderWorkflow: OrderWorkflowService,
				inventoryWorkflow: InventoryWorkflowService,
			) =>
				new CreateOrderUseCase({
					transactions,
					orders,
					inventory,
					outbox,
					orderWorkflow,
					inventoryWorkflow,
				}),
			inject: [
				PgTransactionManager,
				PgOrderRepository,
				PgInventoryRepository,
				PgOutboxRepository,
				OrderWorkflowService,
				InventoryWorkflowService,
			],
		},
		{
			provide: ApplyPaymentSucceededUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				orders: PgOrderRepository,
				inventory: PgInventoryRepository,
				outbox: PgOutboxRepository,
				orderWorkflow: OrderWorkflowService,
				inventoryWorkflow: InventoryWorkflowService,
				eventProcessLog: PgEventProcessLogRepository,
			) =>
				new ApplyPaymentSucceededUseCase({
					transactions,
					orders,
					inventory,
					outbox,
					orderWorkflow,
					inventoryWorkflow,
					eventProcessLog,
				}),
			inject: [
				PgTransactionManager,
				PgOrderRepository,
				PgInventoryRepository,
				PgOutboxRepository,
				OrderWorkflowService,
				InventoryWorkflowService,
				PgEventProcessLogRepository,
			],
		},
		{
			provide: GetOrderCheckoutResultUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				orders: PgOrderRepository,
			) =>
				new GetOrderCheckoutResultUseCase({
					transactions,
					orders,
				}),
			inject: [PgTransactionManager, PgOrderRepository],
		},
		{
			provide: ListStorefrontOrdersUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				orders: PgOrderRepository,
			) =>
				new ListStorefrontOrdersUseCase({
					transactions,
					orders,
				}),
			inject: [PgTransactionManager, PgOrderRepository],
		},
		{
			provide: GetStorefrontOrderDetailUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				orders: PgOrderRepository,
			) =>
				new GetStorefrontOrderDetailUseCase({
					transactions,
					orders,
				}),
			inject: [PgTransactionManager, PgOrderRepository],
		},
		{
			provide: ListAdminOrdersUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				orders: PgOrderRepository,
			) =>
				new ListAdminOrdersUseCase({
					transactions,
					orders,
				}),
			inject: [PgTransactionManager, PgOrderRepository],
		},
		{
			provide: GetAdminOrderDetailUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				orders: PgOrderRepository,
			) =>
				new GetAdminOrderDetailUseCase({
					transactions,
					orders,
				}),
			inject: [PgTransactionManager, PgOrderRepository],
		},
	],
	exports: [
		OrderWorkflowService,
		PgOrderRepository,
		CreateOrderUseCase,
		ApplyPaymentSucceededUseCase,
		GetOrderCheckoutResultUseCase,
		ListStorefrontOrdersUseCase,
		GetStorefrontOrderDetailUseCase,
		ListAdminOrdersUseCase,
		GetAdminOrderDetailUseCase,
	],
})
export class OrderModule {}
