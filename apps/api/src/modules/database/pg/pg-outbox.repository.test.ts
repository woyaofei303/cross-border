import { describe, expect, it, vi } from "vitest";
import type { TransactionContext } from "../../../common/application/application-ports.js";
import { PgOutboxRepository } from "./pg-outbox.repository.js";

function createTransaction() {
	const query = vi.fn(async (_sql: string, _params?: unknown[]) => ({
		rows: [],
		rowCount: 0,
	}));

	return {
		query,
		transaction: {
			transactionId: Symbol("test"),
			client: { query },
		} as unknown as TransactionContext,
	};
}

describe("PgOutboxRepository", () => {
	it("inserts domain events using the current transaction client", async () => {
		const { query, transaction } = createTransaction();
		const repository = new PgOutboxRepository();

		await repository.append(
			[
				{
					eventType: "OrderCreated",
					aggregateType: "order",
					aggregateId: "00000000-0000-0000-0000-000000000001",
					siteId: "00000000-0000-4000-8000-000000000301",
					verticalId: "00000000-0000-4000-8000-000000000101",
					brandId: "00000000-0000-4000-8000-000000000201",
					payload: { orderId: "00000000-0000-0000-0000-000000000001" },
				},
			],
			transaction,
		);

		expect(query).toHaveBeenCalledOnce();
		const calls = query.mock.calls as Array<[string, unknown[]?]>;
		expect(calls[0]?.[0]).toContain("INSERT INTO domain_events");
		expect(calls[0]?.[1]).toEqual([
			"OrderCreated",
			"order",
			"00000000-0000-0000-0000-000000000001",
			"00000000-0000-4000-8000-000000000301",
			"00000000-0000-4000-8000-000000000101",
			"00000000-0000-4000-8000-000000000201",
			JSON.stringify({
				orderId: "00000000-0000-0000-0000-000000000001",
			}),
		]);
	});
});
