import { describe, expect, it } from "vitest";
import { defaultAdminSiteData } from "@/lib/admin-sites";
import {
	buildAdminProductsPath,
	formatCurrency,
	formatDateTime,
	normalizeProductScopeType,
	normalizeProductStatus,
	productStatusClassName,
	selectedProductScopeIdForSite,
	shortId,
} from "@/lib/admin-products";

describe("admin product helpers", () => {
	it("normalizes product scopes, statuses and selected ids", () => {
		const site = defaultAdminSiteData.sites[0];

		expect(normalizeProductScopeType("site")).toBe("site");
		expect(normalizeProductScopeType("unknown")).toBe("global");
		expect(normalizeProductStatus("active")).toBe("active");
		expect(normalizeProductStatus("deleted")).toBeUndefined();
		expect(selectedProductScopeIdForSite("site", site)).toBe(site.siteId);
		expect(selectedProductScopeIdForSite("vertical", site)).toBe(
			site.verticalId,
		);
		expect(selectedProductScopeIdForSite("brand", site)).toBe(site.brandId);
		expect(selectedProductScopeIdForSite("global", site)).toBeUndefined();
	});

	it("builds product admin paths with scope and status filters", () => {
		expect(
			buildAdminProductsPath({
				scopeType: "site",
				scopeId: "00000000-0000-4000-8000-000000000301",
				siteId: "00000000-0000-4000-8000-000000000301",
				status: "active",
				limit: 100,
			}),
		).toBe(
			"/products?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&siteId=00000000-0000-4000-8000-000000000301&status=active&limit=100",
		);
		expect(buildAdminProductsPath({ scopeType: "global" })).toBe(
			"/products?scopeType=global",
		);
	});

	it("formats catalog status, amounts, dates and ids", () => {
		expect(productStatusClassName("active")).toContain("text-[#1d7053]");
		expect(productStatusClassName("inactive")).toContain("text-[#8a5a13]");
		expect(productStatusClassName("archived")).toContain("text-[#a43b24]");
		expect(formatCurrency("19.99", "USD")).toBe("$19.99");
		expect(formatDateTime("2026-05-16T00:00:00.000Z")).toBe(
			"2026-05-16 00:00",
		);
		expect(shortId("00000000-0000-4000-8000-000000000301")).toBe("00000000");
	});
});
