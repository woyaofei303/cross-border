import { Module } from "@nestjs/common";
import { AdminAccessModule } from "../admin-access/admin-access.module.js";
import { AdminAuditModule } from "../admin-audit/admin-audit.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { PgTransactionManager } from "../database/pg/pg-transaction-manager.js";
import { AdminProductController } from "./controllers/admin-product.controller.js";
import {
	AdminProductAttributeController,
	ProductAttributeController,
} from "./controllers/product-attribute.controller.js";
import { ProductController } from "./controllers/product.controller.js";
import { ProductCatalogService } from "./product.service.js";
import {
	CreateAdminProductAttributeOptionUseCase,
	CreateAdminProductAttributeUseCase,
	GetAdminProductDetailUseCase,
	ListAdminCategoriesUseCase,
	ListAdminProductsUseCase,
	UpdateAdminCategoryUseCase,
	UpdateAdminProductAttributeUseCase,
	UpdateAdminProductSkuUseCase,
	UpdateAdminProductStatusUseCase,
} from "./product.use-cases.js";
import { PgProductRepository } from "./repositories/pg-product.repository.js";

@Module({
	imports: [DatabaseModule, AdminAccessModule, AdminAuditModule],
	controllers: [
		ProductController,
		ProductAttributeController,
		AdminProductAttributeController,
		AdminProductController,
	],
	providers: [
		ProductCatalogService,
		PgProductRepository,
		{
			provide: ListAdminProductsUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				products: PgProductRepository,
			) => new ListAdminProductsUseCase({ transactions, products }),
			inject: [PgTransactionManager, PgProductRepository],
		},
		{
			provide: GetAdminProductDetailUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				products: PgProductRepository,
			) => new GetAdminProductDetailUseCase({ transactions, products }),
			inject: [PgTransactionManager, PgProductRepository],
		},
		{
			provide: ListAdminCategoriesUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				products: PgProductRepository,
			) => new ListAdminCategoriesUseCase({ transactions, products }),
			inject: [PgTransactionManager, PgProductRepository],
		},
		{
			provide: UpdateAdminProductStatusUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				products: PgProductRepository,
			) => new UpdateAdminProductStatusUseCase({ transactions, products }),
			inject: [PgTransactionManager, PgProductRepository],
		},
		{
			provide: UpdateAdminProductSkuUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				products: PgProductRepository,
			) => new UpdateAdminProductSkuUseCase({ transactions, products }),
			inject: [PgTransactionManager, PgProductRepository],
		},
		{
			provide: UpdateAdminCategoryUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				products: PgProductRepository,
			) => new UpdateAdminCategoryUseCase({ transactions, products }),
			inject: [PgTransactionManager, PgProductRepository],
		},
		{
			provide: CreateAdminProductAttributeUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				products: PgProductRepository,
			) => new CreateAdminProductAttributeUseCase({ transactions, products }),
			inject: [PgTransactionManager, PgProductRepository],
		},
		{
			provide: UpdateAdminProductAttributeUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				products: PgProductRepository,
			) => new UpdateAdminProductAttributeUseCase({ transactions, products }),
			inject: [PgTransactionManager, PgProductRepository],
		},
		{
			provide: CreateAdminProductAttributeOptionUseCase,
			useFactory: (
				transactions: PgTransactionManager,
				products: PgProductRepository,
			) =>
				new CreateAdminProductAttributeOptionUseCase({
					transactions,
					products,
				}),
			inject: [PgTransactionManager, PgProductRepository],
		},
	],
	exports: [
		ProductCatalogService,
		PgProductRepository,
		ListAdminProductsUseCase,
		GetAdminProductDetailUseCase,
		ListAdminCategoriesUseCase,
		UpdateAdminProductStatusUseCase,
		UpdateAdminProductSkuUseCase,
		UpdateAdminCategoryUseCase,
		CreateAdminProductAttributeUseCase,
		UpdateAdminProductAttributeUseCase,
		CreateAdminProductAttributeOptionUseCase,
	],
})
export class ProductModule {}
