import type {
	EventProcessLogPort,
	TransactionManagerPort,
} from "../../common/application/application-ports.js";
import { DomainRuleViolationError } from "../../common/domain/domain-errors.js";
import type { AnalyticsRepositoryPort } from "./analytics.ports.js";
import { AnalyticsProjectionService } from "./analytics.service.js";

export type ProjectOrderPaidAnalyticsUseCaseResult =
	| {
			status: "processed";
	  }
	| {
			status: "already_processed";
	  }
	| {
			status: "ignored";
			reason: string;
	  }
	| {
			status: "failed";
			errorMessage: string;
	  };

export type ProjectOrderPaidAnalyticsUseCaseDeps = {
	transactions: TransactionManagerPort;
	analytics: AnalyticsRepositoryPort;
	eventProcessLog: EventProcessLogPort;
	projection: AnalyticsProjectionService;
};

export class ProjectOrderPaidAnalyticsUseCase {
	private readonly consumerName = "analytics.project_order_paid";
	private readonly maxRetryCount = 5;
	private readonly retryDelaySeconds = 60;

	constructor(private readonly deps: ProjectOrderPaidAnalyticsUseCaseDeps) {}

	async execute(
		eventId: string,
	): Promise<ProjectOrderPaidAnalyticsUseCaseResult> {
		return this.deps.transactions.runInTransaction(async (transaction) => {
			const processingStatus =
				await this.deps.eventProcessLog.tryStartProcessing({
					eventId,
					consumerName: this.consumerName,
					transaction,
				});

			if (processingStatus === "already_processed") {
				await this.deps.analytics.markDomainEventProcessed(
					eventId,
					transaction,
				);
				return {
					status: "already_processed",
				};
			}

			try {
				const event = await this.deps.analytics.getDomainEventForUpdate(
					eventId,
					transaction,
				);

				if (!event) {
					throw new Error(`Domain event not found: ${eventId}.`);
				}

				if (event.eventType !== "OrderPaid") {
					await this.deps.eventProcessLog.markProcessed({
						eventId,
						consumerName: this.consumerName,
						transaction,
					});

					return {
						status: "ignored",
						reason: `Unsupported event type: ${event.eventType}.`,
					};
				}

				const paymentOrderId = event.payload.paymentOrderId;
				const orderId = event.payload.orderId;

				if (typeof paymentOrderId !== "string" || typeof orderId !== "string") {
					throw new DomainRuleViolationError(
						"OrderPaid analytics projection requires orderId and paymentOrderId.",
						"ANALYTICS_EVENT_PAYLOAD_INVALID",
					);
				}

				const order = await this.deps.analytics.getOrderAnalyticsSnapshot(
					{
						orderId,
						paymentOrderId,
					},
					transaction,
				);
				const projection = this.deps.projection.planOrderPaidProjection({
					event,
					order,
				});
				const inserted = await this.deps.analytics.appendAnalyticsEventIfNew(
					projection.analyticsEvent,
					transaction,
				);

				if (inserted) {
					for (const delta of projection.dailySales) {
						await this.deps.analytics.upsertDailySalesDelta(
							delta,
							transaction,
						);
					}

					for (const delta of projection.channelPerformance) {
						await this.deps.analytics.upsertChannelPerformanceDelta(
							delta,
							transaction,
						);
					}

					for (const delta of projection.productPerformance) {
						await this.deps.analytics.upsertProductPerformanceDelta(
							delta,
							transaction,
						);
					}

					for (const delta of projection.customerLtv) {
						await this.deps.analytics.upsertCustomerLtvDelta(
							delta,
							transaction,
						);
					}
				}

				await this.deps.eventProcessLog.markProcessed({
					eventId,
					consumerName: this.consumerName,
					transaction,
				});
				await this.deps.analytics.markDomainEventProcessed(
					eventId,
					transaction,
				);

				return {
					status: "processed",
				};
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				await this.deps.eventProcessLog.markFailed({
					eventId,
					consumerName: this.consumerName,
					errorMessage,
					transaction,
				});
				await this.deps.analytics.markDomainEventFailed(
					{
						eventId,
						maxRetryCount: this.maxRetryCount,
						retryDelaySeconds: this.retryDelaySeconds,
					},
					transaction,
				);

				if (error instanceof DomainRuleViolationError) {
					return {
						status: "failed",
						errorMessage,
					};
				}

				throw error;
			}
		});
	}
}

export type ProcessPendingAnalyticsEventsUseCaseResult = {
	claimed: number;
	processed: number;
	alreadyProcessed: number;
	ignored: number;
	failed: number;
	results: Array<{
		eventId: string;
		status: ProjectOrderPaidAnalyticsUseCaseResult["status"];
		reason?: string;
		errorMessage?: string;
	}>;
};

export type ProcessPendingAnalyticsEventsUseCaseDeps = {
	transactions: TransactionManagerPort;
	analytics: AnalyticsRepositoryPort;
	projectOrderPaid: ProjectOrderPaidAnalyticsUseCase;
};

export class ProcessPendingAnalyticsEventsUseCase {
	constructor(
		private readonly deps: ProcessPendingAnalyticsEventsUseCaseDeps,
	) {}

	async execute(input?: {
		limit?: number;
	}): Promise<ProcessPendingAnalyticsEventsUseCaseResult> {
		const limit = Math.min(Math.max(input?.limit ?? 50, 1), 200);
		const eventIds = await this.deps.transactions.runInTransaction(
			async (transaction) =>
				this.deps.analytics.claimPendingOrderPaidEvents({
					limit,
					transaction,
				}),
		);
		const results: ProcessPendingAnalyticsEventsUseCaseResult["results"] = [];

		for (const eventId of eventIds) {
			try {
				const result = await this.deps.projectOrderPaid.execute(eventId);

				results.push({
					eventId,
					status: result.status,
					...("reason" in result && result.reason
						? { reason: result.reason }
						: {}),
					...("errorMessage" in result && result.errorMessage
						? { errorMessage: result.errorMessage }
						: {}),
				});
			} catch (error) {
				results.push({
					eventId,
					status: "failed",
					errorMessage: error instanceof Error ? error.message : String(error),
				});
			}
		}

		return {
			claimed: eventIds.length,
			processed: results.filter((result) => result.status === "processed")
				.length,
			alreadyProcessed: results.filter(
				(result) => result.status === "already_processed",
			).length,
			ignored: results.filter((result) => result.status === "ignored").length,
			failed: results.filter((result) => result.status === "failed").length,
			results,
		};
	}
}
