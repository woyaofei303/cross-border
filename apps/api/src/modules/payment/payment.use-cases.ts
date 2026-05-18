import type {
	OutboxEventDraft,
	OutboxPort,
	TransactionManagerPort,
} from "../../common/application/application-ports.js";
import {
	DomainRuleViolationError,
	assertDomainRule,
} from "../../common/domain/domain-errors.js";
import type {
	AdminPaymentOrderListItem,
	AdminPaymentScopeQuery,
	AdminPaymentTransactionListItem,
	AdminPaymentWebhookListItem,
	PaymentAdminReadRepositoryPort,
	PaymentOrderSummary,
	PaymentWebhookRecord,
	PaymentWriteRepositoryPort,
} from "./payment.ports.js";
import { PaymentWorkflowService } from "./payment.service.js";
import type {
	CreatePaymentOrderInput,
	ReceivePaymentWebhookInput,
} from "./payment.types.js";

export type CreatePaymentOrderUseCaseResult = {
	paymentOrder: PaymentOrderSummary;
	reusedIdempotency: boolean;
};

export type ReceivePaymentWebhookUseCaseResult = {
	webhookEventId: string;
	inserted: boolean;
};

export type ProcessPaymentWebhookUseCaseResult =
	| {
			status: "processed";
			webhook: PaymentWebhookRecord;
			paymentOrder: PaymentOrderSummary;
			events: OutboxEventDraft<Record<string, unknown>>[];
	  }
	| {
			status: "skipped";
			reason: "already_processed" | "payment_outcome_already_applied";
			webhook: PaymentWebhookRecord;
			events: [];
	  }
	| {
			status: "failed";
			webhook: PaymentWebhookRecord;
			errorMessage: string;
			events: [];
	  };

export type PaymentUseCaseDeps = {
	transactions: TransactionManagerPort;
	payments: PaymentWriteRepositoryPort;
	outbox: OutboxPort;
	paymentWorkflow: PaymentWorkflowService;
};

export type PaymentAdminReadUseCaseDeps = {
	transactions: TransactionManagerPort;
	payments: PaymentAdminReadRepositoryPort;
};

export type ListAdminPaymentsUseCaseInput = Omit<
	AdminPaymentScopeQuery,
	"limit"
> & {
	limit?: number;
};

function normalizeAdminPaymentLimit(limit: number | undefined): number {
	if (!Number.isInteger(limit)) {
		return 50;
	}

	return Math.min(Math.max(limit ?? 50, 1), 100);
}

function assertWebhookDimensionsMatchPaymentOrder(
	webhook: PaymentWebhookRecord,
	paymentOrder: PaymentOrderSummary,
): void {
	assertDomainRule(
		!webhook.siteId || webhook.siteId === paymentOrder.siteId,
		"PAYMENT_WEBHOOK_SITE_MISMATCH",
		"Payment webhook site does not match the resolved payment order.",
	);
	assertDomainRule(
		!webhook.verticalId || webhook.verticalId === paymentOrder.verticalId,
		"PAYMENT_WEBHOOK_VERTICAL_MISMATCH",
		"Payment webhook vertical does not match the resolved payment order.",
	);
	assertDomainRule(
		!webhook.brandId || webhook.brandId === paymentOrder.brandId,
		"PAYMENT_WEBHOOK_BRAND_MISMATCH",
		"Payment webhook brand does not match the resolved payment order.",
	);
}

export class CreatePaymentOrderUseCase {
	constructor(private readonly deps: PaymentUseCaseDeps) {}

	async execute(
		input: CreatePaymentOrderInput,
	): Promise<CreatePaymentOrderUseCaseResult> {
		return this.deps.transactions.runInTransaction(async (transaction) => {
			const existingPaymentOrder =
				await this.deps.payments.findPaymentOrderByIdempotencyKey(
					input.idempotencyKey,
					transaction,
				);

			if (existingPaymentOrder) {
				return {
					paymentOrder: existingPaymentOrder,
					reusedIdempotency: true,
				};
			}

			const plan = this.deps.paymentWorkflow.planCreatePaymentOrder(input);
			const paymentOrder = await this.deps.payments.createPaymentOrder(
				plan,
				transaction,
			);

			return {
				paymentOrder,
				reusedIdempotency: false,
			};
		});
	}
}

export class ReceivePaymentWebhookUseCase {
	constructor(private readonly deps: PaymentUseCaseDeps) {}

	async execute(
		input: ReceivePaymentWebhookInput,
	): Promise<ReceivePaymentWebhookUseCaseResult> {
		return this.deps.transactions.runInTransaction(async (transaction) => {
			const plan = this.deps.paymentWorkflow.planReceiveWebhook(input);
			return this.deps.payments.insertWebhookIfNew(plan, transaction);
		});
	}
}

export class ProcessPaymentWebhookUseCase {
	constructor(private readonly deps: PaymentUseCaseDeps) {}

