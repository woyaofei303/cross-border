import type { DomainEventType } from "@cross-border/shared";

export type TransactionContext = {
	readonly transactionId: symbol;
};

export interface TransactionManagerPort {
	runInTransaction<T>(
		work: (transaction: TransactionContext) => Promise<T>,
	): Promise<T>;
}

export type OutboxEventDraft<TPayload extends Record<string, unknown>> = {
	eventType: DomainEventType;
	aggregateType: string;
	aggregateId: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	payload: TPayload;
};

export interface OutboxPort {
	append(
		events: OutboxEventDraft<Record<string, unknown>>[],
		transaction: TransactionContext,
	): Promise<void>;
}

export interface EventProcessLogPort {
	tryStartProcessing(input: {
		eventId: string;
		consumerName: string;
		transaction: TransactionContext;
	}): Promise<"started" | "already_processed">;

	markProcessed(input: {
		eventId: string;
		consumerName: string;
		transaction: TransactionContext;
	}): Promise<void>;

	markFailed(input: {
		eventId: string;
		consumerName: string;
		errorMessage: string;
		transaction: TransactionContext;
	}): Promise<void>;
}

export class NoopTransactionManager implements TransactionManagerPort {
	async runInTransaction<T>(
		work: (transaction: TransactionContext) => Promise<T>,
	): Promise<T> {
		return work({ transactionId: Symbol("noop-transaction") });
	}
}
