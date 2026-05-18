import { describe, expect, it, vi } from "vitest";
import { AdminAccessService } from "./admin-access.service.js";
import type { PgAdminAccessRepository } from "./repositories/pg-admin-access.repository.js";

function createService(overrides: Partial<PgAdminAccessRepository>) {
	return new AdminAccessService({
		findScopesByAdminUserId: async () => [],
		...overrides,
	} as PgAdminAccessRepository);
}

describe("AdminAccessService", () => {
	it("keeps existing admin endpoints backward compatible without auth headers", async () => {
		const service = createService({});

		await expect(
			service.resolveForRequest({ headers: {} }),
		).resolves.toMatchObject({
			source: "fallback",
			scopes: [{ scopeType: "global" }],
		});
	});

	it("loads RBAC data scopes for the current admin user", async () => {
		const findScopesByAdminUserId = vi.fn<
			PgAdminAccessRepository["findScopesByAdminUserId"]
		>(async () => [
			{
				scopeType: "site",
				scopeId: "00000000-0000-4000-8000-000000000301",
			},
		]);
		const service = createService({ findScopesByAdminUserId });

		await expect(
			service.resolveForRequest({
				headers: {
					"x-admin-user-id": "00000000-0000-4000-8000-000000000999",
				},
			}),
		).resolves.toEqual({
			source: "database",
			adminUserId: "00000000-0000-4000-8000-000000000999",
			scopes: [
				{
					scopeType: "site",
					scopeId: "00000000-0000-4000-8000-000000000301",
				},
			],
		});
		expect(findScopesByAdminUserId).toHaveBeenCalledWith(
			"00000000-0000-4000-8000-000000000999",
		);
	});
});
