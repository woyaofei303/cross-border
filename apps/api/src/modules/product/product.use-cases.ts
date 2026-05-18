import { BadRequestException } from "@nestjs/common";
import type { TransactionManagerPort } from "../../common/application/application-ports.js";
import type {
	AdminProductScopeQuery,
	CreateAdminProductAttributeInput,
	CreateAdminProductAttributeOptionInput,
	ProductAdminRepositoryPort,
	UpdateAdminCategoryInput,
	UpdateAdminProductAttributeInput,
	UpdateAdminProductSkuInput,
	UpdateAdminProductStatusInput,
} from "./product.ports.js";
import type {
	AdminProductCategory,
	AdminProductDetail,
	AdminProductListItem,
	ProductAttributeDefinition,
	ProductCategoryMutationSnapshot,
	ProductMutationSnapshot,
	ProductSkuMutationSnapshot,
	ProductSkuStatus,
	ProductStatus,
} from "./product.types.js";

export type ProductAdminUseCaseDeps = {
	transactions: TransactionManagerPort;
	products: ProductAdminRepositoryPort;
};

export type ListAdminProductsUseCaseInput = Omit<
	AdminProductScopeQuery,
	"limit"
> & {
	limit?: number;
};

const productStatuses = new Set<ProductStatus>([
	"draft",
	"active",
	"inactive",
	"archived",
]);

const skuStatuses = new Set<ProductSkuStatus>([
	"active",
	"inactive",
	"archived",
]);

const attributeStatuses = new Set<ProductAttributeDefinition["status"]>([
	"active",
	"inactive",
	"archived",
]);

const attributeTypes = new Set<ProductAttributeDefinition["type"]>([
	"text",
	"number",
	"boolean",
	"select",
	"multiselect",
	"json",
]);

function normalizeLimit(limit: number | undefined): number {
	if (!Number.isInteger(limit)) {
		return 50;
	}

	return Math.min(Math.max(limit ?? 50, 1), 100);
}

function assertProductStatus(status: string): ProductStatus {
	if (!productStatuses.has(status as ProductStatus)) {
		throw new BadRequestException({
			code: "INVALID_PRODUCT_STATUS",
			message: "Product status must be draft, active, inactive, or archived.",
		});
	}

	return status as ProductStatus;
}

function assertSkuStatus(status: string | undefined): ProductSkuStatus | undefined {
	if (status === undefined) {
		return undefined;
	}

	if (!skuStatuses.has(status as ProductSkuStatus)) {
		throw new BadRequestException({
			code: "INVALID_SKU_STATUS",
			message: "SKU status must be active, inactive, or archived.",
		});
	}

	return status as ProductSkuStatus;
}

function assertAttributeStatus(
	status: string | undefined,
): ProductAttributeDefinition["status"] | undefined {
	if (status === undefined) {
		return undefined;
	}

	if (!attributeStatuses.has(status as ProductAttributeDefinition["status"])) {
		throw new BadRequestException({
			code: "INVALID_ATTRIBUTE_STATUS",
			message: "Attribute status must be active, inactive, or archived.",
		});
	}

	return status as ProductAttributeDefinition["status"];
}

function assertAttributeType(type: string): ProductAttributeDefinition["type"] {
	if (!attributeTypes.has(type as ProductAttributeDefinition["type"])) {
		throw new BadRequestException({
			code: "INVALID_ATTRIBUTE_TYPE",
			message:
				"Attribute type must be text, number, boolean, select, multiselect, or json.",
		});
	}

	return type as ProductAttributeDefinition["type"];
}

function assertNonBlank(value: string, code: string, message: string): string {
	const trimmed = value.trim();

	if (!trimmed) {
		throw new BadRequestException({ code, message });
	}

	return trimmed;
}

function normalizeMoney(value: string | undefined): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	const amount = Number(value);

	if (!Number.isFinite(amount) || amount < 0) {
		throw new BadRequestException({
			code: "INVALID_MONEY_AMOUNT",
			message: "Money amount must be a non-negative number.",
		});
	}

	return amount.toFixed(2);
}

export class ListAdminProductsUseCase {
	constructor(private readonly deps: ProductAdminUseCaseDeps) {}

	async execute(
		input: ListAdminProductsUseCaseInput,
	): Promise<AdminProductListItem[]> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.products.listAdminProducts(
				{
					adminAccess: input.adminAccess,
					...(input.selectedScope ? { selectedScope: input.selectedScope } : {}),
					limit: normalizeLimit(input.limit),
					...(input.status ? { status: assertProductStatus(input.status) } : {}),
				},
				transaction,
			),
		);
	}
}

export class GetAdminProductDetailUseCase {
	constructor(private readonly deps: ProductAdminUseCaseDeps) {}

	async execute(input: {
		adminAccess: AdminProductScopeQuery["adminAccess"];
		productId: string;
	}): Promise<AdminProductDetail | null> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.products.getAdminProductDetail(input, transaction),
		);
	}
}

export class ListAdminCategoriesUseCase {
	constructor(private readonly deps: ProductAdminUseCaseDeps) {}

	async execute(
		input: ListAdminProductsUseCaseInput,
	): Promise<AdminProductCategory[]> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.products.listAdminCategories(
				{
					adminAccess: input.adminAccess,
					...(input.selectedScope ? { selectedScope: input.selectedScope } : {}),
					limit: normalizeLimit(input.limit),
					...(input.status ? { status: assertProductStatus(input.status) } : {}),
				},
				transaction,
			),
		);
	}
}

