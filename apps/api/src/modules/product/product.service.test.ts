import { describe, expect, it } from "vitest";
import { defaultSiteContext } from "../../common/site/site-context.js";
import type { PgProductRepository } from "./repositories/pg-product.repository.js";
import { ProductCatalogService } from "./product.service.js";

function createService(repository: Partial<PgProductRepository>) {
	return new ProductCatalogService({
		findCatalogForSite: async (site, query) => ({
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
		findAttributesForSite: async () => [],
		findAttributesForAdmin: async () => [],
		...repository,
	} as PgProductRepository);
}

describe("ProductCatalogService", () => {
	it("returns database products when the current site has catalog rows", async () => {
		const service = createService({
			findCatalogForSite: async (site) => ({
				siteId: site.siteId,
				siteCode: site.siteCode,
				verticalId: site.verticalId,
				verticalCode: site.verticalCode,
				brandId: site.brandId,
				brandCode: site.brandCode,
				currency: "USD",
				categories: ["All", "Glasses"],
				attributeDefinitions: [
					{
						id: "attr-1",
						verticalId: site.verticalId,
						code: "frame_material",
						name: "Frame Material",
						type: "text",
						required: false,
						searchable: true,
						filterable: true,
						sortOrder: 10,
						status: "active",
						options: [],
					},
				],
				products: [
					{
						id: "product-1",
						skuId: "sku-1",
						skuCode: "SKU-1",
						slug: "site-product",
						name: "Site Product",
						category: "Glasses",
						description: "Site-specific product.",
						price: 99,
						currency: "USD",
						rating: 4.8,
						reviews: 12,
						image: "https://example.com/product.jpg",
						badge: "Active",
						origin: "Global",
						shipsIn: "Ships in 48h",
						availableQty: 12,
						stockStatus: "in_stock",
						siteId: site.siteId,
						verticalId: site.verticalId,
						brandId: site.brandId,
						attributeValues: [
							{
								attributeId: "attr-1",
								code: "frame_material",
								name: "Frame Material",
								type: "text",
								value: "acetate",
							},
						],
					},
				],
			}),
		});

		await expect(service.listCatalogForSite(defaultSiteContext)).resolves.toMatchObject(
			{
				siteCode: "default-site",
				categories: ["All", "Glasses"],
				attributeDefinitions: [{ code: "frame_material" }],
				products: [{ id: "product-1", siteId: defaultSiteContext.siteId }],
			},
		);
	});

	it("falls back to the default catalog when the database is unavailable", async () => {
		const service = createService({
			findCatalogForSite: async () => {
				throw new Error("DATABASE_URL is required for PostgreSQL operations.");
			},
		});

		const catalog = await service.listCatalogForSite(defaultSiteContext, {
			currency: "EUR",
		});

		expect(catalog).toMatchObject({
			siteCode: "default-site",
			currency: "EUR",
		});
		expect(catalog.products.length).toBeGreaterThan(0);
		expect(catalog.attributeDefinitions).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: "origin" })]),
		);
		expect(
			catalog.products.every(
				(item) => item.siteId === defaultSiteContext.siteId,
			),
		).toBe(true);
	});

	it("returns dynamic attributes for the current site", async () => {
		const service = createService({
			findAttributesForSite: async (site) => [
				{
					id: "attr-1",
					verticalId: site.verticalId,
					code: "lens_type",
					name: "Lens Type",
					type: "select",
					required: false,
					searchable: true,
					filterable: true,
					sortOrder: 10,
					status: "active",
					options: [
						{
							id: "option-1",
							label: "Polarized",
							value: "polarized",
							sortOrder: 1,
						},
					],
				},
			],
		});

		await expect(
			service.listAttributesForSite(defaultSiteContext),
		).resolves.toMatchObject([{ code: "lens_type", options: [{ value: "polarized" }] }]);
	});
});
