import { describe, expect, it, vi } from "vitest";
import { PgAdminAuditRepository } from "./pg-admin-audit.repository.js";

function createRepository() {
	const query = vi.fn(async (_sql: string, _params?: unknown[]) => ({
		rows: [],
		rowCount: 1,
	}));
	const repository = new PgAdminAuditRepository({
		getPool: () => ({
			query,
		}),
	} as never);

	return {
		query,
		repository,
	};
}

describe("PgAdminAuditRepository", () => {
	it("inserts generic audit logs with site dimensions and snapshots", async () => {
		const { query, repository } = createRepository();

		await repository.appendAuditLog({
			siteId: "00000000-0000-4000-8000-000000000301",
			actorType: "admin",
			actorId: "00000000-0000-4000-8000-000000000999",
			action: "analytics.project_order_paid",
			resourceType: "domain_event",
			resourceId: "event-1",
			afterSnapshot: { status: "processed" },
		});

		expect(query.mock.calls[0]?.[0]).toContain("INSERT INTO audit_logs");
		expect(query.mock.calls[0]?.[1]).toEqual([
			"00000000-0000-4000-8000-000000000301",
			null,
			null,
			"admin",
			"00000000-0000-4000-8000-000000000999",
			"analytics.project_order_paid",
			"domain_event",
			"event-1",
			null,
			JSON.stringify({ status: "processed" }),
			null,
			null,
			null,
		]);
	});

	it("inserts admin operation logs when an admin user id is available", async () => {
		const { query, repository } = createRepository();

		await repository.appendAdminOperationLog({
			adminUserId: "00000000-0000-4000-8000-000000000999",
			action: "analytics.process_pending",
			resourceType: "domain_event",
			afterSnapshot: { processed: 1 },
			requestId: "req-1",
		});

		expect(query.mock.calls[0]?.[0]).toContain(
			"INSERT INTO admin_operation_logs",
		);
		expect(query.mock.calls[0]?.[1]).toEqual([
			null,
			null,
			null,
			"00000000-0000-4000-8000-000000000999",
			"analytics.process_pending",
			"domain_event",
			null,
			null,
			JSON.stringify({ processed: 1 }),
			null,
			null,
			"req-1",
		]);
	});

	it("filters audit logs by admin access scope and selected scope", async () => {
		const query = vi.fn(async () => ({
			rows: [
				{
					id: "audit-1",
					site_id: "site-1",
					vertical_id: "vertical-1",
					brand_id: "brand-1",
					actor_type: "admin",
					actor_id: "00000000-0000-4000-8000-000000000999",
					action: "product.update_status",
					resource_type: "product",
					resource_id: "product-1",
					before_snapshot: null,
					after_snapshot: { status: "active" },
					ip_address: null,
					user_agent: null,
					request_id: "req-1",
					created_at: new Date("2026-05-17T00:00:00.000Z"),
				},
			],
			rowCount: 1,
		}));
		const repository = new PgAdminAuditRepository({
			getPool: () => ({ query }),
		} as never);

		const rows = await repository.listAuditLogs({
			adminScopes: [{ scopeType: "site", scopeId: "site-1" }],
			selectedScope: { scopeType: "site", scopeId: "site-1" },
			query: "product",
			limit: 20,
		});
		const firstCall = query.mock.calls[0] as unknown as [string, unknown[]];

		expect(firstCall[0]).toContain("audit_logs.site_id = $1");
		expect(firstCall[0]).toContain("audit_logs.site_id = $2");
		expect(firstCall[1]).toEqual([
			"site-1",
			"site-1",
			"%product%",
			20,
		]);
		expect(rows[0]).toMatchObject({
			action: "product.update_status",
			siteId: "site-1",
			afterSnapshot: { status: "active" },
		});
	});
});
