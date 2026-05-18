import { Injectable } from "@nestjs/common";
import type {
	EventProcessLogPort,
	TransactionContext,
} from "../../../common/application/application-ports.js";
import { getPgClient } from "./pg-transaction-manager.js";

@Injectable()
export class PgEventProcessLogRepository implements EventProcessLogPort {
	async tryStartProcessing(input: {
		eventId: string;
		consumerName: string;
		transaction: TransactionContext;
	}): Promise<"started" | "already_processed"> {
		const client = getPgClient(input.transaction);
		const existing = await client.query<{ status: string }>(
			`
        SELECT status
        FROM event_process_logs
        WHERE event_id = $1 AND consumer_name = $2
        FOR UPDATE
      `,
			[input.eventId, input.consumerName],
		);

		if (existing.rowCount && existing.rows[0]?.status === "processed") {
			return "already_processed";
		}

		if (existing.rowCount) {
			await client.query(
				`
          UPDATE event_process_logs
          SET status = 'processing', error_message = NULL, created_at = now()
          WHERE event_id = $1 AND consumer_name = $2
        `,
				[input.eventId, input.consumerName],
			);
			return "started";
		}

		await client.query(
			`
        INSERT INTO event_process_logs (event_id, consumer_name, status)
        VALUES ($1, $2, 'processing')
      `,
			[input.eventId, input.consumerName],
		);

		return "started";
	}

	async markProcessed(input: {
		eventId: string;
		consumerName: string;
		transaction: TransactionContext;
	}): Promise<void> {
		await getPgClient(input.transaction).query(
			`
        UPDATE event_process_logs
        SET status = 'processed', error_message = NULL
        WHERE event_id = $1 AND consumer_name = $2
      `,
			[input.eventId, input.consumerName],
		);
	}

	async markFailed(input: {
		eventId: string;
		consumerName: string;
		errorMessage: string;
		transaction: TransactionContext;
	}): Promise<void> {
		await getPgClient(input.transaction).query(
			`
        UPDATE event_process_logs
        SET status = 'failed', error_message = $3
        WHERE event_id = $1 AND consumer_name = $2
      `,
			[input.eventId, input.consumerName, input.errorMessage],
		);
	}
}
