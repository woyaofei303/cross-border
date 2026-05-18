import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AdminAuditService } from "../../admin-audit/admin-audit.service.js";
import type { AdminAccessService } from "../../admin-access/admin-access.service.js";
import type {
	ProcessPendingAnalyticsEventsUseCase,
	ProjectOrderPaidAnalyticsUseCase,
} from "../analytics.use-cases.js";
import type { PgAnalyticsRepository } from "../repositories/pg-analytics.repository.js";
import { AdminAnalyticsController } from "./analytics.controller.js";

function createController(options?: { global?: boolean }) {
	const global = options?.global ?? true;
	const audit = {
		record: vi.fn(async () => undefined),
	} as unknown as AdminAuditService & {
		record: ReturnType<typeof vi.fn>;
	};
	const projectOrderPaid = {
		execute: vi.fn(async () => ({ status: "processed" as const })),
	} as unknown as ProjectOrderPaidAnalyticsUseCase & {
		execute: ReturnType<typeof vi.fn>;
	};
	const processPending = {
		execute: vi.fn(async () => ({
			claimed: 1,
			processed: 1,
			alreadyProcessed: 0,
			ignored: 0,
			failed: 0,
			results: [{ eventId: "event-1", status: "processed" as const }],
		})),
	} as unknown as ProcessPendingAnalyticsEventsUseCase & {
		execute: ReturnType<typeof vi.fn>;
	};
	const adminAccess = {
		resolveForRequest: vi.fn(async () => ({
			source: "database" as const,
			adminUserId: "00000000-0000-4000-8000-000000000999",
			scopes: global
				? [{ scopeType: "global" as const }]
				: [
						{
							scopeType: "site" as const,
							scopeId: "00000000-0000-4000-8000-000000000301",
						},
					],
		})),
	} as unknown as AdminAccessService;

	return {
		audit,
		processPending,
		projectOrderPaid,
		controller: new AdminAnalyticsController(
			{} as PgAnalyticsRepository,
			adminAccess,
			audit,
			projectOrderPaid,
			processPending,
		),
	};
}

describe("AdminAnalyticsController admin mutations", () => {
	it("audits successful pending analytics processing", async () => {
		const { audit, controller, processPending } = createController();

		await expect(
			controller.processPending(
				{ headers: { "x-request-id": "req-1" } },
				{ limit: 1 },
			),
		).resolves.toMatchObject({
			claimed: 1,
			processed: 1,
		});

		expect(processPending.execute).toHaveBeenCalledWith({ limit: 1 });
		expect(audit.record).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "analytics.process_pending",
				resourceType: "domain_event",
				afterSnapshot: expect.objectContaining({
					request: { limit: 1 },
				}),
			}),
		);
	});

	it("denies and audits non-global pending analytics processing", async () => {
		const { audit, controller, processPending } = createController({
			global: false,
		});

		await expect(
			controller.processPending({ headers: {} }, { limit: 1 }),
		).rejects.toBeInstanceOf(ForbiddenException);

		expect(processPending.execute).not.toHaveBeenCalled();
		expect(audit.record).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "analytics.process_pending.denied",
				resourceType: "domain_event",
			}),
		);
	});

	it("audits manual OrderPaid projection", async () => {
		const { audit, controller, projectOrderPaid } = createController();

		await expect(
			controller.projectOrderPaid(
				{ headers: {} },
				{ eventId: "00000000-0000-4000-8000-000000000111" },
			),
		).resolves.toMatchObject({
			status: "processed",
		});

		expect(projectOrderPaid.execute).toHaveBeenCalledWith(
			"00000000-0000-4000-8000-000000000111",
		);
		expect(audit.record).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "analytics.project_order_paid",
				resourceId: "00000000-0000-4000-8000-000000000111",
			}),
		);
	});
});
