import { describe, expect, it } from "vitest";
import { defaultAdminSiteData } from "@/lib/admin-sites";
import {
	buildAdminAnalyticsPath,
	filterAnalyticsRows,
	filterDimensionRows,
	formatDashboardMoney,
	normalizeDashboardScopeType,
	selectedDashboardScopeIdForSite,
	sumMoney,
} from "./admin-dashboard";

const site = defaultAdminSiteData.sites[0];

describe("admin dashboard helpers", () => {
	it("normalizes scope and selected dimension ids", () => {
		expect(normalizeDashboardScopeType("site")).toBe("site");
		expect(normalizeDashboardScopeType("other")).toBe("global");
		expect(selectedDashboardScopeIdForSite("site", site)).toBe(site.siteId);
		expect(selectedDashboardScopeIdForSite("vertical", site)).toBe(
			site.verticalId,
		);
		expect(selectedDashboardScopeIdForSite("brand", site)).toBe(site.brandId);
		expect(selectedDashboardScopeIdForSite("global", site)).toBeUndefined();
	});

	it("builds analytics paths and filters scoped rows", () => {
		expect(
			buildAdminAnalyticsPath({
				scopeType: "site",
				scopeId: "site-1",
				siteId: "site-1",
			}),
		).toBe("/analytics?scopeType=site&scopeId=site-1&siteId=site-1");
		expect(
			filterAnalyticsRows(
				[
					{ scopeType: "site", scopeKey: site.siteId },
					{ scopeType: "global", scopeKey: "global" },
				],
				"site",
				site,
			),
		).toHaveLength(1);
		expect(
			filterDimensionRows(
				[
					{ siteId: site.siteId },
					{ siteId: "other-site" },
				],
				"site",
				site,
			),
		).toHaveLength(1);
	});

	it("formats dashboard amounts and sums numeric strings", () => {
		expect(formatDashboardMoney("12.5", "USD")).toBe("$12.50");
		expect(sumMoney([{ gmv: "10.00" }, { gmv: "2.50" }], "gmv")).toBe(12.5);
	});
});
