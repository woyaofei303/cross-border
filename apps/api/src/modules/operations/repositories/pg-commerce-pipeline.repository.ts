import { Injectable } from "@nestjs/common";
import type { TransactionContext } from "../../../common/application/application-ports.js";
import { getPgClient } from "../../database/pg/pg-transaction-manager.js";
import type { CommercePipelineRepositoryPort } from "../operations.ports.js";
import type { CommercePipelineDomainEvent } from "../operations.types.js";

@Injectable()
export class PgCommercePipelineRepository
	implements CommercePipelineRepositoryPort
{
	async claimPendingPaymentWebhookIds(input: {
		limit: number;
		transaction: TransactionContext;
	}): Promise<string[]> {
		const result = await getPgClient(input.transaction).query<{ id: string }>(
			`
        WITH claimed_webhooks AS (
          SELECT id
          FROM payment_webhook_events
          WHERE status IN ('received', 'failed')
          ORDER BY received_at ASC
          LIMIT $1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE payment_webhook_events
        SET status = 'processing'
        WHERE id IN (SELECT id FROM claimed_webhooks)
        RETURNING id
      `,
			[input.limit],
		);

		return result.rows.map((row) => row.id);
	}

	async claimPendingPaymentSucceededEvents(input: {
		limit: number;
		transaction: TransactionContext;
	}): Promise<CommercePipelineDomainEvent[]> {
		const result = await getPgClient(input.transaction).query<{
			id: string;
			payload: Record<string, unknown>;
		}>(
			`
        WITH claimed_events AS (
          SELECT id
          FROM domain_events
          WHERE event_type = 'PaymentSucceeded'
            AND status IN ('pending', 'failed')
            AND (next_retry_at IS NULL OR next_retry_at <= now())
          ORDER BY created_at ASC
          LIMIT $1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE domain_events
        SET status = 'processing'
        WHERE id IN (SELECT id FROM claimed_events)
        RETURNING id, payload
      `,
			[input.limit],
		);

		return result.rows.map((row) => ({
			id: row.id,
			payload: row.payload,
		}));
	}

	async markPaymentWebhookFailed(input: {
		webhookEventId: string;
		errorMessage: string;
		transaction: TransactionContext;
	}): Promise<void> {
		await getPgClient(input.transaction).query(
			`
        UPDATE payment_webhook_events
        SET
          status = 'failed',
          error_message = $2
        WHERE id = $1
      `,
			[input.webhookEventId, input.errorMessage],
		);
	}

	async markDomainEventProcessed(input: {
		eventId: string;
		transaction: TransactionContext;
	}): Promise<void> {
		await getPgClient(input.transaction).query(
			`
        UPDATE domain_events
        SET
          status = 'processed',
          next_retry_at = NULL,
          processed_at = now()
        WHERE id = $1
      `,
			[input.eventId],
		);
	}

	async markDomainEventFailed(input: {
		eventId: string;
		maxRetryCount: number;
		retryDelaySeconds: number;
		transaction: TransactionContext;
	}): Promise<void> {
		await getPgClient(input.transaction).query(
			`
        UPDATE domain_events
        SET
          retry_count = retry_count + 1,
          status = CASE
            WHEN retry_count + 1 >= $2 THEN 'dead_letter'
            ELSE 'failed'
          END,
          next_retry_at = CASE
            WHEN retry_count + 1 >= $2 THEN NULL
            ELSE now() + ($3::int * INTERVAL '1 second')
          END
        WHERE id = $1
      `,
			[input.eventId, input.maxRetryCount, input.retryDelaySeconds],
		);
	}
}
