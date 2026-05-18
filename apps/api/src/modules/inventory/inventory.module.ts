import { Module } from "@nestjs/common";
import { AdminAccessModule } from "../admin-access/admin-access.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { PgTransactionManager } from "../database/pg/pg-transaction-manager.js";
import { AdminInventoryController } from "./controllers/admin-inventory.controller.js";
import { InventoryWorkflowService } from "./inventory.service.js";
import {
	ListAdminInventoryBalancesUseCase,
	ListAdminInventoryLocksUseCase,
	ListAdminInventoryTransactionsUseCase,
} from "./inventory.use-cases.js";
import { PgInventoryRepository } from "./repositories/pg-inventory.repository.js";

@Module({
	imports: [DatabaseModule, AdminAccessModule],
	controllers: [AdminInventoryController],
	providers: [
		InventoryWorkflowService,
		PgInventoryRepository,
		{
			provide: ListAdminInventoryBalancesUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				inventory: PgInventoryRepository,
			) =>
				new ListAdminInventoryBalancesUseCase({
					transactions,
					inventory,
				}),
			inject: [PgTransactionManager, PgInventoryRepository],
		},
		{
			provide: ListAdminInventoryLocksUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				inventory: PgInventoryRepository,
			) =>
				new ListAdminInventoryLocksUseCase({
					transactions,
					inventory,
				}),
			inject: [PgTransactionManager, PgInventoryRepository],
		},
		{
			provide: ListAdminInventoryTransactionsUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				inventory: PgInventoryRepository,
			) =>
				new ListAdminInventoryTransactionsUseCase({
					transactions,
					inventory,
				}),
			inject: [PgTransactionManager, PgInventoryRepository],
		},
	],
	exports: [
		InventoryWorkflowService,
		PgInventoryRepository,
		ListAdminInventoryBalancesUseCase,
		ListAdminInventoryLocksUseCase,
		ListAdminInventoryTransactionsUseCase,
	],
})
export class InventoryModule {}
