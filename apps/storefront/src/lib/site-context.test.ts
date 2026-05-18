import { describe, expect, it } from "vitest";
import {
	defaultStorefrontSiteContext,
	normalizeStorefrontHost,
	resolveStorefrontSiteFromHost,
} from "@/lib/site-context";

describe("storefront site context", () => {
	it("normalizes host headers into stable domains", () => {
		expect(normalizeStorefrontHost("LOCALHOST:3000")).toBe("localhost");
		expect(normalizeStorefrontHost("https://glasses.example.com/path")).toBe(
			"glasses.example.com",
		);
		expect(normalizeStorefrontHost("shoes.example.com, proxy.local")).toBe(
			"shoes.example.com",
		);
		expect(normalizeStorefrontHost("[::1]:3000")).toBe("::1");
	});

	it("keeps the original single-site storefront as the default site", () => {
		expect(resolveStorefrontSiteFromHost("localhost:3000")).toMatchObject({
			siteId: defaultStorefrontSiteContext.siteId,
			siteCode: "default-site",
			verticalCode: "default",
			brandCode: "default",
			domain: "localhost",
		});
	});
});
