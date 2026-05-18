import { NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import type { SiteResolverService } from "../site.service.js";
import { SiteController } from "./site.controller.js";

describe("SiteController", () => {
	it("returns the resolved current site", async () => {
		const controller = new SiteController({
			resolveForRequest: async () => ({
				status: "resolved",
				domain: "localhost",
				resolvedFrom: "default",
				site: defaultSiteContext,
			}),
		} as unknown as SiteResolverService);

		await expect(
			controller.getCurrentSite("localhost:3000", undefined, undefined),
		).resolves.toMatchObject({
			siteCode: "default-site",
			resolvedFrom: "default",
		});
	});

	it("throws a 404 when no active site is configured for the domain", async () => {
		const controller = new SiteController({
			resolveForRequest: async () => ({
				status: "unresolved",
				domain: "unknown.example.com",
				reason: "domain_not_found",
			}),
		} as unknown as SiteResolverService);

		await expect(
			controller.getCurrentSite("unknown.example.com", undefined, undefined),
		).rejects.toBeInstanceOf(NotFoundException);
	});
});
