import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import type { AdminAccessService } from "../../admin-access/admin-access.service.js";
import type {
	GetAdminOrderDetailUseCase,
	ListAdminOrdersUseCase,
} from "../order.use-cases.js";
import { AdminOrderController } from "./admin-order.controller.js";

function createController(input: {
	access?: unknown;
	list?: unknown;
	detail?: unknown;
}) {
	return new AdminOrderController(
		input.access as AdminAccessService,
		input.list as ListAdminOrdersUseCase,
		input.detail as GetAdminOrderDetailUseCase,
	);
}

describe("AdminOrderController", () => {
	it("lists orders with admin access and selected site scope", async () => {
		const resolveForRequest = vi.fn(async () => ({
			source: "database" as const,
			adminUserId: "admin-1",
			scopes: [{ scopeType: "site" as const, scopeId: defaultSiteContext.siteId }],
		}));
		const execute = vi.fn(async () => [
			{
				orderId: "order-1",
				orderNo: "CB202605160001",
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				orderStatus: "paid",
				paymentStatus: "paid",
				fulfillmentStatus: "unfulfilled",
				aftersalesStatus: "none",
				currency: "USD",
				totalAmount: "100.00",
				itemCount: 1,
				statusLogCount: 2,
				createdAt: "2026-05-16T00:00:00.000Z",
				updatedAt: "2026-05-16T00:00:00.000Z",
			},
		]);
		const controller = createController({
			access: { resolveForRequest },
			list: { execute },
			detail: { execute: async () => null },
		});

		const response = await controller.listOrders(
			{ headers: { "x-admin-user-id": "admin-1" } },
			{ scopeType: "site", scopeId: defaultSiteContext.siteId, limit: 20 },
		);

		expect(resolveForRequest).toHaveBeenCalledWith({
			headers: { "x-admin-user-id": "admin-1" },
		});
		expect(execute).toHaveBeenCalledWith({
			adminAccess: {
				source: "database",
				adminUserId: "admin-1",
				scopes: [
					{ scopeType: "site", scopeId: defaultSiteContext.siteId },
				],
			},
			selectedScope: {
				scopeType: "site",
				scopeId: defaultSiteContext.siteId,
			},
			limit: 20,
		});
		expect(response.orders[0]?.orderNo).toBe("CB202605160001");
	});

	it("rejects non-global selected scope without scope id", async () => {
		const controller = createController({
			access: {
				resolveForRequest: async () => ({
					source: "fallback",
					scopes: [{ scopeType: "global" }],
				}),
			},
			list: {
				execute: async () => {
					throw new Error("Should not list without scope id.");
				},
			},
			detail: { execute: async () => null },
		});

		await expect(
			controller.listOrders({ headers: {} }, { scopeType: "site" }),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it("returns admin order detail with status and operational records", async () => {
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
			shippingAddressSnapshot: { countryCode: "US" },
			priceSnapshot: { totalAmount: "100.00" },
			cartOrigin: { guestToken: "guest-1", idempotencyKey: "checkout-1" },
			items: [],
			paymentOrders: [
				{
					paymentOrderId: "pay-1",
					paymentNo: "PAY202605160001",
					siteId: defaultSiteContext.siteId,
					verticalId: defaultSiteContext.verticalId,
					brandId: defaultSiteContext.brandId,
					channelCode: "stripe",
					status: "succeeded",
					amount: "100.00",
					currency: "USD",
					idempotencyKey: "pay-1",
					createdAt: "2026-05-16T00:00:00.000Z",
					updatedAt: "2026-05-16T00:00:00.000Z",
				},
			],
			paymentTransactions: [],
			inventoryLocks: [],
			inventoryTransactions: [],
			fulfillmentOrders: [],
			fulfillmentItems: [],
			shipments: [],
			paymentRefunds: [],
			afterSalesRequests: [],
			afterSalesItems: [],
			statusLogs: [],
		}));
		const controller = createController({
			access: {
				resolveForRequest: async () => ({
					source: "database",
					adminUserId: "admin-1",
					scopes: [
						{ scopeType: "site", scopeId: defaultSiteContext.siteId },
					],
				}),
			},
			list: { execute: async () => [] },
			detail: { execute },
		});

		const response = await controller.getOrder({ headers: {} }, "order-1");

		expect(execute).toHaveBeenCalledWith({
			orderId: "order-1",
			adminAccess: {
				source: "database",
				adminUserId: "admin-1",
				scopes: [
					{ scopeType: "site", scopeId: defaultSiteContext.siteId },
				],
			},
		});
		expect(response.paymentStatus).toBe("paid");
		expect(response.paymentOrders[0]?.paymentNo).toBe("PAY202605160001");
	});

	it("hides orders outside the current admin scope", async () => {
		const controller = createController({
			access: {
				resolveForRequest: async () => ({
					source: "database",
					adminUserId: "admin-1",
					scopes: [
						{ scopeType: "site", scopeId: defaultSiteContext.siteId },
					],
				}),
			},
			list: { execute: async () => [] },
			detail: { execute: async () => null },
		});

		await expect(
			controller.getOrder({ headers: {} }, "other-site-order"),
		).rejects.toBeInstanceOf(NotFoundException);
	});
});
