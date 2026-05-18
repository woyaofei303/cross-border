import { describe, expect, it, vi } from "vitest";
import { AdminAuditService } from "./admin-audit.service.js";
import type { PgAdminAuditRepository } from "./repositories/pg-admin-audit.repository.js";

function createService() {
	const repository = {
		appendAuditLog: vi.fn(async () => undefined),
		appendAdminOperationLog: vi.fn(async () => undefined),
	} as unknown as PgAdminAuditRepository & {
		appendAuditLog: ReturnType<typeof vi.fn>;
		appendAdminOperationLog: ReturnType<typeof vi.fn>;
	};

	return {
		repository,
		service: new AdminAuditService(repository),
	};
}

describe("AdminAuditService", () => {
	it("writes both generic and admin operation logs when an admin user id exists", async () => {
		const { repository, service } = createService();

		await service.record({
			request: {
				headers: {
					"x-forwarded-for": "203.0.113.10, 10.0.0.1",
					"user-agent": "vitest",
					"x-request-id": "req-1",
				},
			},
			access: {
				source: "database",
				adminUserId: "00000000-0000-4000-8000-000000000999",
				scopes: [
					{
						scopeType: "site",
						scopeId: "00000000-0000-4000-8000-000000000301",
					},
				],
			},
			action: "analytics.process_pending",
			resourceType: "domain_event",
			afterSnapshot: { processed: 1 },
		});

		expect(repository.appendAuditLog).toHaveBeenCalledWith(
			expect.objectContaining({
				siteId: "00000000-0000-4000-8000-000000000301",
				actorType: "admin",
				actorId: "00000000-0000-4000-8000-000000000999",
				action: "analytics.process_pending",
				ipAddress: "203.0.113.10",
				userAgent: "vitest",
				requestId: "req-1",
				afterSnapshot: { processed: 1 },
			}),
		);
		expect(repository.appendAdminOperationLog).toHaveBeenCalledWith(
			expect.objectContaining({
				adminUserId: "00000000-0000-4000-8000-000000000999",
				action: "analytics.process_pending",
			}),
		);
	});

	it("keeps fallback admin actions in audit logs even without admin operation rows", async () => {
		const { repository, service } = createService();

		await service.record({
			request: { headers: {} },
			access: {
				source: "fallback",
				scopes: [{ scopeType: "global" }],
			},
			action: "analytics.project_order_paid",
			resourceType: "domain_event",
			resourceId: "event-1",
		});

		expect(repository.appendAuditLog).toHaveBeenCalledWith(
			expect.objectContaining({
				actorType: "admin",
				action: "analytics.project_order_paid",
				resourceId: "event-1",
			}),
		);
		expect(repository.appendAdminOperationLog).not.toHaveBeenCalled();
	});

	it("does not write admin operation logs for unresolved admin user ids", async () => {
		const { repository, service } = createService();

		await service.record({
			request: { headers: {} },
			access: {
				source: "database",
				adminUserId: "00000000-0000-4000-8000-000000000999",
				scopes: [],
			},
			action: "analytics.process_pending.denied",
			resourceType: "domain_event",
		});

		expect(repository.appendAuditLog).toHaveBeenCalledWith(
			expect.objectContaining({
				actorType: "admin",
				action: "analytics.process_pending.denied",
			}),
		);
		expect(repository.appendAdminOperationLog).not.toHaveBeenCalled();
	});
});
