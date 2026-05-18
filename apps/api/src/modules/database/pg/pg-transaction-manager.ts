import { Injectable } from "@nestjs/common";
import type { PoolClient } from "pg";
import type {
	TransactionContext,
	TransactionManagerPort,
} from "../../../common/application/application-ports.js";
import { PgPoolService } from "./pg-pool.service.js";

export type PgTransactionContext = TransactionContext & {
	readonly client: PoolClient;
};

export function getPgClient(transaction: TransactionContext): PoolClient {
	const maybePgTransaction = transaction as Partial<PgTransactionContext>;

	if (!maybePgTransaction.client) {
		throw new Error("PostgreSQL transaction context is required.");
	}

	return maybePgTransaction.client;
}

@Injectable()
export class PgTransactionManager implements TransactionManagerPort {
	constructor(private readonly poolService: PgPoolService) {}

	async runInTransaction<T>(
		work: (transaction: TransactionContext) => Promise<T>,
	): Promise<T> {
		const client = await this.poolService.getPool().connect();

		try {
			await client.query("BEGIN");
			const transaction: PgTransactionContext = {
				transactionId: Symbol("pg-transaction"),
				client,
			};
			const result = await work(transaction);
			await client.query("COMMIT");
			return result;
		} catch (error) {
			await client.query("ROLLBACK");
			throw error;
		} finally {
			client.release();
		}
	}
}
