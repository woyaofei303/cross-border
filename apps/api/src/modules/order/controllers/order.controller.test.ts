import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import { OrderController } from "./order.controller.js";
import type {
	CreateOrderUseCase,
	CreateOrderUseCaseInput,
	GetStorefrontOrderDetailUseCase,
	GetOrderCheckoutResultUseCase,
	ListStorefrontOrdersUseCase,
} from "../order.use-cases.js";

function createController(input: {
	create?: unknown;
	checkoutResult?: unknown;
	list?: unknown;
	detail?: unknown;
}) {
	return new OrderController(
		input.create as CreateOrderUseCase,
		input.checkoutResult as GetOrderCheckoutResultUseCase,
		input.list as ListStorefrontOrdersUseCase,
		input.detail as GetStorefrontOrderDetailUseCase,
	);
}

describe("OrderController", () => {
	it("maps create order requests to the use case and generates missing ids", async () => {
		const execute = vi.fn(async (input: CreateOrderUseCaseInput) => ({
			order: {
				orderId: input.orderId,
				orderNo: input.orderNo,
				idempotencyKey: input.idempotencyKey,
			},
			reusedIdempotency: false,
			events: [{ eventType: "OrderCreated" }],
		}));
		const controller = createController({
			create: { execute },
			checkoutResult: { execute: async () => null },
			list: { execute: async () => [] },
			detail: { execute: async () => null },
		});

		const response = await controller.createOrder(
			{
				headers: {},
				siteResolution: {
					status: "resolved",
					domain: "localhost",
					resolvedFrom: "default",
					site: defaultSiteContext,
				},
			},
			{
				guestToken: "guest-1",
				idempotencyKey: "create-order-1",
				currency: "USD",
				subtotalAmount: "100.00",
				discountAmount: "0.00",
				shippingAmount: "0.00",
				taxAmount: "0.00",
				totalAmount: "100.00",
				shippingAddress: {
					email: "buyer@example.com",
					fullName: "Buyer Example",
					addressLine1: "100 Market Street",
					city: "San Francisco",
					region: "CA",
					postalCode: "94105",
					countryCode: "US",
				},
				items: [
					{
						productId: "product-1",
						skuId: "sku-1",
						skuCode: "SKU-1",
						productTitle: "Product",
						unitPrice: "100.00",
						quantity: 1,
						discountAmount: "0.00",
						totalAmount: "100.00",
						warehouseId: "warehouse-1",
					},
				],
			},
		);

		const useCaseInput = execute.mock.calls[0]?.[0];

		expect(useCaseInput).toBeDefined();
		if (!useCaseInput) {
			throw new Error("Create order use case was not called.");
		}

		expect(useCaseInput.orderId).toBeTypeOf("string");
		expect(useCaseInput.orderNo).toMatch(/^CB\d{8}[A-F0-9]{10}$/);
		expect(useCaseInput.siteId).toBe(defaultSiteContext.siteId);
		expect(useCaseInput.items[0].orderItemId).toBeTypeOf("string");
		expect(useCaseInput.items[0].lockExpiresAt).toBeTypeOf("string");
		expect(useCaseInput.shippingAddressSnapshot).toMatchObject({
			email: "buyer@example.com",
			countryCode: "US",
		});
		expect(useCaseInput.priceSnapshot).toMatchObject({
			totalAmount: "100.00",
			currency: "USD",
		});
		expect(response).toMatchObject({
			orderId: useCaseInput.orderId,
			orderNo: useCaseInput.orderNo,
			siteId: defaultSiteContext.siteId,
			reusedIdempotency: false,
			eventsQueued: 1,
		});
	});

	it("rejects order creation when the request domain has no resolved site", async () => {
		const controller = createController({
			create: {
				execute: async () => {
					throw new Error("Should not create an order for unresolved sites.");
				},
			},
			checkoutResult: { execute: async () => null },
			list: { execute: async () => [] },
			detail: { execute: async () => null },
		});

		await expect(
			controller.createOrder(
				{
					headers: {},
					siteResolution: {
						status: "unresolved",
						domain: "unknown.example.com",
						reason: "domain_not_found",
					},
				},
				{
					guestToken: "guest-1",
					idempotencyKey: "create-order-1",
					currency: "USD",
					subtotalAmount: "100.00",
					discountAmount: "0.00",
					shippingAmount: "0.00",
					taxAmount: "0.00",
					totalAmount: "100.00",
					items: [],
				},
			),
		).rejects.toBeInstanceOf(NotFoundException);
	});

	it("returns checkout result only through resolved site and buyer scope", async () => {
		const execute = vi.fn(async () => ({
			orderId: "order-1",
			orderNo: "CB202605160001",
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: "guest-1",
			orderStatus: "paid",
			paymentStatus: "paid",
			fulfillmentStatus: "unfulfilled",
			aftersalesStatus: "none",
			currency: "USD",
			subtotalAmount: "100.00",
			discountAmount: "0.00",
			shippingAmount: "0.00",
			taxAmount: "0.00",
			totalAmount: "100.00",
			createdAt: "2026-05-16T00:00:00.000Z",
			updatedAt: "2026-05-16T00:00:00.000Z",
			paymentOrder: {
				paymentOrderId: "pay-1",
				paymentNo: "PAY202605160001",
				status: "succeeded",
				channelCode: "stripe",
				amount: "100.00",
				currency: "USD",
			},
		}));
		const controller = createController({
			create: {
				execute: async () => {
					throw new Error("Should not create order.");
				},
			},
			checkoutResult: { execute },
			list: { execute: async () => [] },
			detail: { execute: async () => null },
		});

		const response = await controller.getCheckoutResult(
			{
				headers: {},
				siteResolution: {
					status: "resolved",
					domain: "localhost",
					resolvedFrom: "default",
					site: defaultSiteContext,
				},
			},
			"order-1",
			{ guestToken: "guest-1" },
		);

		expect(execute).toHaveBeenCalledWith({
			orderId: "order-1",
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: "guest-1",
		});
		expect(response.paymentStatus).toBe("paid");
		expect(response.paymentOrder?.status).toBe("succeeded");
	});

	it("lists storefront orders through resolved site and buyer scope", async () => {
		const execute = vi.fn(async () => [
			{
				orderId: "order-1",
				orderNo: "CB202605160001",
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				guestToken: "guest-1",
				orderStatus: "paid",
				paymentStatus: "paid",
				fulfillmentStatus: "shipped",
				aftersalesStatus: "none",
				currency: "USD",
				totalAmount: "100.00",
				itemCount: 1,
				firstItemTitle: "Product",
				createdAt: "2026-05-16T00:00:00.000Z",
				updatedAt: "2026-05-16T00:00:00.000Z",
			},
		]);
		const controller = createController({
			create: {
				execute: async () => {
					throw new Error("Should not create order.");
				},
			},
			checkoutResult: { execute: async () => null },
			list: { execute },
			detail: { execute: async () => null },
		});

		const response = await controller.listStorefrontOrders(
			{
				headers: {},
				siteResolution: {
					status: "resolved",
					domain: "localhost",
					resolvedFrom: "default",
					site: defaultSiteContext,
				},
			},
			{ guestToken: "guest-1", limit: 10 },
		);

		expect(execute).toHaveBeenCalledWith({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: "guest-1",
			limit: 10,
		});
		expect(response.orders[0]?.orderNo).toBe("CB202605160001");
	});

	it("returns storefront order detail with items and shipments", async () => {
		const execute = vi.fn(async () => ({
			orderId: "order-1",
			orderNo: "CB202605160001",
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: "guest-1",
			orderStatus: "fulfilled",
			paymentStatus: "paid",
			fulfillmentStatus: "delivered",
			aftersalesStatus: "none",
			currency: "USD",
			subtotalAmount: "100.00",
			discountAmount: "0.00",
			shippingAmount: "0.00",
			taxAmount: "0.00",
			totalAmount: "100.00",
			createdAt: "2026-05-16T00:00:00.000Z",
			updatedAt: "2026-05-16T00:00:00.000Z",
			shippingAddressSnapshot: { countryCode: "US" },
			priceSnapshot: { totalAmount: "100.00" },
			items: [
				{
					orderItemId: "item-1",
					siteId: defaultSiteContext.siteId,
					verticalId: defaultSiteContext.verticalId,
					brandId: defaultSiteContext.brandId,
					productId: "product-1",
					skuId: "sku-1",
					skuCode: "SKU-1",
					productTitle: "Product",
					unitPrice: "100.00",
					quantity: 1,
					discountAmount: "0.00",
					totalAmount: "100.00",
					snapshot: {},
				},
			],
			shipments: [
				{
					shipmentId: "shipment-1",
					fulfillmentOrderId: "fulfillment-1",
					fulfillmentNo: "FUL202605160001",
					fulfillmentStatus: "delivered",
					providerCode: "demo",
					providerName: "Demo Logistics",
					trackingNo: "TRACK123",
					status: "delivered",
					siteId: defaultSiteContext.siteId,
					verticalId: defaultSiteContext.verticalId,
					brandId: defaultSiteContext.brandId,
					trackingEvents: [],
				},
			],
		}));
		const controller = createController({
			create: {
				execute: async () => {
					throw new Error("Should not create order.");
				},
			},
			checkoutResult: { execute: async () => null },
			list: { execute: async () => [] },
			detail: { execute },
		});

		const response = await controller.getStorefrontOrderDetail(
			{
				headers: {},
				siteResolution: {
					status: "resolved",
					domain: "localhost",
					resolvedFrom: "default",
					site: defaultSiteContext,
				},
			},
			"order-1",
			{ guestToken: "guest-1" },
		);

		expect(execute).toHaveBeenCalledWith({
			orderId: "order-1",
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: "guest-1",
		});
		expect(response.items[0]?.skuCode).toBe("SKU-1");
		expect(response.shipments[0]?.trackingNo).toBe("TRACK123");
	});
});
