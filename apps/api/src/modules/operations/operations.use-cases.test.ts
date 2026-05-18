import { describe, expect, it } from "vitest";
import {
	NoopTransactionManager,
	type TransactionContext,
} from "../../common/application/application-ports.js";
import type { ProcessPendingAnalyticsEventsUseCase } from "../analytics/analytics.use-cases.js";
import type { ApplyPaymentSucceededUseCase } from "../order/order.use-cases.js";
import type { ProcessPaymentWebhookUseCase } from "../payment/payment.use-cases.js";
import type { CommercePipelineRepositoryPort } from "./operations.ports.js";
import type { CommercePipelineDomainEvent } from "./operations.types.js";
import { ProcessCommercePipelineUseCase } from "./operations.use-cases.js";

class MemoryPipelineRepository implements CommercePipelineRepositoryPort {
	webhookIds = ["webhook-1"];
	paymentSucceededEvents: CommercePipelineDomainEvent[] = [
		{
			id: "payment-event-1",
			payload: {
				paymentOrderId: "payment-1",
				orderId: "order-1",
				amount: "49.00",
				currency: "USD",
				providerTransactionId: "pi_1",
			},
		},
	];
	failedWebhooks: Array<{ webhookEventId: string; errorMessage: string }> = [];
	processedEvents: string[] = [];
	failedEvents: string[] = [];

	async claimPendingPaymentWebhookIds(): Promise<string[]> {
		return this.webhookIds;
	}

	async claimPendingPaymentSucceededEvents() {
		return this.paymentSucceededEvents;
	}

	async markPaymentWebhookFailed(input: {
		webhookEventId: string;
		errorMessage: string;
		transaction: TransactionContext;
	}): Promise<void> {
		void input.transaction;
		this.failedWebhooks.push({
			webhookEventId: input.webhookEventId,
			errorMessage: input.errorMessage,
		});
	}

	async markDomainEventProcessed(input: {
		eventId: string;
		transaction: TransactionContext;
	}): Promise<void> {
		void input.transaction;
		this.processedEvents.push(input.eventId);
	}

	async markDomainEventFailed(input: {
		eventId: string;
		transaction: TransactionContext;
	}): Promise<void> {
		void input.transaction;
		this.failedEvents.push(input.eventId);
	}
}

function createUseCase(input?: {
	processWebhook?: ProcessPaymentWebhookUseCase["execute"];
	applyPayment?: ApplyPaymentSucceededUseCase["execute"];
	processAnalytics?: ProcessPendingAnalyticsEventsUseCase["execute"];
}) {
	const pipeline = new MemoryPipelineRepository();
	const useCase = new ProcessCommercePipelineUseCase({
		transactions: new NoopTransactionManager(),
		pipeline,
		processPaymentWebhook: {
			execute:
				input?.processWebhook ??
				(async () => ({
					status: "processed",
					webhook: {} as never,
					paymentOrder: {} as never,
					events: [],
				})),
		} as unknown as ProcessPaymentWebhookUseCase,
		applyPaymentSucceeded: {
			execute:
				input?.applyPayment ??
				(async () => ({
					status: "processed",
					events: [],
				})),
		} as unknown as ApplyPaymentSucceededUseCase,
		processPendingAnalyticsEvents: {
			execute:
				input?.processAnalytics ??
				(async () => ({
					claimed: 1,
					processed: 1,
					alreadyProcessed: 0,
					ignored: 0,
					failed: 0,
					results: [{ eventId: "order-paid-1", status: "processed" }],
				})),
		} as unknown as ProcessPendingAnalyticsEventsUseCase,
	});

	return {
		pipeline,
		useCase,
	};
}

describe("ProcessCommercePipelineUseCase", () => {
	it("processes webhooks, applies payment success, and projects analytics", async () => {
		const { pipeline, useCase } = createUseCase();

		const result = await useCase.execute({ limit: 10 });

		expect(result).toMatchObject({
			paymentWebhooks: {
				claimed: 1,
				processed: 1,
				failed: 0,
			},
			paymentSucceededEvents: {
				claimed: 1,
				processed: 1,
				failed: 0,
			},
			analyticsEvents: {
				claimed: 1,
				processed: 1,
				failed: 0,
			},
		});
		expect(pipeline.processedEvents).toEqual(["payment-event-1"]);
	});

	it("marks failed webhooks and continues with the rest of the batch", async () => {
		const { pipeline, useCase } = createUseCase({
			processWebhook: async () => {
				throw new Error("provider object not found");
			},
		});

		const result = await useCase.execute({ limit: 10 });

		expect(result.paymentWebhooks).toMatchObject({
			claimed: 1,
			processed: 0,
			failed: 1,
		});
		expect(pipeline.failedWebhooks).toEqual([
			{
				webhookEventId: "webhook-1",
				errorMessage: "provider object not found",
			},
		]);
		expect(result.paymentSucceededEvents.processed).toBe(1);
	});

	it("marks malformed PaymentSucceeded events as failed without stopping analytics processing", async () => {
		const { pipeline, useCase } = createUseCase();
		pipeline.paymentSucceededEvents = [
			{
				id: "payment-event-1",
				payload: {
					orderId: "order-1",
				} as Record<string, unknown>,
			},
		];

		const result = await useCase.execute({ limit: 10 });

		expect(result.paymentSucceededEvents).toMatchObject({
			claimed: 1,
			processed: 0,
			failed: 1,
		});
		expect(pipeline.failedEvents).toEqual(["payment-event-1"]);
		expect(result.analyticsEvents.processed).toBe(1);
	});
});
