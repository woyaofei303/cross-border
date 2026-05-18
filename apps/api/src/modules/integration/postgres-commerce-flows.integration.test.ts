import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runMigrations } from "@cross-border/database";
import { fallbackGlobalAdminAccess } from "../../common/admin/admin-access.js";
import { defaultSiteContext } from "../../common/site/site-context.js";
import { PgAfterSalesRepository } from "../aftersales/repositories/pg-aftersales.repository.js";
import { AfterSalesWorkflowService } from "../aftersales/aftersales.service.js";
import {
	ApproveRefundUseCase,
	MarkRefundSucceededUseCase,
	RequestRefundUseCase,
} from "../aftersales/aftersales.use-cases.js";
import type { ApiRuntimeConfig } from "../config/runtime-config.types.js";
import { PgEventProcessLogRepository } from "../database/pg/pg-event-process-log.repository.js";
import { PgOutboxRepository } from "../database/pg/pg-outbox.repository.js";
import { PgPoolService } from "../database/pg/pg-pool.service.js";
import { PgTransactionManager } from "../database/pg/pg-transaction-manager.js";
import { PgInventoryRepository } from "../inventory/repositories/pg-inventory.repository.js";
import { InventoryWorkflowService } from "../inventory/inventory.service.js";
import { PgOrderRepository } from "../order/repositories/pg-order.repository.js";
import { OrderWorkflowService } from "../order/order.service.js";
import {
	ApplyPaymentSucceededUseCase,
	CreateOrderUseCase,
	GetStorefrontOrderDetailUseCase,
	GetOrderCheckoutResultUseCase,
	ListStorefrontOrdersUseCase,
} from "../order/order.use-cases.js";
import { PgPaymentRepository } from "../payment/repositories/pg-payment.repository.js";
import { PaymentWorkflowService } from "../payment/payment.service.js";
import {
	CreatePaymentOrderUseCase,
	ProcessPaymentWebhookUseCase,
	ReceivePaymentWebhookUseCase,
} from "../payment/payment.use-cases.js";
import { PgOperationsRepository } from "../operations/repositories/pg-operations.repository.js";
import { PgCommercePipelineRepository } from "../operations/repositories/pg-commerce-pipeline.repository.js";
import { ProcessCommercePipelineUseCase } from "../operations/operations.use-cases.js";
import { PgAnalyticsRepository } from "../analytics/repositories/pg-analytics.repository.js";
import { AnalyticsProjectionService } from "../analytics/analytics.service.js";
import {
	ProcessPendingAnalyticsEventsUseCase,
	ProjectOrderPaidAnalyticsUseCase,
} from "../analytics/analytics.use-cases.js";

const databaseUrl = process.env.DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

type TestIds = {
	categoryId: string;
	productId: string;
	skuId: string;
	warehouseId: string;
	orderId: string;
	orderItemId: string;
	paymentOrderId: string;
	providerPaymentId: string;
	providerEventId: string;
	afterSalesRequestId: string;
	afterSalesItemId: string;
	refundId: string;
	providerRefundId: string;
};

function createRuntimeConfig(connectionString: string): ApiRuntimeConfig {
	return {
		nodeEnv: "test",
		port: 0,
		databaseUrl: connectionString,
		redisUrl: undefined,
		stripeWebhookSecret: undefined,
	};
}

function createIds(): TestIds {
	return {
		categoryId: randomUUID(),
		productId: randomUUID(),
		skuId: randomUUID(),
		warehouseId: randomUUID(),
		orderId: randomUUID(),
		orderItemId: randomUUID(),
		paymentOrderId: randomUUID(),
		providerPaymentId: `pi_${randomUUID()}`,
		providerEventId: `evt_${randomUUID()}`,
		afterSalesRequestId: randomUUID(),
		afterSalesItemId: randomUUID(),
		refundId: randomUUID(),
		providerRefundId: `re_${randomUUID()}`,
	};
}

