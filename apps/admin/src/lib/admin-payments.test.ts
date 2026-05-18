import { describe, expect, it } from "vitest";
import { defaultAdminSiteData } from "@/lib/admin-sites";
import {
	buildAdminPaymentsPath,
	formatCurrency,
	normalizePaymentScopeType,
	paymentStatusClassName,
	selectedPaymentScopeIdForSite,
	shortId,
	summarizePipelineResult,
} from "@/lib/admin-payments";

describe("admin payment helpers", () => {
	it("normalizes selected payment scopes and ids from the active site", () => {
		const site = defaultAdminSiteData.sites[0];

		expect(normalizePaymentScopeType("site")).toBe("site");
		expect(normalizePaymentScopeType("unknown")).toBe("global");
		expect(selectedPaymentScopeIdForSite("site", site)).toBe(site.siteId);
		expect(selectedPaymentScopeIdForSite("vertical", site)).toBe(site.verticalId);
		expect(selectedPaymentScopeIdForSite("brand", site)).toBe(site.brandId);
		expect(selectedPaymentScopeIdForSite("global", site)).toBeUndefined();
	});

	it("builds payment operation paths without trusting frontend site ids", () => {
		expect(
			buildAdminPaymentsPath({
				scopeType: "site",
				scopeId: "00000000-0000-4000-8000-000000000301",
				siteId: "00000000-0000-4000-8000-000000000301",
				limit: 100,
			}),
		).toBe(
			"/payments?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&siteId=00000000-0000-4000-8000-000000000301&limit=100",
		);
		expect(buildAdminPaymentsPath({ scopeType: "global" })).toBe(
			"/payments?scopeType=global",
		);
	});

	it("formats status, amounts and short ids for admin payment pages", () => {
		expect(paymentStatusClassName("processed")).toContain("text-[#1d7053]");
		expect(paymentStatusClassName("failed")).toContain("text-[#a43b24]");
		expect(paymentStatusClassName("received")).toContain("text-[#8a5a13]");
		expect(formatCurrency("100.00", "USD")).toBe("$100.00");
		expect(shortId("00000000-0000-4000-8000-000000000301")).toBe("00000000");
	});

	it("summarizes commerce pipeline result counts", () => {
		expect(
			summarizePipelineResult({
				paymentWebhooks: {
					claimed: 2,
					processed: 1,
					skipped: 1,
					alreadyProcessed: 0,
					failed: 0,
					results: [],
				},
				paymentSucceededEvents: {
					claimed: 1,
					processed: 0,
					skipped: 0,
					alreadyProcessed: 1,
					failed: 0,
					results: [],
				},
				analyticsEvents: {
					claimed: 3,
					processed: 2,
					alreadyProcessed: 0,
					ignored: 1,
					failed: 1,
					results: [],
				},
			}),
		).toEqual({
			claimed: 6,
			processed: 3,
			skipped: 1,
			alreadyProcessed: 1,
			failed: 1,
		});
	});
});
