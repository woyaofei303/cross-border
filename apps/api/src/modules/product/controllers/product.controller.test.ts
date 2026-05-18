import { NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
	defaultSiteContext,
	type SiteContext,
} from "../../../common/site/site-context.js";
import type { ProductCatalogService } from "../product.service.js";
import type { ProductCatalogQuery } from "../product.types.js";
import { ProductController } from "./product.controller.js";

describe("ProductController", () => {
	it("uses the resolved site context rather than a caller-provided site id", async () => {
		const controller = new ProductController({
			listCatalogForSite: async (
				site: SiteContext,
				query: ProductCatalogQuery,
			) => ({
				siteId: site.siteId,
				siteCode: site.siteCode,
				verticalId: site.verticalId,
				verticalCode: site.verticalCode,
				brandId: site.brandId,
				brandCode: site.brandCode,
				currency: query.currency ?? site.defaultCurrency,
				categories: ["All"],
				attributeDefinitions: [],
				products: [],
			}),
		} as unknown as ProductCatalogService);

		await expect(
			controller.listProducts(
				{
					headers: {},
					siteResolution: {
						status: "resolved",
						domain: "localhost",
						resolvedFrom: "default",
						site: defaultSiteContext,
					},
				},
				"USD",
				undefined,
			),
		).resolves.toMatchObject({
			siteId: defaultSiteContext.siteId,
			siteCode: "default-site",
		});
	});

	it("rejects product listing when the request domain has no resolved site", async () => {
		const controller = new ProductController({
			listCatalogForSite: async () => {
				throw new Error("Should not list products for unresolved sites.");
			},
		} as unknown as ProductCatalogService);

		await expect(
			controller.listProducts(
				{
					headers: {},
					siteResolution: {
						status: "unresolved",
						domain: "unknown.example.com",
						reason: "domain_not_found",
					},
				},
				undefined,
				undefined,
			),
		).rejects.toBeInstanceOf(NotFoundException);
	});
});
