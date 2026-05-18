import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import type { AdminAccessService } from "../../admin-access/admin-access.service.js";
import type {
	ListAdminPaymentOrdersUseCase,
	ListAdminPaymentTransactionsUseCase,
	ListAdminPaymentWebhooksUseCase,
} from "../payment.use-cases.js";
import { AdminPaymentController } from "./admin-payment.controller.js";

function createController(input: {
	access?: unknown;
	orders?: unknown;
	transactions?: unknown;
	webhooks?: unknown;
}) {
	return new AdminPaymentController(
		input.access as AdminAccessService,
		input.orders as ListAdminPaymentOrdersUseCase,
		input.transactions as ListAdminPaymentTransactionsUseCase,
		input.webhooks as ListAdminPaymentWebhooksUseCase,
	);
}

describe("AdminPaymentController", () => {
	it("lists scoped payment orders with idempotency and webhook visibility", async () => {
		const access = {
			source: "database" as const,
			adminUserId: "admin-1",
			scopes: [{ scopeType: "site" as const, scopeId: defaultSiteContext.siteId }],
		};
		const resolveForRequest = vi.fn(async () => access);
		const execute = vi.fn(async () => [
			{
				paymentOrderId: "pay-1",
				paymentNo: "PAY202605160001",
				orderId: "order-1",
				orderNo: "CB202605160001",
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				channelCode: "stripe",
				status: "succeeded",
				amount: "100.00",
				currency: "USD",
				idempotencyKey: "pay-order-1",
				transactionCount: 1,
				latestWebhookEventId: "evt_1",
				latestWebhookStatus: "processed",
				createdAt: "2026-05-16T00:00:00.000Z",
				updatedAt: "2026-05-16T00:00:00.000Z",
			},
		]);
		const controller = createController({
			access: { resolveForRequest },
			orders: { execute },
			transactions: { execute: async () => [] },
			webhooks: { execute: async () => [] },
		});

		const response = await controller.listPaymentOrders(
			{ headers: { "x-admin-user-id": "admin-1" } },
			{ scopeType: "site", scopeId: defaultSiteContext.siteId, limit: 20 },
		);

		expect(execute).toHaveBeenCalledWith({
			adminAccess: access,
			selectedScope: {
				scopeType: "site",
				scopeId: defaultSiteContext.siteId,
			},
			limit: 20,
		});
		expect(response.paymentOrders[0]).toMatchObject({
			paymentNo: "PAY202605160001",
			idempotencyKey: "pay-order-1",
			latestWebhookEventId: "evt_1",
		});
	});

	it("lists scoped payment transactions", async () => {
		const execute = vi.fn(async () => [
			{
				paymentTransactionId: "txn-1",
				paymentOrderId: "pay-1",
				paymentNo: "PAY202605160001",
				orderId: "order-1",
				orderNo: "CB202605160001",
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				channelCode: "stripe",
				providerTransactionId: "pi_1",
				transactionType: "sale",
				status: "succeeded",
				amount: "100.00",
				currency: "USD",
				createdAt: "2026-05-16T00:00:00.000Z",
			},
		]);
		const controller = createController({
			access: {
				resolveForRequest: async () => ({
					source: "fallback",
					scopes: [{ scopeType: "global" }],
				}),
			},
			orders: { execute: async () => [] },
			transactions: { execute },
			webhooks: { execute: async () => [] },
		});

		const response = await controller.listPaymentTransactions(
			{ headers: {} },
			{ scopeType: "global", limit: 10 },
		);

		expect(response.paymentTransactions[0]?.providerTransactionId).toBe("pi_1");
		expect(execute).toHaveBeenCalledWith({
			adminAccess: {
				source: "fallback",
				scopes: [{ scopeType: "global" }],
			},
			selectedScope: { scopeType: "global" },
			limit: 10,
		});
	});

	it("lists scoped payment webhooks with provider event id and status details", async () => {
		const execute = vi.fn(async () => [
			{
				webhookEventId: "webhook-1",
				paymentOrderId: "pay-1",
				paymentNo: "PAY202605160001",
				orderId: "order-1",
				orderNo: "CB202605160001",
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				channelCode: "stripe",
				providerEventId: "evt_1",
				eventType: "payment_intent.succeeded",
				dedupeKey: "stripe:evt_1",
				duplicateCount: 1,
				status: "processed",
				receivedAt: "2026-05-16T00:00:00.000Z",
				processedAt: "2026-05-16T00:01:00.000Z",
			},
		]);
		const controller = createController({
			access: {
				resolveForRequest: async () => ({
					source: "database",
					scopes: [
						{ scopeType: "site", scopeId: defaultSiteContext.siteId },
					],
				}),
			},
			orders: { execute: async () => [] },
			transactions: { execute: async () => [] },
			webhooks: { execute },
		});

		const response = await controller.listPaymentWebhooks(
			{ headers: {} },
			{ scopeType: "site", scopeId: defaultSiteContext.siteId },
		);

		expect(response.paymentWebhooks[0]).toMatchObject({
			providerEventId: "evt_1",
			eventType: "payment_intent.succeeded",
			status: "processed",
			processedAt: "2026-05-16T00:01:00.000Z",
			dedupeKey: "stripe:evt_1",
		});
	});

	it("rejects non-global selected scope without scope id", async () => {
		const controller = createController({
			access: {
				resolveForRequest: async () => ({
					source: "fallback",
					scopes: [{ scopeType: "global" }],
				}),
			},
			orders: {
				execute: async () => {
					throw new Error("Should not list without scope id.");
				},
			},
			transactions: { execute: async () => [] },
			webhooks: { execute: async () => [] },
		});

		await expect(
			controller.listPaymentOrders({ headers: {} }, { scopeType: "site" }),
		).rejects.toBeInstanceOf(BadRequestException);
	});
});
