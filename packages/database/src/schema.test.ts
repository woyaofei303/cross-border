import { describe, expect, it } from "vitest";
import { highRiskTableNames, tableNames } from "./index.js";

describe("database package contracts", () => {
	it("keeps high-risk table names centralized", () => {
		expect(tableNames.orders).toBe("orders");
		expect(tableNames.verticals).toBe("verticals");
		expect(tableNames.brands).toBe("brands");
		expect(tableNames.sites).toBe("sites");
		expect(tableNames.siteDomains).toBe("site_domains");
		expect(tableNames.siteConfigs).toBe("site_configs");
		expect(tableNames.siteCustomers).toBe("site_customers");
		expect(tableNames.siteCustomerAddresses).toBe("site_customer_addresses");
		expect(tableNames.verticalAttributes).toBe("vertical_attributes");
		expect(tableNames.verticalAttributeOptions).toBe(
			"vertical_attribute_options",
		);
		expect(tableNames.productAttributeValues).toBe("product_attribute_values");
		expect(tableNames.paymentWebhookEvents).toBe("payment_webhook_events");
		expect(tableNames.inventoryLocks).toBe("inventory_locks");
		expect(tableNames.paymentRefunds).toBe("payment_refunds");
		expect(tableNames.fulfillmentOrders).toBe("fulfillment_orders");
		expect(tableNames.adminOperationLogs).toBe("admin_operation_logs");
		expect(tableNames.adminUserScopes).toBe("admin_user_scopes");
		expect(tableNames.skuInventory).toBe("sku_inventory");
		expect(tableNames.domainEvents).toBe("domain_events");
		expect(tableNames.analyticsEvents).toBe("analytics_events");
		expect(tableNames.dailySalesStats).toBe("daily_sales_stats");
		expect(tableNames.channelPerformanceStats).toBe(
			"channel_performance_stats",
		);
		expect(tableNames.productPerformanceStats).toBe(
			"product_performance_stats",
		);
		expect(tableNames.customerLtvStats).toBe("customer_ltv_stats");
		expect(highRiskTableNames).toContain("sites");
		expect(highRiskTableNames).toContain("site_configs");
		expect(highRiskTableNames).toContain("site_customers");
		expect(highRiskTableNames).toContain("site_customer_addresses");
		expect(highRiskTableNames).toContain("vertical_attributes");
		expect(highRiskTableNames).toContain("product_attribute_values");
		expect(highRiskTableNames).toContain("daily_sales_stats");
		expect(highRiskTableNames).toContain("audit_logs");
		expect(highRiskTableNames).toContain("admin_user_scopes");
	});
});
