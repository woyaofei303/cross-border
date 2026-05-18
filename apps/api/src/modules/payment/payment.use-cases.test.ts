import { describe, expect, it } from "vitest";
import {
	NoopTransactionManager,
	type OutboxEventDraft,
	type OutboxPort,
	type TransactionContext,
} from "../../common/application/application-ports.js";
import { defaultSiteContext } from "../../common/site/site-context.js";
import type {
	PaymentAdminReadRepositoryPort,
	PaymentOrderSummary,
	PaymentWebhookRecord,
	PaymentWriteRepositoryPort,
} from "./payment.ports.js";
import { PaymentWorkflowService } from "./payment.service.js";
import {
	CreatePaymentOrderUseCase,
	ListAdminPaymentOrdersUseCase,
	ListAdminPaymentTransactionsUseCase,
	ListAdminPaymentWebhooksUseCase,
	ProcessPaymentWebhookUseCase,
	ReceivePaymentWebhookUseCase,
} from "./payment.use-cases.js";
import type {
	CreatePaymentOrderPlan,
	PaymentWebhookReceiptPlan,
	ProcessPaymentWebhookPlan,
} from "./payment.types.js";

class MemoryOutbox implements OutboxPort {
	events: OutboxEventDraft<Record<string, unknown>>[] = [];

	async append(
		events: OutboxEventDraft<Record<string, unknown>>[],
	): Promise<void> {
		this.events.push(...events);
	}
}

class MemoryPaymentRepository implements PaymentWriteRepositoryPort {
	existingPaymentOrder: PaymentOrderSummary | null = null;
	webhookInserted = true;
	statusUpdates: Array<{ webhookEventId: string; status: string }> = [];
	transactions: ProcessPaymentWebhookPlan["transaction"][] = [];
	paymentStatusUpdates: Array<{ paymentOrderId: string; status: string }> = [];
	webhook: PaymentWebhookRecord = {
		webhookEventId: "webhook-1",
		channelCode: "stripe",
		providerEventId: "evt_1",
		eventType: "payment_intent.succeeded",
		providerObjectId: "pi_1",
		rawPayload: { id: "evt_1" },
		status: "received",
	};
	paymentOrder: PaymentOrderSummary = {
		paymentOrderId: "pay-1",
		paymentNo: "PAY202605160001",
		orderId: "order-1",
		siteId: defaultSiteContext.siteId,
		verticalId: defaultSiteContext.verticalId,
		brandId: defaultSiteContext.brandId,
		channelCode: "stripe",
		status: "processing",
		amount: "100.00",
		currency: "USD",
		idempotencyKey: "pay-order-1",
	};

	async findPaymentOrderByIdempotencyKey(): Promise<PaymentOrderSummary | null> {
		return this.existingPaymentOrder;
	}

	async createPaymentOrder(
		plan: CreatePaymentOrderPlan,
	): Promise<PaymentOrderSummary> {
		return {
			paymentOrderId: plan.paymentOrder.id,
			paymentNo: plan.paymentOrder.paymentNo,
			orderId: plan.paymentOrder.orderId,
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			channelCode: plan.paymentOrder.channelCode,
			status: plan.status,
			amount: plan.paymentOrder.amount,
			currency: plan.paymentOrder.currency,
			idempotencyKey: plan.paymentOrder.idempotencyKey,
		};
	}

	async insertWebhookIfNew(
		_plan: PaymentWebhookReceiptPlan,
	): Promise<{ inserted: boolean; webhookEventId: string }> {
		return {
			inserted: this.webhookInserted,
			webhookEventId: "webhook-1",
		};
	}

	async getWebhookForProcessing(): Promise<PaymentWebhookRecord> {
		return this.webhook;
	}

	async findPaymentOrderForWebhook(): Promise<PaymentOrderSummary> {
		return this.paymentOrder;
	}

	async attachWebhookToPaymentOrder(): Promise<void> {}

	async updateWebhookStatus(input: {
		webhookEventId: string;
		status: string;
		transaction: TransactionContext;
	}): Promise<void> {
		this.statusUpdates.push({
			webhookEventId: input.webhookEventId,
			status: input.status,
		});
	}