	async execute(
		webhookEventId: string,
	): Promise<ProcessPaymentWebhookUseCaseResult> {
		return this.deps.transactions.runInTransaction(async (transaction) => {
			const webhook = await this.deps.payments.getWebhookForProcessing(
				webhookEventId,
				transaction,
			);

			if (webhook.status === "processed") {
				return {
					status: "skipped",
					reason: "already_processed",
					webhook,
					events: [],
				};
			}

			await this.deps.payments.updateWebhookStatus({
				webhookEventId,
				status: "processing",
				transaction,
			});

			try {
				const paymentOrder =
					await this.deps.payments.findPaymentOrderForWebhook(
						webhook,
						transaction,
					);
				assertWebhookDimensionsMatchPaymentOrder(webhook, paymentOrder);
				await this.deps.payments.attachWebhookToPaymentOrder({
					webhookEventId,
					paymentOrder,
					transaction,
				});
				const outcome = this.deps.paymentWorkflow.getWebhookOutcome(
					webhook.eventType,
				);

				if (
					(outcome === "succeeded" && paymentOrder.status === "succeeded") ||
					(outcome === "failed" && paymentOrder.status === "failed")
				) {
					await this.deps.payments.updateWebhookStatus({
						webhookEventId,
						status: "processed",
						transaction,
					});

					return {
						status: "skipped",
						reason: "payment_outcome_already_applied",
						webhook,
						events: [],
					};
				}

				const plan = this.deps.paymentWorkflow.planProcessWebhook({
					paymentOrderId: paymentOrder.paymentOrderId,
					orderId: paymentOrder.orderId,
					currentPaymentOrderStatus: paymentOrder.status,
					channelCode: paymentOrder.channelCode,
					providerEventId: webhook.providerEventId,
					providerTransactionId:
						webhook.providerObjectId ?? webhook.providerEventId,
					eventType: webhook.eventType,
					amount: paymentOrder.amount,
					currency: paymentOrder.currency,
					expectedAmount: paymentOrder.amount,
					expectedCurrency: paymentOrder.currency,
					rawPayload: webhook.rawPayload,
					siteId: paymentOrder.siteId,
					verticalId: paymentOrder.verticalId,
					brandId: paymentOrder.brandId,
				});

				await this.deps.payments.appendTransaction(
					plan.transaction,
					transaction,
				);
				await this.deps.payments.updatePaymentOrderStatus({
					paymentOrderId: paymentOrder.paymentOrderId,
					status: plan.nextPaymentOrderStatus,
					transaction,
				});
				await this.deps.outbox.append(plan.events, transaction);
				await this.deps.payments.updateWebhookStatus({
					webhookEventId,
					status: "processed",
					transaction,
				});

				return {
					status: "processed",
					webhook,
					paymentOrder,
					events: plan.events,
				};
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);

				if (error instanceof DomainRuleViolationError) {
					await this.deps.payments.updateWebhookStatus({
						webhookEventId,
						status: "failed",
						errorMessage,
						transaction,
					});

					return {
						status: "failed",
						webhook,
						errorMessage,
						events: [],
					};
				}

				throw error;
			}
		});
	}
}

export class ListAdminPaymentOrdersUseCase {
	constructor(private readonly deps: PaymentAdminReadUseCaseDeps) {}

	async execute(
		input: ListAdminPaymentsUseCaseInput,
	): Promise<AdminPaymentOrderListItem[]> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.payments.listAdminPaymentOrders(
				{
					adminAccess: input.adminAccess,
					...(input.selectedScope ? { selectedScope: input.selectedScope } : {}),
					limit: normalizeAdminPaymentLimit(input.limit),
				},
				transaction,
			),
		);
	}
}

export class ListAdminPaymentTransactionsUseCase {
	constructor(private readonly deps: PaymentAdminReadUseCaseDeps) {}

	async execute(
		input: ListAdminPaymentsUseCaseInput,
	): Promise<AdminPaymentTransactionListItem[]> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.payments.listAdminPaymentTransactions(
				{
					adminAccess: input.adminAccess,
					...(input.selectedScope ? { selectedScope: input.selectedScope } : {}),
					limit: normalizeAdminPaymentLimit(input.limit),
				},
				transaction,
			),
		);
	}
}

export class ListAdminPaymentWebhooksUseCase {
	constructor(private readonly deps: PaymentAdminReadUseCaseDeps) {}

	async execute(
		input: ListAdminPaymentsUseCaseInput,
	): Promise<AdminPaymentWebhookListItem[]> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.payments.listAdminPaymentWebhooks(
				{
					adminAccess: input.adminAccess,
					...(input.selectedScope ? { selectedScope: input.selectedScope } : {}),
					limit: normalizeAdminPaymentLimit(input.limit),
				},
				transaction,
			),
		);
	}
}
