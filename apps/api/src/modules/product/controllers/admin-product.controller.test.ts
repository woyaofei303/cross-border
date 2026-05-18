import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import type { AdminAccessService } from "../../admin-access/admin-access.service.js";
import type { AdminAuditService } from "../../admin-audit/admin-audit.service.js";
import type {
	CreateAdminProductAttributeOptionUseCase,
	CreateAdminProductAttributeUseCase,
	GetAdminProductDetailUseCase,
	ListAdminCategoriesUseCase,
	ListAdminProductsUseCase,
	UpdateAdminCategoryUseCase,
	UpdateAdminProductAttributeUseCase,
	UpdateAdminProductSkuUseCase,
	UpdateAdminProductStatusUseCase,
} from "../product.use-cases.js";
import { AdminProductController } from "./admin-product.controller.js";

function createController(input: {
	access?: unknown;
	audit?: unknown;
	listProducts?: unknown;
	getDetail?: unknown;
	listCategories?: unknown;
	updateStatus?: unknown;
	updateSku?: unknown;
	updateCategory?: unknown;
	createAttribute?: unknown;
	updateAttribute?: unknown;
	createOption?: unknown;
}) {
	return new AdminProductController(
		input.access as AdminAccessService,
		input.audit as AdminAuditService,
		input.listProducts as ListAdminProductsUseCase,
		input.getDetail as GetAdminProductDetailUseCase,
		input.listCategories as ListAdminCategoriesUseCase,
		input.updateStatus as UpdateAdminProductStatusUseCase,
		input.updateSku as UpdateAdminProductSkuUseCase,
		input.updateCategory as UpdateAdminCategoryUseCase,
		input.createAttribute as CreateAdminProductAttributeUseCase,
		input.updateAttribute as UpdateAdminProductAttributeUseCase,
		input.createOption as CreateAdminProductAttributeOptionUseCase,
	);
}

describe("AdminProductController", () => {
	const access = {
		source: "database" as const,
		adminUserId: "admin-1",
		scopes: [{ scopeType: "site" as const, scopeId: defaultSiteContext.siteId }],
	};

	it("lists products through resolved admin scope", async () => {
		const resolveForRequest = vi.fn(async () => access);
		const execute = vi.fn(async () => [
			{
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				productId: "product-1",
				spuCode: "SPU-1",
				slug: "demo",
				title: "Demo Product",
				status: "active",
				skuCount: 1,
				activeSkuCount: 1,
				availableQty: 12,
				updatedAt: "2026-05-16T00:00:00.000Z",
			},
		]);
		const controller = createController({
			access: { resolveForRequest },
			audit: { record: async () => undefined },
			listProducts: { execute },
			getDetail: { execute: async () => null },
			listCategories: { execute: async () => [] },
			updateStatus: { execute: async () => null },
			updateSku: { execute: async () => null },
			updateCategory: { execute: async () => null },
			createAttribute: { execute: async () => null },
			updateAttribute: { execute: async () => null },
			createOption: { execute: async () => null },
		});

		const response = await controller.listProducts(
			{ headers: { "x-admin-user-id": "admin-1" } },
			{ scopeType: "site", scopeId: defaultSiteContext.siteId, limit: 20 },
		);

		expect(response.products[0]).toMatchObject({ spuCode: "SPU-1" });
		expect(execute).toHaveBeenCalledWith({
			adminAccess: access,
			selectedScope: {
				scopeType: "site",
				scopeId: defaultSiteContext.siteId,
			},
			limit: 20,
		});
	});

	it("rejects non-global selected scope without scope id", async () => {
		const controller = createController({
			access: {
				resolveForRequest: async () => ({
					source: "fallback",
					scopes: [{ scopeType: "global" }],
				}),
			},
			audit: { record: async () => undefined },
			listProducts: {
				execute: async () => {
					throw new Error("Should not list without scope id.");
				},
			},
			getDetail: { execute: async () => null },
			listCategories: { execute: async () => [] },
			updateStatus: { execute: async () => null },
			updateSku: { execute: async () => null },
			updateCategory: { execute: async () => null },
			createAttribute: { execute: async () => null },
			updateAttribute: { execute: async () => null },
			createOption: { execute: async () => null },
		});

		await expect(
			controller.listProducts({ headers: {} }, { scopeType: "site" }),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it("updates product status and records site-aware audit", async () => {
		const record = vi.fn(async () => undefined);
		const execute = vi.fn(async () => ({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			productId: "product-1",
			spuCode: "SPU-1",
			status: "inactive",
			updatedAt: "2026-05-16T00:00:00.000Z",
		}));
		const controller = createController({
			access: { resolveForRequest: async () => access },
			audit: { record },
			listProducts: { execute: async () => [] },
			getDetail: { execute: async () => null },
			listCategories: { execute: async () => [] },
			updateStatus: { execute },
			updateSku: { execute: async () => null },
			updateCategory: { execute: async () => null },
			createAttribute: { execute: async () => null },
			updateAttribute: { execute: async () => null },
			createOption: { execute: async () => null },
		});

		const response = await controller.updateProductStatus(
			{ headers: {} },
			"product-1",
			{ status: "inactive" },
		);

		expect(response).toMatchObject({ status: "inactive" });
		expect(record).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "product.update_status",
				resourceType: "product",
				resourceId: "product-1",
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
			}),
		);
	});

	it("returns not found when scoped product mutation is not visible", async () => {
		const controller = createController({
			access: { resolveForRequest: async () => access },
			audit: { record: async () => undefined },
			listProducts: { execute: async () => [] },
			getDetail: { execute: async () => null },
			listCategories: { execute: async () => [] },
			updateStatus: { execute: async () => null },
			updateSku: { execute: async () => null },
			updateCategory: { execute: async () => null },
			createAttribute: { execute: async () => null },
			updateAttribute: { execute: async () => null },
			createOption: { execute: async () => null },
		});

		await expect(
			controller.updateProductStatus({ headers: {} }, "product-1", {
				status: "active",
			}),
		).rejects.toBeInstanceOf(NotFoundException);
	});
});
