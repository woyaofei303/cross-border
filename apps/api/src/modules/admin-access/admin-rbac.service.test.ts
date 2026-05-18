import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AdminRbacService } from "./admin-rbac.service.js";
import type { PgAdminAccessRepository } from "./repositories/pg-admin-access.repository.js";

function createRepository(overrides: Partial<PgAdminAccessRepository> = {}) {
	return {
		listRbacSnapshot: vi.fn(async () => ({
			users: [],
			roles: [],
			permissions: [],
			scopes: [],
		})),
		adminUserExists: vi.fn(async () => true),
		scopeTargetExists: vi.fn(async () => true),
		assignAdminUserScope: vi.fn(async (adminUserId, scope) => ({
			scopeAssignmentId: "scope-assignment-1",
			adminUserId,
			...scope,
			createdAt: "2026-05-17T00:00:00.000Z",
		})),
		...overrides,
	} as unknown as PgAdminAccessRepository;
}

describe("AdminRbacService", () => {
	it("blocks scope assignment from non-global admins", async () => {
		const service = new AdminRbacService(createRepository());

		await expect(
			service.assignScope({
				actorScopes: [{ scopeType: "site", scopeId: "site-1" }],
				adminUserId: "admin-1",
				scopeType: "site",
				scopeId: "site-1",
			}),
		).rejects.toBeInstanceOf(ForbiddenException);
	});

	it("requires a scope target for non-global assignment", async () => {
		const service = new AdminRbacService(createRepository());

		await expect(
			service.assignScope({
				actorScopes: [{ scopeType: "global" }],
				adminUserId: "admin-1",
				scopeType: "site",
			}),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it("assigns site scope through the repository after target validation", async () => {
		const repository = createRepository();
		const service = new AdminRbacService(repository);
		const result = await service.assignScope({
			actorScopes: [{ scopeType: "global" }],
			adminUserId: "admin-1",
			scopeType: "site",
			scopeId: "site-1",
		});

		expect(result).toMatchObject({
			adminUserId: "admin-1",
			scopeType: "site",
			scopeId: "site-1",
		});
		expect(repository.scopeTargetExists).toHaveBeenCalledWith("site", "site-1");
		expect(repository.assignAdminUserScope).toHaveBeenCalledWith("admin-1", {
			scopeType: "site",
			scopeId: "site-1",
		});
	});
});