	async appendTransaction(
		transactionRecord: ProcessPaymentWebhookPlan["transaction"],
	): Promise<void> {
		this.transactions.push(transactionRecord);
	}

	async updatePaymentOrderStatus(input: {
		paymentOrderId: string;
		status: string;
		transaction: TransactionContext;
	}): Promise<void> {
		this.paymentStatusUpdates.push({
			paymentOrderId: input.paymentOrderId,
			status: input.status,
		});
	}
}

class MemoryAdminPaymentRepository implements PaymentAdminReadRepositoryPort {
	adminQueries: unknown[] = [];

	async listAdminPaymentOrders(query: unknown) {
		this.adminQueries.push(query);

		return [
			{
				paymentOrderId: "pay-1",
				paymentNo: "PAY202605160001",
				orderId: "order-1",
				orderNo: "CB202605160001",
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				channelCode: "stripe",
				status: "succeeded" as const,
				amount: "100.00",
				currency: "USD",
				idempotencyKey: "pay-order-1",
				transactionCount: 1,
				latestWebhookEventId: "evt_1",
				latestWebhookStatus: "processed" as const,
				createdAt: "2026-05-16T00:00:00.000Z",
				updatedAt: "2026-05-16T00:00:00.000Z",
			},
		];
	}

	async listAdminPaymentTransactions(query: unknown) {
		this.adminQueries.push(query);

		return [
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
				transactionType: "sale" as const,
				status: "succeeded" as const,
				amount: "100.00",
				currency: "USD",
				createdAt: "2026-05-16T00:00:00.000Z",
			},
		];
	}

	async listAdminPaymentWebhooks(query: unknown) {
		this.adminQueries.push(query);

		return [
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
				status: "processed" as const,
				receivedAt: "2026-05-16T00:00:00.000Z",
			},
		];
	}
}

function createPaymentDeps() {
	const outbox = new MemoryOutbox();
	const payments = new MemoryPaymentRepository();

	return {
		outbox,
		payments,
		transactions: new NoopTransactionManager(),
		paymentWorkflow: new PaymentWorkflowService(),
	};
}

describe("CreatePaymentOrderUseCase", () => {
	it("creates a payment order unless the idempotency key already exists", async () => {
		const deps = createPaymentDeps();
		const useCase = new CreatePaymentOrderUseCase(deps);

		const result = await useCase.execute({
			orderId: "order-1",
			paymentOrderId: "pay-1",
			paymentNo: "PAY202605160001",
			channelCode: "stripe",
			amount: "100.00",
			currency: "USD",
			idempotencyKey: "pay-order-1",
		});

		expect(result.reusedIdempotency).toBe(false);
		expect(result.paymentOrder.status).toBe("created");
	});

	it("returns the existing payment order for duplicate payment creation", async () => {
		const deps = createPaymentDeps();
		deps.payments.existingPaymentOrder = deps.payments.paymentOrder;
		const useCase = new CreatePaymentOrderUseCase(deps);

		const result = await useCase.execute({
			orderId: "order-1",
			paymentOrderId: "pay-1",
			paymentNo: "PAY202605160001",
			channelCode: "stripe",
			amount: "100.00",
			currency: "USD",
			idempotencyKey: "pay-order-1",
		});

		expect(result.reusedIdempotency).toBe(true);
		expect(result.paymentOrder.paymentOrderId).toBe("pay-1");
	});
});

describe("ReceivePaymentWebhookUseCase", () => {
	it("persists a new webhook receipt through provider event id de-duplication", async () => {
		const deps = createPaymentDeps();
		const useCase = new ReceivePaymentWebhookUseCase(deps);

		const result = await useCase.execute({
			channelCode: "stripe",
			providerEventId: "evt_1",
			eventType: "payment_intent.succeeded",
			providerObjectId: "pi_1",
			rawPayload: { id: "evt_1" },
		});

		expect(result).toEqual({
			inserted: true,
			webhookEventId: "webhook-1",
		});
	});
});