export class UpdateAdminProductStatusUseCase {
	constructor(private readonly deps: ProductAdminUseCaseDeps) {}

	async execute(
		input: Omit<UpdateAdminProductStatusInput, "transaction" | "status"> & {
			status: string;
		},
	): Promise<ProductMutationSnapshot | null> {
		return this.deps.transactions.runInTransaction(async (transaction) => {
			const result = await this.deps.products.updateAdminProductStatus({
				adminAccess: input.adminAccess,
				productId: input.productId,
				status: assertProductStatus(input.status),
				transaction,
			});

			return result?.after ?? null;
		});
	}
}

export class UpdateAdminProductSkuUseCase {
	constructor(private readonly deps: ProductAdminUseCaseDeps) {}

	async execute(
		input: Omit<UpdateAdminProductSkuInput, "transaction" | "status"> & {
			status?: string;
		},
	): Promise<ProductSkuMutationSnapshot | null> {
		return this.deps.transactions.runInTransaction(async (transaction) => {
			const listPrice = normalizeMoney(input.listPrice);
			const salePrice =
				input.salePrice === null ? null : normalizeMoney(input.salePrice);
			const status = assertSkuStatus(input.status);
			const updateInput: UpdateAdminProductSkuInput = {
				adminAccess: input.adminAccess,
				skuId: input.skuId,
				...(input.title !== undefined ? { title: input.title } : {}),
				...(status ? { status } : {}),
				...(input.currency ? { currency: input.currency.trim().toUpperCase() } : {}),
				...(listPrice !== undefined ? { listPrice } : {}),
				transaction,
			};

			if (input.salePrice !== undefined) {
				updateInput.salePrice = salePrice ?? null;
			}

			const result = await this.deps.products.updateAdminProductSku(updateInput);

			return result?.after ?? null;
		});
	}
}

export class UpdateAdminCategoryUseCase {
	constructor(private readonly deps: ProductAdminUseCaseDeps) {}

	async execute(
		input: Omit<UpdateAdminCategoryInput, "transaction">,
	): Promise<ProductCategoryMutationSnapshot | null> {
		return this.deps.transactions.runInTransaction(async (transaction) => {
			const result = await this.deps.products.updateAdminCategory({
				adminAccess: input.adminAccess,
				categoryId: input.categoryId,
				...(input.name !== undefined ? { name: input.name } : {}),
				...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
				...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
				transaction,
			});

			return result?.after ?? null;
		});
	}
}

export class CreateAdminProductAttributeUseCase {
	constructor(private readonly deps: ProductAdminUseCaseDeps) {}

	async execute(
		input: Omit<CreateAdminProductAttributeInput, "transaction" | "type" | "status"> & {
			type: string;
			status: string;
		},
	): Promise<ProductAttributeDefinition | null> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.products.createAdminProductAttribute({
				adminAccess: input.adminAccess,
				verticalId: input.verticalId,
				code: assertNonBlank(
					input.code,
					"ATTRIBUTE_CODE_REQUIRED",
					"Attribute code is required.",
				),
				name: assertNonBlank(
					input.name,
					"ATTRIBUTE_NAME_REQUIRED",
					"Attribute name is required.",
				),
				type: assertAttributeType(input.type),
				required: input.required,
				searchable: input.searchable,
				filterable: input.filterable,
				sortOrder: input.sortOrder,
				status: assertAttributeStatus(input.status) ?? "active",
				transaction,
			}),
		);
	}
}

export class UpdateAdminProductAttributeUseCase {
	constructor(private readonly deps: ProductAdminUseCaseDeps) {}

	async execute(
		input: Omit<UpdateAdminProductAttributeInput, "transaction" | "status"> & {
			status?: string;
		},
	): Promise<ProductAttributeDefinition | null> {
		return this.deps.transactions.runInTransaction(async (transaction) => {
			const status = assertAttributeStatus(input.status);
			const result = await this.deps.products.updateAdminProductAttribute({
				adminAccess: input.adminAccess,
				attributeId: input.attributeId,
				...(input.name !== undefined ? { name: input.name } : {}),
				...(input.required !== undefined ? { required: input.required } : {}),
				...(input.searchable !== undefined ? { searchable: input.searchable } : {}),
				...(input.filterable !== undefined ? { filterable: input.filterable } : {}),
				...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
				...(status ? { status } : {}),
				transaction,
			});

			return result?.after ?? null;
		});
	}
}

export class CreateAdminProductAttributeOptionUseCase {
	constructor(private readonly deps: ProductAdminUseCaseDeps) {}

	async execute(
		input: Omit<CreateAdminProductAttributeOptionInput, "transaction">,
	): Promise<ProductAttributeDefinition | null> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.products.createAdminProductAttributeOption({
				adminAccess: input.adminAccess,
				attributeId: input.attributeId,
				label: assertNonBlank(
					input.label,
					"ATTRIBUTE_OPTION_LABEL_REQUIRED",
					"Attribute option label is required.",
				),
				value: assertNonBlank(
					input.value,
					"ATTRIBUTE_OPTION_VALUE_REQUIRED",
					"Attribute option value is required.",
				),
				sortOrder: input.sortOrder,
				transaction,
			}),
		);
	}
}
