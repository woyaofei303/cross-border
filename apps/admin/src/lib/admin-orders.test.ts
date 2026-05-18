import { describe, expect, it } from "vitest";
import { defaultAdminSiteData } from "@/lib/admin-sites";
import {
	buildAdminOrdersPath,
	formatCurrency,
	getFulfillmentActionState,
	normalizeOrderScopeType,
	orderStatusClassName,
	selectedScopeIdForSite,
	shortId,
} from "@/lib/admin-orders";

describe("admin order helpers", () => {
	it("normalizes selected order scopes and ids from the active site", () => {
		const site = defaultAdminSiteData.sites[0];

		expect(normalizeOrderScopeType("site")).toBe("site");
		expect(normalizeOrderScopeType("unknown")).toBe("global");
		expect(selectedScopeIdForSite("site", site)).toBe(site.siteId);
		expect(selectedScopeIdForSite("vertical", site)).toBe(site.verticalId);
		expect(selectedScopeIdForSite("brand", site)).toBe(site.brandId);
		expect(selectedScopeIdForSite("global", site)).toBeUndefined();
	});

	it("builds copyable order list paths without trusting frontend site ids", () => {
		expect(
			buildAdminOrdersPath({
				scopeType: "site",
				scopeId: "00000000-0000-4000-8000-000000000301",
				limit: 100,
			}),
		).toBe(
			"/orders?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&limit=100",
		);
		expect(buildAdminOrdersPath({ scopeType: "global" })).toBe(
			"/orders?scopeType=global",
		);
	});

	it("formats status, amounts and short ids for admin order pages", () => {
		expect(orderStatusClassName("paid")).toContain("text-[#1d7053]");
		expect(orderStatusClassName("failed")).toContain("text-[#a43b24]");
		expect(orderStatusClassName("pending_payment")).toContain("text-[#8a5a13]");
		expect(formatCurrency("100.00", "USD")).toBe("$100.00");
		expect(shortId("00000000-0000-4000-8000-000000000301")).toBe("00000000");
	});

	it("derives fulfillment operations from order detail state", () => {
		expect(
			getFulfillmentActionState({
				orderStatus: "paid",
				paymentStatus: "paid",
				fulfillmentStatus: "unfulfilled",
				inventoryLocks: [
					{
						inventoryLockId: "lock-1",
						orderItemId: "item-1",
						skuId: "sku-1",
						warehouseId: "warehouse-1",
						quantity: 1,
						status: "deducted",
						idempotencyKey: "lock-1",
						expiresAt: "2026-05-16T00:00:00.000Z",
						createdAt: "2026-05-16T00:00:00.000Z",
					},
				],
				inventoryTransactions: [],
				fulfillmentOrders: [],
				shipments: [],
			}),
		).toMatchObject({
			canCreateFulfillment: true,
			defaultWarehouseId: "warehouse-1",
		});

		expect(
			getFulfillmentActionState({
				orderStatus: "confirmed",
				paymentStatus: "paid",
				fulfillmentStatus: "pending",
				inventoryLocks: [],
				inventoryTransactions: [],
				fulfillmentOrders: [
					{
						fulfillmentOrderId: "fulfillment-1",
						fulfillmentNo: "FUL-1",
						warehouseId: "warehouse-1",
						status: "pending",
						itemCount: 1,
						createdAt: "2026-05-16T00:00:00.000Z",
						updatedAt: "2026-05-16T00:00:00.000Z",
					},
				],
				shipments: [],
			}),
		).toMatchObject({
			canCreateFulfillment: false,
			shippableFulfillmentOrderId: "fulfillment-1",
		});

		expect(
			getFulfillmentActionState({
				orderStatus: "fulfilled",
				paymentStatus: "paid",
				fulfillmentStatus: "shipped",
				inventoryLocks: [],
				inventoryTransactions: [],
				fulfillmentOrders: [],
				shipments: [
					{
						shipmentId: "shipment-1",
						fulfillmentOrderId: "fulfillment-1",
						fulfillmentNo: "FUL-1",
						fulfillmentStatus: "shipped",
						providerCode: "demo",
						providerName: "Demo",
						trackingNo: "TRACK-1",
						status: "shipped",
						trackingEvents: [],
					},
				],
			}),
		).toMatchObject({
			deliverableShipmentId: "shipment-1",
		});
	});
});