describeWithDatabase("PostgreSQL commerce flow integration", () => {
	if (!databaseUrl) {
		return;
	}

	const ids = createIds();
	const poolService = new PgPoolService(createRuntimeConfig(databaseUrl));
	const transactions = new PgTransactionManager(poolService);
	const outbox = new PgOutboxRepository();
	const eventProcessLog = new PgEventProcessLogRepository();
	const orders = new PgOrderRepository();
	const payments = new PgPaymentRepository();
	const inventory = new PgInventoryRepository();
	const orderWorkflow = new OrderWorkflowService();
	const paymentWorkflow = new PaymentWorkflowService();
	const inventoryWorkflow = new InventoryWorkflowService();
	const afterSales = new PgAfterSalesRepository();
	const afterSalesWorkflow = new AfterSalesWorkflowService();
	const operations = new PgOperationsRepository(poolService);
	const pipeline = new PgCommercePipelineRepository();
	const analytics = new PgAnalyticsRepository(poolService);
	const analyticsProjection = new AnalyticsProjectionService();
	const createOrder = new CreateOrderUseCase({
		transactions,
		orders,
		inventory,
		outbox,
		orderWorkflow,
		inventoryWorkflow,
	});
	const createPaymentOrder = new CreatePaymentOrderUseCase({
		transactions,
		payments,
		outbox,
		paymentWorkflow,
	});
	const getCheckoutResult = new GetOrderCheckoutResultUseCase({
		transactions,
		orders,
	});
	const listStorefrontOrders = new ListStorefrontOrdersUseCase({
		transactions,
		orders,
	});
	const getStorefrontOrderDetail = new GetStorefrontOrderDetailUseCase({
		transactions,
		orders,
	});
	const receivePaymentWebhook = new ReceivePaymentWebhookUseCase({
		transactions,
		payments,
		outbox,
		paymentWorkflow,
	});
	const processPaymentWebhook = new ProcessPaymentWebhookUseCase({
		transactions,
		payments,
		outbox,
		paymentWorkflow,
	});
	const applyPaymentSucceeded = new ApplyPaymentSucceededUseCase({
		transactions,
		orders,
		inventory,
		outbox,
		orderWorkflow,
		inventoryWorkflow,
		eventProcessLog,
	});
	const projectOrderPaidAnalytics = new ProjectOrderPaidAnalyticsUseCase({
		transactions,
		analytics,
		eventProcessLog,
		projection: analyticsProjection,
	});
	const processPendingAnalyticsEvents =
		new ProcessPendingAnalyticsEventsUseCase({
			transactions,
			analytics,
			projectOrderPaid: projectOrderPaidAnalytics,
		});
	const processCommercePipeline = new ProcessCommercePipelineUseCase({
		transactions,
		pipeline,
		processPaymentWebhook,
		applyPaymentSucceeded,
		processPendingAnalyticsEvents,
	});
	const requestRefund = new RequestRefundUseCase({
		transactions,
		afterSales,
		outbox,
		workflow: afterSalesWorkflow,
	});
	const approveRefund = new ApproveRefundUseCase({
		transactions,
		afterSales,
		outbox,
		workflow: afterSalesWorkflow,
	});
	const markRefundSucceeded = new MarkRefundSucceededUseCase({
		transactions,
		afterSales,
		outbox,
		workflow: afterSalesWorkflow,
	});

	async function cleanup(): Promise<void> {
		const pool = poolService.getPool();

		await pool.query(
			"DELETE FROM event_process_logs WHERE event_id IN (SELECT id FROM domain_events WHERE aggregate_id IN ($1, $2))",
			[ids.orderId, ids.paymentOrderId],
		);
		await pool.query(
			"DELETE FROM domain_events WHERE aggregate_id IN ($1, $2, $3, $4)",
			[
				ids.orderId,
				ids.paymentOrderId,
				ids.afterSalesRequestId,
				ids.refundId,
			],
		);
		await pool.query("DELETE FROM analytics_events WHERE order_id = $1", [
			ids.orderId,
		]);
		await pool.query("DELETE FROM product_performance_stats WHERE product_id = $1", [
			ids.productId,
		]);
		await pool.query(
			"DELETE FROM customer_ltv_stats WHERE customer_identity_key = $1",
			[`guest-${ids.orderId}`],
		);
		await pool.query("DELETE FROM payment_refunds WHERE id = $1", [
			ids.refundId,
		]);
		await pool.query(
			"DELETE FROM after_sales_logs WHERE after_sales_request_id = $1",
			[ids.afterSalesRequestId],
		);
		await pool.query(
			"DELETE FROM after_sales_items WHERE after_sales_request_id = $1",
			[ids.afterSalesRequestId],
		);
		await pool.query("DELETE FROM after_sales_requests WHERE id = $1", [
			ids.afterSalesRequestId,
		]);
		await pool.query(
			"DELETE FROM payment_webhook_events WHERE provider_event_id = $1",
			[ids.providerEventId],
		);
		await pool.query("DELETE FROM payment_transactions WHERE payment_order_id = $1", [
			ids.paymentOrderId,
		]);
		await pool.query("DELETE FROM payment_orders WHERE id = $1", [
			ids.paymentOrderId,
		]);
		await pool.query("DELETE FROM inventory_transactions WHERE order_id = $1", [
			ids.orderId,
		]);
		await pool.query("DELETE FROM inventory_locks WHERE order_id = $1", [
			ids.orderId,
		]);
		await pool.query("DELETE FROM order_status_logs WHERE order_id = $1", [
			ids.orderId,
		]);
		await pool.query("DELETE FROM order_events WHERE order_id = $1", [
			ids.orderId,
		]);
		await pool.query("DELETE FROM order_items WHERE order_id = $1", [
			ids.orderId,
		]);
		await pool.query("DELETE FROM orders WHERE id = $1", [ids.orderId]);
		await pool.query("DELETE FROM sku_inventory WHERE sku_id = $1", [
			ids.skuId,
		]);
		await pool.query("DELETE FROM warehouses WHERE id = $1", [ids.warehouseId]);
		await pool.query("DELETE FROM product_skus WHERE id = $1", [ids.skuId]);
		await pool.query("DELETE FROM products WHERE id = $1", [ids.productId]);
		await pool.query("DELETE FROM product_categories WHERE id = $1", [
			ids.categoryId,
		]);
	}

	async function seedCatalogAndInventory(): Promise<void> {
		const pool = poolService.getPool();

		await pool.query(
			`
        INSERT INTO product_categories (
          id,
          site_id,
          vertical_id,
          brand_id,
          slug,
          name
        )
        VALUES ($1, $2, $3, $4, $5, 'Integration Category')
      `,
			[
				ids.categoryId,
				defaultSiteContext.siteId,
				defaultSiteContext.verticalId,
				defaultSiteContext.brandId,
				`integration-category-${ids.categoryId}`,
			],
		);
		await pool.query(
			`
        INSERT INTO products (
          id,
          site_id,
          vertical_id,
          brand_id,
          category_id,
          spu_code,
          slug,
          title,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'Integration Product', 'active')
      `,
			[
				ids.productId,
				defaultSiteContext.siteId,
				defaultSiteContext.verticalId,
				defaultSiteContext.brandId,
				ids.categoryId,
				`SPU-${ids.productId}`,
				`integration-product-${ids.productId}`,
			],
		);
		await pool.query(
			`
        INSERT INTO product_skus (
          id,
          site_id,
          vertical_id,
          brand_id,
          product_id,
          sku_code,
          title,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'Integration SKU', 'active')
      `,
			[
				ids.skuId,
				defaultSiteContext.siteId,
				defaultSiteContext.verticalId,
				defaultSiteContext.brandId,
				ids.productId,
				`SKU-${ids.skuId}`,
			],
		);
		await pool.query(
			`
        INSERT INTO warehouses (
          id,
          site_id,
          vertical_id,
          brand_id,
          code,
          name,
          country_code,
          status
        )
        VALUES ($1, $2, $3, $4, $5, 'Integration Warehouse', 'US', 'active')
      `,
			[
				ids.warehouseId,
				defaultSiteContext.siteId,
				defaultSiteContext.verticalId,
				defaultSiteContext.brandId,
				`WH-${ids.warehouseId}`,
			],
		);
		await pool.query(
			`
        INSERT INTO sku_inventory (
          site_id,
          vertical_id,
          brand_id,
          sku_id,
          warehouse_id,
          available_qty,
          locked_qty,
          physical_qty,
          inbound_qty,
          safety_qty
        )
        VALUES ($1, $2, $3, $4, $5, 10, 0, 10, 0, 1)
      `,
			[
				defaultSiteContext.siteId,
				defaultSiteContext.verticalId,
				defaultSiteContext.brandId,
				ids.skuId,
				ids.warehouseId,
			],
		);
	}

	beforeAll(async () => {
		await runMigrations({ connectionString: databaseUrl });
		await cleanup();
		await seedCatalogAndInventory();
	});

	afterAll(async () => {
		await cleanup();
		await poolService.onModuleDestroy();
	});

	it("keeps order creation idempotent and locks inventory once", async () => {
		const input = {
			orderId: ids.orderId,
			orderNo: `CB${ids.orderId.replaceAll("-", "").slice(0, 14)}`,
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: `guest-${ids.orderId}`,
			idempotencyKey: `create-order-${ids.orderId}`,
			currency: "USD",
			subtotalAmount: "100.00",
			discountAmount: "0.00",
			shippingAmount: "0.00",
			taxAmount: "0.00",
			totalAmount: "100.00",
			items: [
				{
					orderItemId: ids.orderItemId,
					productId: ids.productId,
					skuId: ids.skuId,
					skuCode: `SKU-${ids.skuId}`,
					productTitle: "Integration Product",
					unitPrice: "50.00",
					quantity: 2,
					discountAmount: "0.00",
					totalAmount: "100.00",
					snapshot: { source: "integration" },
					warehouseId: ids.warehouseId,
					lockExpiresAt: "2026-05-16T01:00:00.000Z",
				},
			],
		};

		const created = await createOrder.execute(input);
		const reused = await createOrder.execute(input);
		const inventoryResult = await poolService.getPool().query<{
			site_id: string | null;
			available_qty: number;
			locked_qty: number;
			physical_qty: number;
		}>(
			`
        SELECT site_id, available_qty, locked_qty, physical_qty
        FROM sku_inventory
        WHERE sku_id = $1 AND warehouse_id = $2
      `,
			[ids.skuId, ids.warehouseId],
		);
		const lockResult = await poolService.getPool().query<{
			site_id: string | null;
		}>(
			`
        SELECT site_id
        FROM inventory_locks
        WHERE order_id = $1
        LIMIT 1
      `,
			[ids.orderId],
		);

		expect(created.reusedIdempotency).toBe(false);
		expect(reused.reusedIdempotency).toBe(true);
		expect(lockResult.rows[0]).toEqual({
			site_id: defaultSiteContext.siteId,
		});
		expect(inventoryResult.rows[0]).toEqual({
			site_id: defaultSiteContext.siteId,
			available_qty: 8,
			locked_qty: 2,
			physical_qty: 10,
		});
	});

	it("deduplicates webhooks, emits PaymentSucceeded, and deducts stock exactly once", async () => {
		const createdPaymentOrder = await createPaymentOrder.execute({
			orderId: ids.orderId,
			paymentOrderId: ids.paymentOrderId,
			paymentNo: `PAY${ids.paymentOrderId.replaceAll("-", "").slice(0, 14)}`,
			channelCode: "stripe",
			amount: "100.00",
			currency: "USD",
			idempotencyKey: `pay-order-${ids.orderId}`,
		});
		const reusedPaymentOrder = await createPaymentOrder.execute({
			orderId: ids.orderId,
			paymentOrderId: ids.paymentOrderId,
			paymentNo: `PAY${ids.paymentOrderId.replaceAll("-", "").slice(0, 14)}`,
			channelCode: "stripe",
			amount: "100.00",
			currency: "USD",
			idempotencyKey: `pay-order-${ids.orderId}`,
		});
		const pendingCheckoutResult = await getCheckoutResult.execute({
			orderId: ids.orderId,
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: `guest-${ids.orderId}`,
		});
		await poolService.getPool().query(
			`
        UPDATE orders
        SET order_status = 'payment_processing',
            payment_status = 'processing'
        WHERE id = $1
      `,
			[ids.orderId],
		);
		await poolService.getPool().query(
			`
        UPDATE payment_orders
        SET status = 'processing',
            provider_payment_id = $2
        WHERE id = $1
      `,
			[ids.paymentOrderId, ids.providerPaymentId],
		);

		const firstWebhook = await receivePaymentWebhook.execute({
			channelCode: "stripe",
			providerEventId: ids.providerEventId,
			eventType: "payment_intent.succeeded",
			providerObjectId: ids.providerPaymentId,
			rawPayload: {
				id: ids.providerEventId,
				type: "payment_intent.succeeded",
			},
		});
		const duplicateWebhook = await receivePaymentWebhook.execute({
			channelCode: "stripe",
			providerEventId: ids.providerEventId,
			eventType: "payment_intent.succeeded",
			providerObjectId: ids.providerPaymentId,
			rawPayload: {
				id: ids.providerEventId,
				type: "payment_intent.succeeded",
			},
		});
		const pipelineResult = await processCommercePipeline.execute({ limit: 10 });
		const inventoryResult = await poolService.getPool().query<{
			site_id: string | null;
			available_qty: number;
			locked_qty: number;
			physical_qty: number;
		}>(
			`
        SELECT site_id, available_qty, locked_qty, physical_qty
        FROM sku_inventory
        WHERE sku_id = $1 AND warehouse_id = $2
      `,
			[ids.skuId, ids.warehouseId],
		);
		const orderResult = await poolService.getPool().query<{
			order_status: string;
			payment_status: string;
		}>(
			`
        SELECT order_status, payment_status
        FROM orders
        WHERE id = $1
      `,
			[ids.orderId],
		);
		const paymentScopeResult = await poolService.getPool().query<{
			payment_order_site_id: string | null;
			webhook_site_id: string | null;
			transaction_site_id: string | null;
		}>(
			`
        SELECT
          payment_orders.site_id AS payment_order_site_id,
          payment_webhook_events.site_id AS webhook_site_id,
          payment_transactions.site_id AS transaction_site_id
        FROM payment_orders
        JOIN payment_webhook_events
          ON payment_webhook_events.payment_order_id = payment_orders.id
        JOIN payment_transactions
          ON payment_transactions.payment_order_id = payment_orders.id
        WHERE payment_orders.id = $1
        LIMIT 1
      `,
			[ids.paymentOrderId],
		);
		const inventoryTransactionResult = await poolService.getPool().query<{
			site_id: string | null;
			type: string;
		}>(
			`
        SELECT site_id, type
        FROM inventory_transactions
        WHERE order_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
			[ids.orderId],
		);
		const analyticsEventResult = await poolService.getPool().query<{
			id: string;
		}>(
			`
        SELECT id
        FROM analytics_events
        WHERE order_id = $1
        LIMIT 1
      `,
			[ids.orderId],
		);
		const paidCheckoutResult = await getCheckoutResult.execute({
			orderId: ids.orderId,
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: `guest-${ids.orderId}`,
		});
		const storefrontOrderList = await listStorefrontOrders.execute({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: `guest-${ids.orderId}`,
		});
		const storefrontOrderDetail = await getStorefrontOrderDetail.execute({
			orderId: ids.orderId,
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: `guest-${ids.orderId}`,
		});
		const blockedOrderDetail = await getStorefrontOrderDetail.execute({
			orderId: ids.orderId,
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: "guest-other-site-session",
		});

		expect(createdPaymentOrder.reusedIdempotency).toBe(false);
		expect(reusedPaymentOrder.reusedIdempotency).toBe(true);
		expect(pendingCheckoutResult).toMatchObject({
			orderId: ids.orderId,
			paymentStatus: "unpaid",
			paymentOrder: {
				paymentOrderId: ids.paymentOrderId,
				status: "created",
			},
		});
		expect(firstWebhook.inserted).toBe(true);
		expect(duplicateWebhook).toEqual({
			inserted: false,
				webhookEventId: firstWebhook.webhookEventId,
			});
		expect(pipelineResult.paymentWebhooks.processed).toBe(1);
		expect(pipelineResult.paymentSucceededEvents.processed).toBe(1);
		expect(pipelineResult.analyticsEvents.processed).toBeGreaterThanOrEqual(1);
		expect(orderResult.rows[0]).toEqual({
			order_status: "paid",
			payment_status: "paid",
		});
		expect(paymentScopeResult.rows[0]).toEqual({
			payment_order_site_id: defaultSiteContext.siteId,
			webhook_site_id: defaultSiteContext.siteId,
			transaction_site_id: defaultSiteContext.siteId,
		});
		expect(inventoryTransactionResult.rows[0]).toEqual({
			site_id: defaultSiteContext.siteId,
			type: "deduct",
		});
		expect(analyticsEventResult.rowCount).toBe(1);
		expect(paidCheckoutResult).toMatchObject({
			orderId: ids.orderId,
			paymentStatus: "paid",
			orderStatus: "paid",
			paymentOrder: {
				paymentOrderId: ids.paymentOrderId,
				status: "succeeded",
			},
		});
		expect(storefrontOrderList).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					orderId: ids.orderId,
					orderStatus: "paid",
					paymentStatus: "paid",
					itemCount: 1,
					latestPaymentOrder: expect.objectContaining({
						paymentOrderId: ids.paymentOrderId,
						status: "succeeded",
					}),
				}),
			]),
		);
		expect(storefrontOrderDetail).toMatchObject({
			orderId: ids.orderId,
			orderStatus: "paid",
			paymentStatus: "paid",
			shippingAddressSnapshot: {},
			items: [
				expect.objectContaining({
					orderItemId: ids.orderItemId,
					skuId: ids.skuId,
					quantity: 2,
				}),
			],
			shipments: [],
		});
		expect(blockedOrderDetail).toBeNull();
		expect(inventoryResult.rows[0]).toEqual({
			site_id: defaultSiteContext.siteId,
			available_qty: 8,
			locked_qty: 0,
			physical_qty: 8,
		});
	});

	it("creates a refund request, approves it, marks refund success, and exposes scoped ops rows", async () => {
		const requested = await requestRefund.execute({
			requestId: ids.afterSalesRequestId,
			requestNo: `R${ids.afterSalesRequestId.replaceAll("-", "").slice(0, 14)}`,
			orderId: ids.orderId,
			guestToken: `guest-${ids.orderId}`,
			type: "refund_only",
			reason: "Integration refund",
			requestedAmount: "25.00",
			idempotencyKey: `request-refund-${ids.orderId}`,
			items: [
				{
					afterSalesItemId: ids.afterSalesItemId,
					orderItemId: ids.orderItemId,
					quantity: 1,
					requestedAmount: "25.00",
				},
			],
			...defaultSiteContext,
		});
		const requestedAgain = await requestRefund.execute({
			requestId: ids.afterSalesRequestId,
			requestNo: `R${ids.afterSalesRequestId.replaceAll("-", "").slice(0, 14)}`,
			orderId: ids.orderId,
			guestToken: `guest-${ids.orderId}`,
			type: "refund_only",
			reason: "Integration refund",
			requestedAmount: "25.00",
			idempotencyKey: `request-refund-${ids.orderId}`,
			items: [
				{
					afterSalesItemId: ids.afterSalesItemId,
					orderItemId: ids.orderItemId,
					quantity: 1,
					requestedAmount: "25.00",
				},
			],
			...defaultSiteContext,
		});
		const approved = await approveRefund.execute({
			requestId: ids.afterSalesRequestId,
			refundId: ids.refundId,
			refundNo: `RF${ids.refundId.replaceAll("-", "").slice(0, 14)}`,
			approvedAmount: "25.00",
			idempotencyKey: `approve-refund-${ids.orderId}`,
			adminAccess: fallbackGlobalAdminAccess,
		});
		const approvedAgain = await approveRefund.execute({
			requestId: ids.afterSalesRequestId,
			refundId: ids.refundId,
			refundNo: `RF${ids.refundId.replaceAll("-", "").slice(0, 14)}`,
			approvedAmount: "25.00",
			idempotencyKey: `approve-refund-${ids.orderId}`,
			adminAccess: fallbackGlobalAdminAccess,
		});
		const succeeded = await markRefundSucceeded.execute({
			refundId: ids.refundId,
			providerRefundId: ids.providerRefundId,
			responsePayload: { id: ids.providerRefundId, status: "succeeded" },
			adminAccess: fallbackGlobalAdminAccess,
		});
		const duplicateSucceeded = await markRefundSucceeded.execute({
			refundId: ids.refundId,
			providerRefundId: ids.providerRefundId,
			responsePayload: { id: ids.providerRefundId, status: "succeeded" },
			adminAccess: fallbackGlobalAdminAccess,
		});
		const orderResult = await poolService.getPool().query<{
			payment_status: string;
			aftersales_status: string;
		}>(
			`
        SELECT payment_status, aftersales_status
        FROM orders
        WHERE id = $1
      `,
			[ids.orderId],
		);
		const refundResult = await poolService.getPool().query<{
			status: string;
			site_id: string | null;
			provider_refund_id: string | null;
		}>(
			`
        SELECT status, site_id, provider_refund_id
        FROM payment_refunds
        WHERE id = $1
      `,
			[ids.refundId],
		);
		const dashboard = await operations.listRiskDashboard(
			{ limit: 20 },
			fallbackGlobalAdminAccess,
		);

		expect(requested.reusedIdempotency).toBe(false);
		expect(requestedAgain.reusedIdempotency).toBe(true);
		expect(approved.reusedIdempotency).toBe(false);
		expect(approvedAgain.reusedIdempotency).toBe(true);
		expect(succeeded.status).toBe("processed");
		expect(duplicateSucceeded.status).toBe("already_succeeded");
		expect(orderResult.rows[0]).toEqual({
			payment_status: "partially_refunded",
			aftersales_status: "completed",
		});
		expect(refundResult.rows[0]).toEqual({
			status: "succeeded",
			site_id: defaultSiteContext.siteId,
			provider_refund_id: ids.providerRefundId,
		});
		expect(dashboard.afterSalesRequests).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: ids.afterSalesRequestId,
					status: "completed",
					siteId: defaultSiteContext.siteId,
				}),
			]),
		);
		expect(dashboard.paymentRefunds).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: ids.refundId,
					status: "succeeded",
					siteId: defaultSiteContext.siteId,
				}),
			]),
		);
	});
});
