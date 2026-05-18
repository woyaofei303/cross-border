import { Module, type MiddlewareConsumer, type NestModule } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { DomainRuleViolationFilter } from "./common/domain/domain-rule-violation.filter.js";
import { AfterSalesModule } from "./modules/aftersales/aftersales.module.js";
import { AdminAccessModule } from "./modules/admin-access/admin-access.module.js";
import { AdminAuditModule } from "./modules/admin-audit/admin-audit.module.js";
import { AnalyticsModule } from "./modules/analytics/analytics.module.js";
import { CartModule } from "./modules/cart/cart.module.js";
import { ApiConfigModule } from "./modules/config/api-config.module.js";
import { CustomerModule } from "./modules/customer/customer.module.js";
import { DatabaseModule } from "./modules/database/database.module.js";
import { FulfillmentModule } from "./modules/fulfillment/fulfillment.module.js";
import { HealthModule } from "./modules/health/health.module.js";
import { InventoryModule } from "./modules/inventory/inventory.module.js";
import { OrderModule } from "./modules/order/order.module.js";
import { OperationsModule } from "./modules/operations/operations.module.js";
import { PaymentModule } from "./modules/payment/payment.module.js";
import { ProductModule } from "./modules/product/product.module.js";
import { SiteContextMiddleware } from "./modules/site/site-context.middleware.js";
import { SiteModule } from "./modules/site/site.module.js";

@Module({
	imports: [
		ApiConfigModule,
		DatabaseModule,
		HealthModule,
		AdminAccessModule,
		AdminAuditModule,
		SiteModule,
		ProductModule,
		CustomerModule,
		CartModule,
		OrderModule,
		PaymentModule,
		InventoryModule,
		FulfillmentModule,
		AfterSalesModule,
		AnalyticsModule,
		OperationsModule,
	],
	providers: [
		{
			provide: APP_FILTER,
			useClass: DomainRuleViolationFilter,
		},
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer): void {
		consumer.apply(SiteContextMiddleware).forRoutes("*");
	}
}
