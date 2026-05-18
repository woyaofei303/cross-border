import { Injectable } from "@nestjs/common";
import type {
	OutboxEventDraft,
	OutboxPort,
	TransactionContext,
} from "../../../common/application/application-ports.js";
import { getPgClient } from "./pg-transaction-manager.js";

@Injectable()
export class PgOutboxRepository implements OutboxPort {
	async append(
		events: OutboxEventDraft<Record<string, unknown>>[],
		transaction: TransactionContext,
	): Promise<void> {
		if (events.length === 0) {
			return;
		}

		const client = getPgClient(transaction);

		for (const event of events) {
			await client.query(
				`
          INSERT INTO domain_events (
            event_type,
            aggregate_type,
            aggregate_id,
            site_id,
            vertical_id,
            brand_id,
            payload,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'pending')
        `,
				[
					event.eventType,
					event.aggregateType,
					event.aggregateId,
					event.siteId ?? null,
					event.verticalId ?? null,
					event.brandId ?? null,
					JSON.stringify(event.payload),
				],
			);
		}
	}
}
