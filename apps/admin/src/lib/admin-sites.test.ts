import { describe, expect, it } from "vitest";
import {
	canSelectAdminScope,
	countSitesByStatus,
	defaultAdminSiteData,
	findSelectedSite,
	getAdminScopeDisplayName,
} from "@/lib/admin-sites";

describe("admin site management data helpers", () => {
	it("keeps the migrated default site available", () => {
		expect(defaultAdminSiteData.sites[0]).toMatchObject({
			siteCode: "default-site",
			verticalCode: "default",
			brandCode: "default",
			status: "active",
		});
		expect(defaultAdminSiteData.access).toMatchObject({
			source: "fallback",
			scopes: [{ scopeType: "global" }],
		});
		expect(defaultAdminSiteData.productAttributes).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: "origin" })]),
		);
		expect(defaultAdminSiteData.analytics).toEqual({
			dailySales: [],
			channelPerformance: [],
			productPerformance: [],
			customerLtv: [],
		});
		expect(defaultAdminSiteData.operations).toEqual({
			orders: [],
			paymentWebhooks: [],
			inventoryLocks: [],
			inventoryTransactions: [],
			afterSalesRequests: [],
			paymentRefunds: [],
			auditLogs: [],
		});
	});

	it("counts sites by lifecycle status", () => {
		expect(countSitesByStatus(defaultAdminSiteData.sites, "active")).toBe(1);
		expect(countSitesByStatus(defaultAdminSiteData.sites, "inactive")).toBe(0);
	});

	it("falls back to the first site when the selected site is unavailable", () => {
		expect(findSelectedSite(defaultAdminSiteData.sites, "missing")).toMatchObject(
			{
				siteCode: "default-site",
			},
		);
	});

	it("allows global admins to switch every workspace scope", () => {
		expect(canSelectAdminScope([{ scopeType: "global" }], "site")).toBe(true);
		expect(canSelectAdminScope([{ scopeType: "global" }], "brand")).toBe(true);
	});

	it("keeps scoped admins inside their explicit data range", () => {
		expect(
			canSelectAdminScope([{ scopeType: "site", scopeId: "site-1" }], "site"),
		).toBe(true);
		expect(
			canSelectAdminScope(
				[{ scopeType: "site", scopeId: "site-1" }],
				"vertical",
			),
		).toBe(false);
		expect(getAdminScopeDisplayName("vertical")).toBe("Vertical");
	});
});
