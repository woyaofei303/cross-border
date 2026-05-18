import { Module } from "@nestjs/common";
import { AdminAccessModule } from "../admin-access/admin-access.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { PgTransactionManager } from "../database/pg/pg-transaction-manager.js";
import { AdminCustomerController } from "./controllers/admin-customer.controller.js";
import { CustomerController } from "./controllers/customer.controller.js";
import {
	GetStorefrontSiteCustomerUseCase,
	ListAdminCustomersUseCase,
	UpsertStorefrontSiteCustomerAddressUseCase,
	UpsertStorefrontSiteCustomerUseCase,
} from "./customer.use-cases.js";
import { PgCustomerRepository } from "./repositories/pg-customer.repository.js";

@Module({
	imports: [DatabaseModule, AdminAccessModule],
	controllers: [CustomerController, AdminCustomerController],
	providers: [
		PgCustomerRepository,
		{
			provide: UpsertStorefrontSiteCustomerUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				customers: PgCustomerRepository,
			) => new UpsertStorefrontSiteCustomerUseCase({ transactions, customers }),
			inject: [PgTransactionManager, PgCustomerRepository],
		},
		{
			provide: UpsertStorefrontSiteCustomerAddressUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				customers: PgCustomerRepository,
			) =>
				new UpsertStorefrontSiteCustomerAddressUseCase({
					transactions,
					customers,
				}),
			inject: [PgTransactionManager, PgCustomerRepository],
		},
		{
			provide: GetStorefrontSiteCustomerUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				customers: PgCustomerRepository,
			) => new GetStorefrontSiteCustomerUseCase({ transactions, customers }),
			inject: [PgTransactionManager, PgCustomerRepository],
		},
		{
			provide: ListAdminCustomersUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				customers: PgCustomerRepository,
			) => new ListAdminCustomersUseCase({ transactions, customers }),
			inject: [PgTransactionManager, PgCustomerRepository],
		},
	],
	exports: [
		UpsertStorefrontSiteCustomerUseCase,
		UpsertStorefrontSiteCustomerAddressUseCase,
		GetStorefrontSiteCustomerUseCase,
		ListAdminCustomersUseCase,
		PgCustomerRepository,
	],
})
export class CustomerModule {}
