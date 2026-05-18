import { describe, expect, it, vi } from "vitest";
import { PgTransactionManager } from "./pg-transaction-manager.js";
import type { PgPoolService } from "./pg-pool.service.js";

function createManager() {
	const query = vi.fn(async (_sql: string) => ({ rows: [], rowCount: 0 }));
	const release = vi.fn();
	const connect = vi.fn(async () => ({ query, release }));
	const poolService = {
		getPool: () => ({ connect }),
	} as unknown as PgPoolService;

	return {
		connect,
		query,
		release,
		manager: new PgTransactionManager(poolService),
	};
}

describe("PgTransactionManager", () => {
	it("commits successful work and releases the client", async () => {
		const { manager, query, release } = createManager();

		const result = await manager.runInTransaction(async (transaction) => {
			expect(transaction.transactionId).toBeTypeOf("symbol");
			return "ok";
		});

		expect(result).toBe("ok");
		const calls = query.mock.calls as Array<[string]>;
		expect(calls.map((call) => call[0])).toEqual([
			"BEGIN",
			"COMMIT",
		]);
		expect(release).toHaveBeenCalledOnce();
	});

	it("rolls back failed work and releases the client", async () => {
		const { manager, query, release } = createManager();

		await expect(
			manager.runInTransaction(async () => {
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");

		const calls = query.mock.calls as Array<[string]>;
		expect(calls.map((call) => call[0])).toEqual([
			"BEGIN",
			"ROLLBACK",
		]);
		expect(release).toHaveBeenCalledOnce();
	});
});
