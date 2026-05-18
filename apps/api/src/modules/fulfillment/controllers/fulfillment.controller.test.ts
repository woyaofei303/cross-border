import { describe, expect, it, vi } from "vitest";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import type { AdminAccessService } from "../../admin-access/admin-access.service.js";
import type { AdminAuditService } from "../../admin-audit/admin-audit.service.js";
import type {
	CreateFulfillmentUseCase,
	DeliverShipmentUseCase,
	ShipFulfillmentUseCase,
} from "../fulfillment.use-cases.js";
import { AdminFulfillmentController } from "./fulfillment.controller.js";

function createController(input: {
	access?: unknown;
	audit?: unknown;
	create?: unknown;
	ship?: unknown;
	deliver?: unknown;
}) {
	return new AdminFulfillmentController(
		input.access as AdminAccessService,
		input.audit as AdminAuditService,
		input.create as CreateFulfillmentUseCase,
		input.ship as ShipFulfillmentUseCase,
		input.deliver as DeliverShipmentUseCase,
	);
}

describe("AdminFulfillmentController", () => {
	const access = {
		source: "database" as const,
		adminUserId: "admin-1",
		scopes: [{ scopeType: "site" as const, scopeId: defaultSiteContext.siteId }],
	};

	it("records audit log when creating fulfillment", async () => {
		const record = vi.fn(async () => undefined);
		const execute = vi.fn(async () => ({
			reusedIdempotency: false,
			fulfillment: {
				fulfillmentOrderId: "fulfillment-1",
				fulfillmentNo: "FUL202605160001",
				orderId: "order-1",
				orderNo: "CB202605160001",
				status: "pending",
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				itemCount: 1,
			},
		}));
		const request = { headers: { "x-admin-user-id": "admin-1" } };
		const controller = createController({
			access: { resolveForRequest: async () => access },
			audit: { record },
			create: { execute },
			ship: { execute: async () => undefined },
			deliver: { execute: async () => undefined },
		});

		const response = await controller.create(request, {
			orderId: "order-1",
			warehouseId: "warehouse-1",
		});

		expect(response).toMatchObject({
			fulfillmentOrderId: "fulfillment-1",
			status: "pending",
			itemCount: 1,
		});
		expect(record).toHaveBeenCalledWith(
			expect.objectContaining({
				request,
				access,
				action: "fulfillment.create",
				resourceType: "fulfillment_order",
				resourceId: "fulfillment-1",
				siteId: defaultSiteContext.siteId,
			}),
		);
	});

	it("records audit log when shipping fulfillment", async () => {
		const record = vi.fn(async () => undefined);
		const execute = vi.fn(async () => ({
			reusedIdempotency: false,
			shipment: {
				shipmentId: "shipment-1",
				fulfillmentOrderId: "fulfillment-1",
				providerId: "provider-1",
				providerCode: "demo-carrier",
				trackingNo: "TRACK-1",
				status: "shipped",
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
			},
		}));
		const request = { headers: {} };
		const controller = createController({
			access: { resolveForRequest: async () => access },
			audit: { record },
			create: { execute: async () => undefined },
			ship: { execute },
			deliver: { execute: async () => undefined },
		});

		const response = await controller.ship(request, "fulfillment-1", {
			providerCode: "demo-carrier",
			providerName: "Demo Carrier",
			trackingNo: "TRACK-1",
		});

		expect(response).toMatchObject({
			shipmentId: "shipment-1",
			status: "shipped",
			reusedIdempotency: false,
		});
		expect(record).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "fulfillment.ship",
				resourceType: "shipment",
				resourceId: "shipment-1",
				siteId: defaultSiteContext.siteId,
			}),
		);
	});

	it("records audit log when delivering shipment", async () => {
		const record = vi.fn(async () => undefined);
		const execute = vi.fn(async () => ({
			status: "processed" as const,
			shipment: {
				shipmentId: "shipment-1",
				fulfillmentOrderId: "fulfillment-1",
				providerId: "provider-1",
				providerCode: "demo-carrier",
				trackingNo: "TRACK-1",
				status: "delivered",
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
			},
		}));
		const controller = createController({
			access: { resolveForRequest: async () => access },
			audit: { record },
			create: { execute: async () => undefined },
			ship: { execute: async () => undefined },
			deliver: { execute },
		});

		const response = await controller.deliver(
			{ headers: {} },
			"shipment-1",
			{
				deliveredAt: "2026-05-16T00:00:00.000Z",
				location: "Customer address",
			},
		);

		expect(response).toEqual({
			status: "processed",
			shipmentId: "shipment-1",
			shipmentStatus: "delivered",
		});
		expect(record).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "shipment.deliver",
				resourceType: "shipment",
				resourceId: "shipment-1",
				siteId: defaultSiteContext.siteId,
			}),
		);
	});
});
