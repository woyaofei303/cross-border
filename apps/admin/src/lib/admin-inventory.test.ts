import { describe, expect, it } from "vitest";
import { defaultAdminSiteData } from "@/lib/admin-sites";
import {
	buildAdminInventoryPath,
	formatDateTime,
	inventoryStatusClassName,
	normalizeInventoryScopeType,
	selectedInventoryScopeIdForSite,
	shortId,
} from "@/lib/admin-inventory";

describe("admin inventory helpers", () => {
	it("normalizes selected inventory scopes and ids from the active site", () => {
		const site = defaultAdminSiteData.sites[0];

		expect(normalizeInventoryScopeType("site")).toBe("site");
		expect(normalizeInventoryScopeType("unknown")).toBe("global");
		expect(selectedInventoryScopeIdForSite("site", site)).toBe(site.siteId);
		expect(selectedInventoryScopeIdForSite("vertical", site)).toBe(
			site.verticalId,
		);
		expect(selectedInventoryScopeIdForSite("brand", site)).toBe(site.brandId);
		expect(selectedInventoryScopeIdForSite("global", site)).toBeUndefined();
	});

	it("builds inventory operation paths without trusting frontend site ids", () => {
		expect(
			buildAdminInventoryPath({
				scopeType: "site",
				scopeId: "00000000-0000-4000-8000-000000000301",
				siteId: "00000000-0000-4000-8000-000000000301",
				limit: 100,
			}),
		).toBe(
			"/inventory?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&siteId=00000000-0000-4000-8000-000000000301&limit=100",
		);
		expect(buildAdminInventoryPath({ scopeType: "global" })).toBe(
			"/inventory?scopeType=global",
		);
	});

	it("formats status, dates and ids for admin inventory pages", () => {
		expect(inventoryStatusClassName("deducted")).toContain("text-[#1d7053]");
		expect(inventoryStatusClassName("expired")).toContain("text-[#a43b24]");
		expect(inventoryStatusClassName("locked")).toContain("text-[#8a5a13]");
		expect(formatDateTime("2026-05-16T00:00:00.000Z")).toBe(
			"2026-05-16 00:00",
		);
		expect(shortId("00000000-0000-4000-8000-000000000301")).toBe("00000000");
	});
});
