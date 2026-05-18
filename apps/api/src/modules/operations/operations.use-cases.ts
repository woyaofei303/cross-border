import type { PaymentSucceededPayload } from "@cross-border/shared";
import type { TransactionManagerPort } from "../../common/application/application-ports.js";
import { ProcessPendingAnalyticsEventsUseCase } from "../analytics/analytics.use-cases.js";
import { ApplyPaymentSucceededUseCase } from "../order/order.use-cases.js";
import { ProcessPaymentWebhookUseCase } from "../payment/payment.use-cases.js";
import type { CommercePipelineRepositoryPort } from "./operations.ports.js";
import type {
	CommercePipelineBatchResult,
	CommercePipelineDomainEvent,
	CommercePipelineResult,
	CommercePipelineResultItem,
} from "./operations.types.js";

export type ProcessCommercePipelineUseCaseDeps = {
	transactions: TransactionManagerPort;
	pipeline: CommercePipelineRepositoryPort;
	processPaymentWebhook: ProcessPaymentWebhookUseCase;
	applyPaymentSucceeded: ApplyPaymentSucceededUseCase;
	processPendingAnalyticsEvents: ProcessPendingAnalyticsEventsUseCase;
};

function clampLimit(limit: number | undefined): number {
	if (!Number.isInteger(limit)) {
		return 50;
	}

	return Math.min(Math.max(limit ?? 50, 1), 200);
}

function emptyBatchResult(): CommercePipelineBatchResult {
	return {
		claimed: 0,
		processed: 0,
		skipped: 0,
		alreadyProcessed: 0,
		failed: 0,
		results: [],
	};
}

function summarizeBatch(
	results: CommercePipelineResultItem[],
): CommercePipelineBatchResult {
	return {
		claimed: results.length,
		processed: results.filter((result) => result.status === "processed")
			.length,
		skipped: results.filter((result) => result.status === "skipped").length,
		alreadyProcessed: results.filter(
			(result) => result.status === "already_processed",
		).length,
		failed: results.filter((result) => result.status === "failed").length,
		results,
	};
}

function parsePaymentSucceededEvent(
	event: CommercePipelineDomainEvent,
): PaymentSucceededPayload {
	const { paymentOrderId, orderId, amount, currency, providerTransactionId } =
		event.payload;

	if (
		typeof paymentOrderId !== "string" ||
		typeof orderId !== "string" ||
		typeof amount !== "string" ||
		typeof currency !== "string" ||
		typeof providerTransactionId !== "string"
	) {
		throw new Error(
			`PaymentSucceeded event payload is invalid: ${event.id}.`,
		);
	}

	return {
		paymentOrderId,
		orderId,
		amount,
		currency,
		providerTransactionId,
	};
}

export class ProcessCommercePipelineUseCase {
	private readonly maxRetryCount = 5;
	private readonly retryDelaySeconds = 60;

	constructor(private readonly deps: ProcessCommercePipelineUseCaseDeps) {}

	async execute(input?: { limit?: number }): Promise<CommercePipelineResult> {
		const limit = clampLimit(input?.limit);
		const paymentWebhooks = await this.processPaymentWebhooks(limit);
		const paymentSucceededEvents =
			await this.processPaymentSucceededEvents(limit);
		const analyticsEvents = await this.deps.processPendingAnalyticsEvents.execute({
			limit,
		});

		return {
			paymentWebhooks,
			paymentSucceededEvents,
			analyticsEvents: {
				claimed: analyticsEvents.claimed,
				processed: analyticsEvents.processed,
				alreadyProcessed: analyticsEvents.alreadyProcessed,
				ignored: analyticsEvents.ignored,
				failed: analyticsEvents.failed,
				results: analyticsEvents.results.map((result) => ({
					id: result.eventId,
					status: result.status,
					...(result.reason ? { reason: result.reason } : {}),
					...(result.errorMessage
						? { errorMessage: result.errorMessage }
						: {}),
				})),
			},
		};
	}

	private async processPaymentWebhooks(
		limit: number,
	): Promise<CommercePipelineBatchResult> {
		const webhookIds = await this.deps.transactions.runInTransaction(
			async (transaction) =>
				this.deps.pipeline.claimPendingPaymentWebhookIds({
					limit,
					transaction,
				}),
		);

		if (webhookIds.length === 0) {
			return emptyBatchResult();
		}

		const results: CommercePipelineResultItem[] = [];

		for (const webhookEventId of webhookIds) {
			try {
				const result =
					await this.deps.processPaymentWebhook.execute(webhookEventId);

				results.push({
					id: webhookEventId,
					status: result.status,
					...("reason" in result && result.reason
						? { reason: result.reason }
						: {}),
					...("errorMessage" in result && result.errorMessage
						? { errorMessage: result.errorMessage }
						: {}),
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);

				await this.deps.transactions.runInTransaction(async (transaction) =>
					this.deps.pipeline.markPaymentWebhookFailed({
						webhookEventId,
						errorMessage,
						transaction,
					}),
				);
				results.push({
					id: webhookEventId,
					status: "failed",
					errorMessage,
				});
			}
		}

		return summarizeBatch(results);
	}

	private async processPaymentSucceededEvents(
		limit: number,
	): Promise<CommercePipelineBatchResult> {
		const events = await this.deps.transactions.runInTransaction(
			async (transaction) =>
				this.deps.pipeline.claimPendingPaymentSucceededEvents({
					limit,
					transaction,
				}),
		);

		if (events.length === 0) {
			return emptyBatchResult();
		}

		const results: CommercePipelineResultItem[] = [];

		for (const event of events) {
			try {
				const payload = parsePaymentSucceededEvent(event);
				const result = await this.deps.applyPaymentSucceeded.execute({
					eventId: event.id,
					...payload,
				});

				if (result.status === "processed" || result.status === "already_processed") {
					await this.markDomainEventProcessed(event.id);
				} else {
					await this.markDomainEventFailed(event.id);
				}

				results.push({
					id: event.id,
					status: result.status,
					...("errorMessage" in result && result.errorMessage
						? { errorMessage: result.errorMessage }
						: {}),
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);

				await this.markDomainEventFailed(event.id);
				results.push({
					id: event.id,
					status: "failed",
					errorMessage,
				});
			}
		}

		return summarizeBatch(results);
	}

	private async markDomainEventProcessed(eventId: string): Promise<void> {
		await this.deps.transactions.runInTransaction(async (transaction) =>
			this.deps.pipeline.markDomainEventProcessed({
				eventId,
				transaction,
			}),
		);
	}

	private async markDomainEventFailed(eventId: string): Promise<void> {
		await this.deps.transactions.runInTransaction(async (transaction) =>
			this.deps.pipeline.markDomainEventFailed({
				eventId,
				maxRetryCount: this.maxRetryCount,
				retryDelaySeconds: this.retryDelaySeconds,
				transaction,
			}),
		);
	}
}
