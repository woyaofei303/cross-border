import { describe, expect, it } from "vitest";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import type { AdminAccessService } from "../../admin-access/admin-access.service.js";
import type { SiteResolverService } from "../site.service.js";
import { AdminSiteController } from "./admin-site.controller.js";

describe("AdminSiteController", () => {
	it("returns site, vertical and brand catalogs for the admin shell", async () => {
		const controller = new AdminSiteController(
			{
				listAdminSites: async () => [
					{
						...defaultSiteContext,
						defaultDomain: "localhost",
						status: "active",
					},
				],
				listAdminVerticals: async () => [
					{
						id: defaultSiteContext.verticalId,
						code: "default",
						name: "Default Vertical",
						status: "active",
					},
				],
				listAdminBrands: async () => [
					{
						id: defaultSiteContext.brandId,
						code: "default",
						name: "Default Brand",
						status: "active",
					},
				],
			} as unknown as SiteResolverService,
			{
				resolveForRequest: async () => ({
					source: "fallback",
					scopes: [{ scopeType: "global" }],
				}),
			} as unknown as AdminAccessService,
		);

		await expect(controller.listSites({ headers: {} })).resolves.toMatchObject({
			sites: [{ siteCode: "default-site", status: "active" }],
		});
		await expect(
			controller.listVerticals({ headers: {} }),
		).resolves.toMatchObject({
			verticals: [{ code: "default", status: "active" }],
		});
		await expect(controller.listBrands({ headers: {} })).resolves.toMatchObject({
			brands: [{ code: "default", status: "active" }],
		});
	});

	it("exposes the admin access context used by scoped list queries", async () => {
		const controller = new AdminSiteController(
			{
				listAdminSites: async () => [],
				listAdminVerticals: async () => [],
				listAdminBrands: async () => [],
			} as unknown as SiteResolverService,
			{
				resolveForRequest: async () => ({
					source: "database",
					adminUserId: "00000000-0000-4000-8000-000000000999",
					scopes: [
						{
							scopeType: "site",
							scopeId: defaultSiteContext.siteId,
						},
					],
				}),
			} as unknown as AdminAccessService,
		);

		await expect(
			controller.getAccessContext({ headers: {} }),
		).resolves.toMatchObject({
			source: "database",
			adminUserId: "00000000-0000-4000-8000-000000000999",
			scopes: [{ scopeType: "site", scopeId: defaultSiteContext.siteId }],
		});
	});
});
