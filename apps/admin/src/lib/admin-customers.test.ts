import { describe, expect, it } from "vitest";
import {
	buildAdminCustomersPath,
	customerStatusClassName,
	formatCustomerMoney,
	normalizeCustomerScopeType,
	selectedCustomerScopeIdForSite,
} from "./admin-customers";
import type { AdminSite } from "./admin-sites";

const site = {
	siteId: "site-1",
	verticalId: "vertical-1",
	brandId: "brand-1",
} as AdminSite;

describe("admin customer helpers", () => {
	it("normalizes invalid scope to global", () => {
		expect(normalizeCustomerScopeType("site")).toBe("site");
		expect(normalizeCustomerScopeType("other")).toBe("global");
		expect(normalizeCustomerScopeType(["brand"])).toBe("brand");
	});

	it("selects the dimension id for the chosen scope", () => {
		expect(selectedCustomerScopeIdForSite("global", site)).toBeUndefined();
		expect(selectedCustomerScopeIdForSite("site", site)).toBe("site-1");
		expect(selectedCustomerScopeIdForSite("vertical", site)).toBe("vertical-1");
		expect(selectedCustomerScopeIdForSite("brand", site)).toBe("brand-1");
	});

	it("builds copyable customer list paths", () => {
		expect(
			buildAdminCustomersPath({
				scopeType: "site",
				scopeId: "site-1",
				siteId: "site-1",
				limit: 100,
			}),
		).toBe("/customers?scopeType=site&scopeId=site-1&siteId=site-1&limit=100");
	});

	it("formats customer status and money", () => {
		expect(customerStatusClassName("active")).toContain("text-[#1d7053]");
		expect(formatCustomerMoney("12.5", "USD")).toBe("$12.50");
	});
});
