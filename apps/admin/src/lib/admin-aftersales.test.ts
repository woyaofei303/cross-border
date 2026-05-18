import { describe, expect, it } from "vitest";
import { defaultAdminSiteData } from "@/lib/admin-sites";
import {
	afterSalesStatusClassName,
	buildAdminAfterSalesPath,
	formatCurrency,
	getAfterSalesActionState,
	normalizeAfterSalesScopeType,
	selectedAfterSalesScopeIdForSite,
	shortId,
} from "@/lib/admin-aftersales";

describe("admin after-sales helpers", () => {
	it("normalizes selected after-sales scopes and ids from the active site", () => {
		const site = defaultAdminSiteData.sites[0];

		expect(normalizeAfterSalesScopeType("site")).toBe("site");
		expect(normalizeAfterSalesScopeType("unknown")).toBe("global");
		expect(selectedAfterSalesScopeIdForSite("site", site)).toBe(site.siteId);
		expect(selectedAfterSalesScopeIdForSite("vertical", site)).toBe(
			site.verticalId,
		);
		expect(selectedAfterSalesScopeIdForSite("brand", site)).toBe(site.brandId);
		expect(selectedAfterSalesScopeIdForSite("global", site)).toBeUndefined();
	});

	it("builds after-sales paths without trusting frontend site ids", () => {
		expect(
			buildAdminAfterSalesPath({
				scopeType: "site",
				scopeId: "00000000-0000-4000-8000-000000000301",
				siteId: "00000000-0000-4000-8000-000000000301",
				limit: 100,
			}),
		).toBe(
			"/after-sales?scopeType=site&scopeId=00000000-0000-4000-8000-000000000301&siteId=00000000-0000-4000-8000-000000000301&limit=100",
		);
		expect(buildAdminAfterSalesPath({ scopeType: "global" })).toBe(
			"/after-sales?scopeType=global",
		);
	});

	it("formats status, amounts and ids for after-sales pages", () => {
		expect(afterSalesStatusClassName("completed")).toContain("text-[#1d7053]");
		expect(afterSalesStatusClassName("rejected")).toContain("text-[#a43b24]");
		expect(afterSalesStatusClassName("requested")).toContain("text-[#8a5a13]");
		expect(formatCurrency("20.00", "USD")).toBe("$20.00");
		expect(shortId("00000000-0000-4000-8000-000000000301")).toBe("00000000");
	});

	it("derives approval and refund success actions from request detail", () => {
		expect(
			getAfterSalesActionState({
				status: "requested",
				requestedAmount: "20.00",
				refunds: [],
			}),
		).toMatchObject({
			canApprove: true,
			canReject: true,
			defaultApprovedAmount: "20.00",
		});

		expect(
			getAfterSalesActionState({
				status: "refunding",
				requestedAmount: "20.00",
				approvedAmount: "15.00",
				refunds: [
					{
						refundId: "refund-1",
						refundNo: "RF-1",
						paymentOrderId: "payment-1",
						orderId: "order-1",
						siteId: "site-1",
						verticalId: "vertical-1",
						brandId: "brand-1",
						status: "requested",
						amount: "15.00",
						currency: "USD",
						idempotencyKey: "approve-key",
						createdAt: "2026-05-16T00:00:00.000Z",
						updatedAt: "2026-05-16T00:00:00.000Z",
					},
				],
			}),
		).toMatchObject({
			canApprove: false,
			canReject: false,
			refundIdToMarkSucceeded: "refund-1",
		});
	});
});
