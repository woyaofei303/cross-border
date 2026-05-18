import type { TransactionContext } from "../../common/application/application-ports.js";
import type { CommercePipelineDomainEvent } from "./operations.types.js";

export interface CommercePipelineRepositoryPort {
	claimPendingPaymentWebhookIds(input: {
		limit: number;
		transaction: TransactionContext;
	}): Promise<string[]>;

	claimPendingPaymentSucceededEvents(input: {
		limit: number;
		transaction: TransactionContext;
	}): Promise<CommercePipelineDomainEvent[]>;

	markPaymentWebhookFailed(input: {
		webhookEventId: string;
		errorMessage: string;
		transaction: TransactionContext;
	}): Promise<void>;

	markDomainEventProcessed(input: {
		eventId: string;
		transaction: TransactionContext;
	}): Promise<void>;

	markDomainEventFailed(input: {
		eventId: string;
		maxRetryCount: number;
		retryDelaySeconds: number;
		transaction: TransactionContext;
	}): Promise<void>;
}
