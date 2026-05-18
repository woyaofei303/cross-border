import { describe, expect, it } from "vitest";
import type { AdminAccessContext } from "../../../common/admin/admin-access.js";
import type { AdminAuditService } from "../../admin-audit/admin-audit.service.js";
import type { AdminAccessService } from "../../admin-access/admin-access.service.js";
import type { ProcessCommercePipelineUseCase } from "../operations.use-cases.js";
import type { OperationsDashboardQuery } from "../operations.types.js";
import type { PgOperationsRepository } from "../repositories/pg-operations.repository.js";
import { AdminOperationsController } from "./operations.controller.js";

describe("AdminOperationsController", () => {
	it("returns the scoped high-risk operations dashboard", async () => {
		const controller = new AdminOperationsController(
			{
				listRiskDashboard: async (
					_query: OperationsDashboardQuery,
					access: AdminAccessContext,
				) => ({
					orders: [
						{
							id: "order-1",
							orderNo: "ORD1",
							siteId: access.scopes[0]?.scopeId,
							orderStatus: "paid",
							paymentStatus: "paid",
							fulfillmentStatus: "unfulfilled",
							aftersalesStatus: "none",
							currency: "USD",
							totalAmount: "100.00",
							itemCount: 1,
							statusLogCount: 2,
							createdAt: "2026-05-16T00:00:00.000Z",
							updatedAt: "2026-05-16T00:00:00.000Z",
						},
					],
					paymentWebhooks: [],
					inventoryLocks: [],
					inventoryTransactions: [],
					auditLogs: [],
				}),
			} as unknown as PgOperationsRepository,
			{
				resolveForRequest: async () => ({
					source: "database",
					adminUserId: "admin-1",
					scopes: [
						{
							scopeType: "site",
							scopeId: "00000000-0000-4000-8000-000000000301",
						},
					],
				}),
			} as unknown as AdminAccessService,
			{
				record: async () => {},
			} as unknown as AdminAuditService,
			{
				execute: async () => ({
					paymentWebhooks: {
						claimed: 0,
						processed: 0,
						skipped: 0,
						alreadyProcessed: 0,
						failed: 0,
						results: [],
					},
					paymentSucceededEvents: {
						claimed: 0,
						processed: 0,
						skipped: 0,
						alreadyProcessed: 0,
						failed: 0,
						results: [],
					},
					analyticsEvents: {
						claimed: 0,
						processed: 0,
						alreadyProcessed: 0,
						ignored: 0,
						failed: 0,
						results: [],
					},
				}),
			} as unknown as ProcessCommercePipelineUseCase,
		);

		await expect(
			controller.getRiskDashboard({ headers: {} }, { limit: 10 }),
		).resolves.toMatchObject({
			orders: [
				{
					orderNo: "ORD1",
					siteId: "00000000-0000-4000-8000-000000000301",
				},
			],
			paymentWebhooks: [],
			inventoryLocks: [],
			inventoryTransactions: [],
			auditLogs: [],
		});
	});

	it("processes the pending commerce pipeline for global admins", async () => {
		let auditedAction = "";
		const controller = new AdminOperationsController(
			{
				listRiskDashboard: async () => ({
					orders: [],
					paymentWebhooks: [],
					inventoryLocks: [],
					inventoryTransactions: [],
					afterSalesRequests: [],
					paymentRefunds: [],
					auditLogs: [],
				}),
			} as unknown as PgOperationsRepository,
			{
				resolveForRequest: async () => ({
					source: "fallback",
					scopes: [{ scopeType: "global" }],
				}),
			} as unknown as AdminAccessService,
			{
				record: async (input: { action: string }) => {
					auditedAction = input.action;
				},
			} as unknown as AdminAuditService,
			{
				execute: async () => ({
					paymentWebhooks: {
						claimed: 1,
						processed: 1,
						skipped: 0,
						alreadyProcessed: 0,
						failed: 0,
						results: [{ id: "webhook-1", status: "processed" }],
					},
					paymentSucceededEvents: {
						claimed: 1,
						processed: 1,
						skipped: 0,
						alreadyProcessed: 0,
						failed: 0,
						results: [{ id: "event-1", status: "processed" }],
					},
					analyticsEvents: {
						claimed: 1,
						processed: 1,
						alreadyProcessed: 0,
						ignored: 0,
						failed: 0,
						results: [{ id: "event-2", status: "processed" }],
					},
				}),
			} as unknown as ProcessCommercePipelineUseCase,
		);

		await expect(
			controller.processPendingCommerce({ headers: {} }, { limit: 10 }),
		).resolves.toMatchObject({
			paymentWebhooks: {
				claimed: 1,
				processed: 1,
			},
			paymentSucceededEvents: {
				claimed: 1,
				processed: 1,
			},
			analyticsEvents: {
				claimed: 1,
				processed: 1,
			},
		});
		expect(auditedAction).toBe("operations.process_pending_commerce");
	});
});
