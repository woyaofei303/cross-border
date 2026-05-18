import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { TransactionContext } from "../../common/application/application-ports.js";
import { defaultSiteContext } from "../../common/site/site-context.js";
import {
	CreateAdminProductAttributeOptionUseCase,
	CreateAdminProductAttributeUseCase,
	ListAdminProductsUseCase,
	UpdateAdminProductStatusUseCase,
} from "./product.use-cases.js";

const transaction = {
	transactionId: Symbol("test"),
} as unknown as TransactionContext;

function createTransactions() {
	return {
		runInTransaction: vi.fn(async (callback) => callback(transaction)),
	};
}

describe("admin product use cases", () => {
	const adminAccess = {
		source: "fallback" as const,
		scopes: [{ scopeType: "global" as const }],
	};

	it("lists scoped catalog rows with normalized limit", async () => {
		const transactions = createTransactions();
		const listAdminProducts = vi.fn(async () => [
			{
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				productId: "product-1",
				spuCode: "SPU-1",
				slug: "demo-product",
				title: "Demo Product",
				status: "active" as const,
				skuCount: 2,
				activeSkuCount: 1,
				availableQty: 8,
				minPrice: "49.00",
				currency: "USD",
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
			status: "active",
		});

		expect(result[0]).toMatchObject({
			productId: "product-1",
			siteId: defaultSiteContext.siteId,
		});
		expect(listAdminProducts).toHaveBeenCalledWith(
			{
				adminAccess,
				selectedScope: {
					scopeType: "site",
					scopeId: defaultSiteContext.siteId,
				},
				limit: 100,
				status: "active",
			},
			transaction,
		);
	});

	it("rejects invalid product status before mutation", async () => {
		const useCase = new UpdateAdminProductStatusUseCase({
			transactions: createTransactions(),
			products: {
				updateAdminProductStatus: async () => {
					throw new Error("Should not update with invalid status.");
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

	it("creates vertical attributes through the admin repository", async () => {
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
			transactions: createTransactions(),
			products: {
				createAdminProductAttribute,
			} as never,
		});

		await expect(
			useCase.execute({
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
			}),
		).resolves.toMatchObject({
			code: "frame_material",
			verticalId: defaultSiteContext.verticalId,
		});
		expect(createAdminProductAttribute).toHaveBeenCalledWith(
			expect.objectContaining({
				verticalId: defaultSiteContext.verticalId,
				code: "frame_material",
				transaction,
			}),
		);
	});

	it("adds dynamic attribute options idempotently", async () => {
		const createAdminProductAttributeOption = vi.fn(async () => ({
			id: "attr-1",
			verticalId: defaultSiteContext.verticalId,
			code: "color",
			name: "Color",
			type: "select" as const,
			required: false,
			searchable: true,
			filterable: true,
			sortOrder: 1,
			status: "active" as const,
			options: [
				{
					id: "option-1",
					label: "Black",
					value: "black",
					sortOrder: 1,
				},
			],
		}));
		const useCase = new CreateAdminProductAttributeOptionUseCase({
			transactions: createTransactions(),
			products: {
				createAdminProductAttributeOption,
			} as never,
		});

		const result = await useCase.execute({
			adminAccess,
			attributeId: "attr-1",
			label: "Black",
			value: "black",
			sortOrder: 1,
		});

		expect(result?.options[0]).toMatchObject({ value: "black" });
	});
});
