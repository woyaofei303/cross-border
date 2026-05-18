import { describe, expect, it } from "vitest";
import {
	defaultSiteContext,
	defaultSiteForDomain,
	getResolvedSiteFromRequest,
	isLocalDevelopmentDomain,
	normalizeSiteDomain,
	readHeaderValue,
} from "./site-context.js";

describe("site context helpers", () => {
	it("normalizes request host values into comparable domains", () => {
		expect(normalizeSiteDomain("LOCALHOST:3000")).toBe("localhost");
		expect(normalizeSiteDomain("https://glasses.example.com/path")).toBe(
			"glasses.example.com",
		);
		expect(normalizeSiteDomain("shoes.example.com, proxy.local")).toBe(
			"shoes.example.com",
		);
		expect(normalizeSiteDomain("[::1]:3000")).toBe("::1");
	});

	it("detects local development domains for default site compatibility", () => {
		expect(isLocalDevelopmentDomain("localhost")).toBe(true);
		expect(isLocalDevelopmentDomain("127.0.0.1")).toBe(true);
		expect(isLocalDevelopmentDomain("::1")).toBe(true);
		expect(isLocalDevelopmentDomain("glasses.example.com")).toBe(false);
	});

	it("preserves default site dimensions while replacing the current domain", () => {
		expect(defaultSiteForDomain("localhost.test")).toMatchObject({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			domain: "localhost.test",
		});
	});

	it("reads the first repeated header value", () => {
		expect(readHeaderValue(["first.example.com", "second.example.com"])).toBe(
			"first.example.com",
		);
		expect(readHeaderValue("site.example.com")).toBe("site.example.com");
		expect(readHeaderValue(undefined)).toBeUndefined();
	});

	it("returns only resolved site context from a site-aware request", () => {
		expect(
			getResolvedSiteFromRequest({
				headers: {},
				siteResolution: {
					status: "resolved",
					domain: "localhost",
					resolvedFrom: "default",
					site: defaultSiteContext,
				},
			}),
		).toMatchObject({ siteCode: "default-site" });
		expect(
			getResolvedSiteFromRequest({
				headers: {},
				siteResolution: {
					status: "unresolved",
					domain: "unknown.example.com",
					reason: "domain_not_found",
				},
			}),
		).toBeNull();
	});
});
