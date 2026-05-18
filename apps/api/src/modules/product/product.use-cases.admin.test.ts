import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { TransactionContext } from "../../common/application/application-ports.js";
import { defaultSiteContext } from "../../common/site/site-context.js";
import {
	CreateAdminProductAttributeUseCase,
	ListAdminProductsUseCase,
	UpdateAdminProductSkuUseCase,
	UpdateAdminProductStatusUseCase,
} from "./product.use-cases.js";

const transaction = {
	transactionId: Symbol("test"),
} as unknown as TransactionContext;

const adminAccess = {
	source: "fallback" as const,
	scopes: [{ scopeType: "global" as const }],
};

function createTransactions() {
	return {
		runInTransaction: vi.fn(async (callback) => callback(transaction)),
	};
}

describe("admin product catalog use cases", () => {
	it("lists products with normalized limit and selected scope", async () => {
		const transactions = createTransactions();
		const listAdminProducts = vi.fn(async () => [
			{
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				productId: "product-1",
				spuCode: "SPU-1",
				slug: "demo",
				title: "Demo Product",
				status: "active" as const,
				skuCount: 2,
				activeSkuCount: 1,
				availableQty: 10,
				updatedAt: "2026-05-16T00:00:00.000Z",
			},
		]);
		const useCase = new ListAdminProductsUseCase({
			transactions,
			products: {
				listAdminProducts,
			} as never,
		});

		const result = await useCase.execute({
			adminAccess,
			selectedScope: {
				scopeType: "site",
				scopeId: defaultSiteContext.siteId,
			},
			limit: 200,
		});

		expect(result[0]?.spuCode).toBe("SPU-1");
		expect(listAdminProducts).toHaveBeenCalledWith(
			{
				adminAccess,
				selectedScope: {
					scopeType: "site",
					scopeId: defaultSiteContext.siteId,
				},
				limit: 100,
			},
			transaction,
		);
	});

	it("updates product status through the repository", async () => {
		const transactions = createTransactions();
		const updateAdminProductStatus = vi.fn(async () => ({
			after: {
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				productId: "product-1",
				spuCode: "SPU-1",
				status: "inactive" as const,
				updatedAt: "2026-05-16T00:00:00.000Z",
			},
		}));
		const useCase = new UpdateAdminProductStatusUseCase({
			transactions,
			products: {
				updateAdminProductStatus,
			} as never,
		});

		const result = await useCase.execute({
			adminAccess,
			productId: "product-1",
			status: "inactive",
		});

		expect(result).toMatchObject({ status: "inactive" });
		expect(updateAdminProductStatus).toHaveBeenCalledWith({
			adminAccess,
			productId: "product-1",
			status: "inactive",
			transaction,
		});
	});

	it("rejects invalid product status", async () => {
		const useCase = new UpdateAdminProductStatusUseCase({
			transactions: createTransactions(),
			products: {
				updateAdminProductStatus: async () => {
					throw new Error("Should not update invalid status.");
				},
			} as never,
		});

		await expect(
			useCase.execute({
				adminAccess,
				productId: "product-1",
				status: "deleted",
			}),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it("normalizes SKU price input before updating SKU basics", async () => {
		const transactions = createTransactions();
		const updateAdminProductSku = vi.fn(async () => ({
			after: {
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				skuId: "sku-1",
				productId: "product-1",
				skuCode: "SKU-1",
				status: "active" as const,
				currency: "USD",
				listPrice: "22.50",
				salePrice: "19.99",
				updatedAt: "2026-05-16T00:00:00.000Z",
			},
		}));
		const useCase = new UpdateAdminProductSkuUseCase({
			transactions,
			products: {
				updateAdminProductSku,
			} as never,
		});

		await useCase.execute({
			adminAccess,
			skuId: "sku-1",
			status: "active",
			currency: "usd",
			listPrice: "22.5",
			salePrice: "19.99",
		});

		expect(updateAdminProductSku).toHaveBeenCalledWith({
			adminAccess,
			skuId: "sku-1",
			status: "active",
			currency: "USD",
			listPrice: "22.50",
			salePrice: "19.99",
			transaction,
		});
	});

	it("creates vertical dynamic attributes with defaults", async () => {
		const transactions = createTransactions();
		const createAdminProductAttribute = vi.fn(async () => ({
			id: "attr-1",
			verticalId: defaultSiteContext.verticalId,
			code: "frame_material",
			name: "Frame Material",
			type: "text" as const,
			required: false,
			searchable: true,
			filterable: true,
			sortOrder: 10,
			status: "active" as const,
			options: [],
		}));
		const useCase = new CreateAdminProductAttributeUseCase({
			transactions,
			products: {
				createAdminProductAttribute,
			} as never,
		});

		const result = await useCase.execute({
			adminAccess,
			verticalId: defaultSiteContext.verticalId,
			code: "frame_material",
			name: "Frame Material",
			type: "text",
			required: false,
			searchable: true,
			filterable: true,
			sortOrder: 10,
			status: "active",
		});

		expect(result?.code).toBe("frame_material");
		expect(createAdminProductAttribute).toHaveBeenCalledWith({
			adminAccess,
			verticalId: defaultSiteContext.verticalId,
			code: "frame_material",
			name: "Frame Material",
			type: "text",
			required: false,
			searchable: true,
			filterable: true,
			sortOrder: 10,
			status: "active",
			transaction,
		});
	});
});
