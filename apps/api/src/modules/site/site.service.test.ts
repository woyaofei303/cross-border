import { describe, expect, it, vi } from "vitest";
import type { SiteContext } from "../../common/site/site-context.js";
import { defaultSiteContext } from "../../common/site/site-context.js";
import type { PgSiteRepository } from "./repositories/pg-site.repository.js";
import { SiteResolverService } from "./site.service.js";

function createResolver(
	overrides: Partial<PgSiteRepository>,
) {
	return new SiteResolverService({
		findActiveByDomain: async () => null,
		findSitesForAdmin: async () => [],
		findVerticalsForAdmin: async () => [],
		findBrandsForAdmin: async () => [],
		...overrides,
	} as PgSiteRepository);
}

describe("SiteResolverService", () => {
	it("resolves localhost to the default site without a database lookup", async () => {
		const findActiveByDomain = vi.fn<PgSiteRepository["findActiveByDomain"]>();
		const resolver = createResolver({ findActiveByDomain });

		await expect(
			resolver.resolveForRequest({ host: "localhost:3000" }),
		).resolves.toMatchObject({
			status: "resolved",
			domain: "localhost",
			resolvedFrom: "default",
			site: {
				siteCode: "default-site",
				verticalCode: "default",
				brandCode: "default",
			},
		});
		expect(findActiveByDomain).not.toHaveBeenCalled();
	});

	it("uses x-site-domain before forwarded host and host", async () => {
		const databaseSite: SiteContext = {
			...defaultSiteContext,
			siteId: "site-1",
			siteCode: "glasses-site",
			siteName: "Glasses Site",
			domain: "glasses.example.com",
			verticalId: "vertical-1",
			verticalCode: "glasses",
			verticalName: "Glasses",
		};
		const findActiveByDomain = vi.fn<
			PgSiteRepository["findActiveByDomain"]
		>(async () => databaseSite);
		const resolver = createResolver({ findActiveByDomain });

		await expect(
			resolver.resolveForRequest({
				host: "legacy.example.com",
				forwardedHost: "proxy.example.com",
				siteDomain: "glasses.example.com",
			}),
		).resolves.toMatchObject({
			status: "resolved",
			domain: "glasses.example.com",
			resolvedFrom: "database",
			site: {
				siteCode: "glasses-site",
				verticalCode: "glasses",
			},
		});
		expect(findActiveByDomain).toHaveBeenCalledWith("glasses.example.com");
	});

	it("returns an unresolved result when a non-local domain has no site", async () => {
		const resolver = createResolver({ findActiveByDomain: async () => null });

		await expect(
			resolver.resolveForRequest({ host: "unknown.example.com" }),
		).resolves.toEqual({
			status: "unresolved",
			domain: "unknown.example.com",
			reason: "domain_not_found",
		});
	});

	it("returns default admin catalogs when the database is unavailable", async () => {
		const unavailable = async () => {
			throw new Error("DATABASE_URL is required for PostgreSQL operations.");
		};
		const resolver = createResolver({
			findSitesForAdmin: unavailable,
			findVerticalsForAdmin: unavailable,
			findBrandsForAdmin: unavailable,
		});

		await expect(resolver.listAdminSites()).resolves.toMatchObject([
			{ siteCode: "default-site", status: "active" },
		]);
		await expect(resolver.listAdminVerticals()).resolves.toMatchObject([
			{ code: "default", status: "active" },
		]);
		await expect(resolver.listAdminBrands()).resolves.toMatchObject([
			{ code: "default", status: "active" },
		]);
	});

	it("does not fall back to default catalogs for scoped admins with no grants", async () => {
		const resolver = createResolver({
			findSitesForAdmin: async () => [],
			findVerticalsForAdmin: async () => [],
			findBrandsForAdmin: async () => [],
		});
		const scopedAccess = {
			source: "database" as const,
			adminUserId: "00000000-0000-4000-8000-000000000999",
			scopes: [],
		};

		await expect(resolver.listAdminSites(scopedAccess)).resolves.toEqual([]);
		await expect(resolver.listAdminVerticals(scopedAccess)).resolves.toEqual([]);
		await expect(resolver.listAdminBrands(scopedAccess)).resolves.toEqual([]);
	});
});
