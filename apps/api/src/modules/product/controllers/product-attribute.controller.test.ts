import { NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import type { AdminAccessContext } from "../../../common/admin/admin-access.js";
import {
	defaultSiteContext,
	type SiteContext,
} from "../../../common/site/site-context.js";
import type { AdminAccessService } from "../../admin-access/admin-access.service.js";
import type { ProductCatalogService } from "../product.service.js";
import type { ProductAttributeQuery } from "../product.types.js";
import {
	AdminProductAttributeController,
	ProductAttributeController,
} from "./product-attribute.controller.js";

describe("ProductAttributeController", () => {
	it("uses the resolved site context for storefront attribute metadata", async () => {
		const controller = new ProductAttributeController({
			listAttributesForSite: async (site: SiteContext) => [
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
		} as unknown as ProductCatalogService);

		await expect(
			controller.listCurrentSiteAttributes({
				headers: {},
				siteResolution: {
					status: "resolved",
					domain: "localhost",
					resolvedFrom: "default",
					site: defaultSiteContext,
				},
			}),
		).resolves.toMatchObject({
			attributes: [
				{
					verticalId: defaultSiteContext.verticalId,
					code: "frame_material",
				},
			],
		});
	});

	it("rejects storefront attribute metadata when the domain is unresolved", async () => {
		const controller = new ProductAttributeController({
			listAttributesForSite: async () => {
				throw new Error("Should not list attributes for unresolved sites.");
			},
		} as unknown as ProductCatalogService);

		await expect(
			controller.listCurrentSiteAttributes({
				headers: {},
				siteResolution: {
					status: "unresolved",
					domain: "unknown.example.com",
					reason: "domain_not_found",
				},
			}),
		).rejects.toBeInstanceOf(NotFoundException);
	});
});

describe("AdminProductAttributeController", () => {
	it("filters admin attribute metadata through the resolved admin scope", async () => {
		const controller = new AdminProductAttributeController(
			{
				listAttributesForAdmin: async (
					access: AdminAccessContext,
					query: ProductAttributeQuery,
				) => [
					{
						id: "attr-1",
						verticalId: query.verticalId ?? "vertical-1",
						code: access.scopes[0]?.scopeType ?? "none",
						name: "Scoped Attribute",
						type: "text",
						required: false,
						searchable: false,
						filterable: true,
						sortOrder: 1,
						status: "active",
						options: [],
					},
				],
			} as unknown as ProductCatalogService,
			{
				resolveForRequest: async () => ({
					source: "database",
					adminUserId: "00000000-0000-4000-8000-000000000999",
					scopes: [
						{
							scopeType: "vertical",
							scopeId: defaultSiteContext.verticalId,
						},
					],
				}),
			} as unknown as AdminAccessService,
		);

		await expect(
			controller.listAdminAttributes(
				{ headers: {} },
				{ verticalId: defaultSiteContext.verticalId },
			),
		).resolves.toMatchObject({
			attributes: [
				{
					verticalId: defaultSiteContext.verticalId,
					code: "vertical",
				},
			],
		});
	});
});
