import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { TransactionContext } from "../../common/application/application-ports.js";
import { defaultSiteContext } from "../../common/site/site-context.js";
import { FulfillmentWorkflowService } from "./fulfillment.service.js";
import {
	CreateFulfillmentUseCase,
	DeliverShipmentUseCase,
	ShipFulfillmentUseCase,
} from "./fulfillment.use-cases.js";

const transaction = {
	transactionId: Symbol("test"),
} as unknown as TransactionContext;

function createTransactions() {
	return {
		runInTransaction: vi.fn(async (callback) => callback(transaction)),
	};
}

function createOrderSnapshot() {
	return {
		orderId: "order-1",
		orderNo: "CB202605160001",
		siteId: defaultSiteContext.siteId,
		verticalId: defaultSiteContext.verticalId,
		brandId: defaultSiteContext.brandId,
		orderStatus: "paid" as const,
		paymentStatus: "paid" as const,
		fulfillmentStatus: "unfulfilled" as const,
	};
}

function createRepository(overrides: Record<string, unknown> = {}) {
	return {
		findFulfillmentByNo: vi.fn(async () => null),
		getOrderForFulfillment: vi.fn(async () => createOrderSnapshot()),
		createFulfillmentOrder: vi.fn(async (input) => ({
			fulfillmentOrderId: input.fulfillmentOrderId,
			fulfillmentNo: input.fulfillmentNo,
			orderId: input.order.orderId,
			orderNo: input.order.orderNo,
			...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
			status: input.status,
			siteId: input.order.siteId,
			verticalId: input.order.verticalId,
			brandId: input.order.brandId,
			itemCount: 0,
		})),
		createFulfillmentItemsFromOrder: vi.fn(async () => 1),
		updateOrderFulfillmentState: vi.fn(async () => undefined),
		appendOrderStatusLogs: vi.fn(async () => undefined),
		getFulfillmentForUpdate: vi.fn(async () => ({
			fulfillmentOrderId: "fulfillment-1",
			fulfillmentNo: "FUL202605160001",
			orderId: "order-1",
			orderNo: "CB202605160001",
			warehouseId: "warehouse-1",
			status: "pending" as const,
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			itemCount: 1,
			orderStatus: "confirmed" as const,
			paymentStatus: "paid" as const,
			fulfillmentStatus: "pending" as const,
		})),
		upsertLogisticsProvider: vi.fn(async () => "provider-1"),
		insertShipmentIfNew: vi.fn(async () => ({
			inserted: true,
			shipment: {
				shipmentId: "shipment-1",
				fulfillmentOrderId: "fulfillment-1",
				providerId: "provider-1",
				providerCode: "demo-carrier",
				trackingNo: "TRACK-1",
				status: "shipped" as const,
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
			},
		})),
		markFulfillmentShipped: vi.fn(async () => undefined),
		getShipmentForDelivery: vi.fn(async () => ({
			shipmentId: "shipment-1",
			fulfillmentOrderId: "fulfillment-1",
			providerId: "provider-1",
			providerCode: "demo-carrier",
			trackingNo: "TRACK-1",
			status: "shipped" as const,
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			orderId: "order-1",
			orderNo: "CB202605160001",
			orderStatus: "fulfilled" as const,
			fulfillmentOrderStatus: "shipped" as const,
			fulfillmentStatus: "shipped" as const,
		})),
		markShipmentDelivered: vi.fn(async () => undefined),
		...overrides,
	};
}

describe("fulfillment use cases", () => {
	const adminAccess = {
		source: "fallback" as const,
		scopes: [{ scopeType: "global" as const }],
	};

	it("creates fulfillment only for a paid scoped order", async () => {
		const transactions = createTransactions();
		const fulfillment = createRepository();
		const useCase = new CreateFulfillmentUseCase({
			transactions,
			fulfillment,
			workflow: new FulfillmentWorkflowService(),
		});

		const result = await useCase.execute({
			fulfillmentOrderId: "fulfillment-1",
			fulfillmentNo: "FUL202605160001",
			orderId: "order-1",
			warehouseId: "warehouse-1",
			adminAccess,
		});

		expect(result.fulfillment).toMatchObject({
			fulfillmentOrderId: "fulfillment-1",
			status: "pending",
			itemCount: 1,
			warehouseId: "warehouse-1",
		});
		expect(fulfillment.updateOrderFulfillmentState).toHaveBeenCalledWith(
			expect.objectContaining({
				orderId: "order-1",
				orderStatus: "confirmed",
				fulfillmentStatus: "pending",
			}),
			transaction,
		);
	});

	it("rejects fulfillment actions outside admin scope", async () => {
		const transactions = createTransactions();
		const fulfillment = createRepository();
		const useCase = new CreateFulfillmentUseCase({
			transactions,
			fulfillment,
			workflow: new FulfillmentWorkflowService(),
		});

		await expect(
			useCase.execute({
				fulfillmentOrderId: "fulfillment-1",
				fulfillmentNo: "FUL202605160001",
				orderId: "order-1",
				adminAccess: {
					source: "database",
					scopes: [
						{
							scopeType: "site",
							scopeId: "00000000-0000-4000-8000-000000009999",
						},
					],
				},
			}),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it("creates a shipment without changing payment state", async () => {
		const transactions = createTransactions();
		const fulfillment = createRepository();
		const useCase = new ShipFulfillmentUseCase({
			transactions,
			fulfillment,
			workflow: new FulfillmentWorkflowService(),
		});

		const result = await useCase.execute({
			shipmentId: "shipment-1",
			fulfillmentOrderId: "fulfillment-1",
			providerCode: "demo-carrier",
			providerName: "Demo Carrier",
			trackingNo: "TRACK-1",
			adminAccess,
		});

		expect(result).toMatchObject({
			reusedIdempotency: false,
			shipment: {
				shipmentId: "shipment-1",
				status: "shipped",
			},
		});
		expect(fulfillment.markFulfillmentShipped).toHaveBeenCalledWith(
			expect.objectContaining({
				orderStatus: "fulfilled",
				fulfillmentStatus: "shipped",
				fulfillmentOrderStatus: "shipped",
			}),
			transaction,
		);
	});

	it("marks shipped shipment delivered and completes the order", async () => {
		const transactions = createTransactions();
		const fulfillment = createRepository();
		const useCase = new DeliverShipmentUseCase({
			transactions,
			fulfillment,
			workflow: new FulfillmentWorkflowService(),
		});

		const result = await useCase.execute({
			shipmentId: "shipment-1",
			deliveredAt: "2026-05-16T00:00:00.000Z",
			location: "Customer address",
			adminAccess,
		});

		expect(result).toMatchObject({
			status: "processed",
			shipment: {
				shipmentId: "shipment-1",
				status: "delivered",
			},
		});
		expect(fulfillment.markShipmentDelivered).toHaveBeenCalledWith(
			expect.objectContaining({
				orderStatus: "completed",
				fulfillmentStatus: "delivered",
				fulfillmentOrderStatus: "delivered",
			}),
			transaction,
		);
	});
});