describe("ProcessPaymentWebhookUseCase", () => {
	it("records transaction, updates payment order, marks webhook processed, and emits event", async () => {
		const deps = createPaymentDeps();
		const useCase = new ProcessPaymentWebhookUseCase(deps);

		const result = await useCase.execute("webhook-1");

		expect(result.status).toBe("processed");
		expect(deps.payments.transactions[0]?.status).toBe("succeeded");
		expect(deps.payments.paymentStatusUpdates[0]).toMatchObject({
			paymentOrderId: "pay-1",
			status: "succeeded",
		});
		expect(deps.payments.statusUpdates.map((update) => update.status)).toEqual([
			"processing",
			"processed",
		]);
		expect(deps.outbox.events[0]?.eventType).toBe("PaymentSucceeded");
		expect(deps.outbox.events[0]).toMatchObject({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
		});
	});

	it("skips an already processed webhook", async () => {
		const deps = createPaymentDeps();
		deps.payments.webhook = {
			...deps.payments.webhook,
			status: "processed",
		};
		const useCase = new ProcessPaymentWebhookUseCase(deps);

		const result = await useCase.execute("webhook-1");

		expect(result.status).toBe("skipped");
		expect(deps.payments.transactions).toHaveLength(0);
		expect(deps.outbox.events).toHaveLength(0);
	});

	it("marks duplicate terminal provider webhooks as processed without emitting duplicate events", async () => {
		const deps = createPaymentDeps();
		deps.payments.paymentOrder = {
			...deps.payments.paymentOrder,
			status: "succeeded",
		};
		const useCase = new ProcessPaymentWebhookUseCase(deps);

		const result = await useCase.execute("webhook-1");

		expect(result).toMatchObject({
			status: "skipped",
			reason: "payment_outcome_already_applied",
		});
		expect(deps.payments.transactions).toHaveLength(0);
		expect(deps.outbox.events).toHaveLength(0);
		expect(deps.payments.statusUpdates.map((update) => update.status)).toEqual([
			"processing",
			"processed",
		]);
	});

	it("marks the webhook failed when business rules reject processing", async () => {
		const deps = createPaymentDeps();
		deps.payments.paymentOrder = {
			...deps.payments.paymentOrder,
			status: "cancelled",
		};
		const useCase = new ProcessPaymentWebhookUseCase(deps);

		const result = await useCase.execute("webhook-1");

		expect(result.status).toBe("failed");
		expect(deps.payments.statusUpdates.at(-1)).toMatchObject({
			webhookEventId: "webhook-1",
			status: "failed",
		});
		expect(deps.outbox.events).toHaveLength(0);
	});
});

describe("admin payment read use cases", () => {
	it("passes scoped payment order queries through a transaction with a clamped limit", async () => {
		const payments = new MemoryAdminPaymentRepository();
		const useCase = new ListAdminPaymentOrdersUseCase({
			transactions: new NoopTransactionManager(),
			payments,
		});

		const result = await useCase.execute({
			adminAccess: {
				source: "database",
				adminUserId: "admin-1",
				scopes: [{ scopeType: "site", scopeId: defaultSiteContext.siteId }],
			},
			selectedScope: {
				scopeType: "site",
				scopeId: defaultSiteContext.siteId,
			},
			limit: 500,
		});

		expect(result[0]?.paymentNo).toBe("PAY202605160001");
		expect(payments.adminQueries[0]).toMatchObject({
			selectedScope: {
				scopeType: "site",
				scopeId: defaultSiteContext.siteId,
			},
			limit: 100,
		});
	});

	it("returns payment transactions and webhooks for admin operations views", async () => {
		const payments = new MemoryAdminPaymentRepository();
		const deps = {
			transactions: new NoopTransactionManager(),
			payments,
		};

		await expect(
			new ListAdminPaymentTransactionsUseCase(deps).execute({
				adminAccess: { source: "fallback", scopes: [{ scopeType: "global" }] },
			}),
		).resolves.toMatchObject([
			{
				providerTransactionId: "pi_1",
				status: "succeeded",
			},
		]);
		await expect(
			new ListAdminPaymentWebhooksUseCase(deps).execute({
				adminAccess: { source: "fallback", scopes: [{ scopeType: "global" }] },
			}),
		).resolves.toMatchObject([
			{
				providerEventId: "evt_1",
				status: "processed",
				dedupeKey: "stripe:evt_1",
			},
		]);
	});
});
