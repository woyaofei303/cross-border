import type { SiteContext } from "../../common/site/site-context.js";
import type {
	AdminAccessContext,
	AdminScope,
} from "../../common/admin/admin-access.js";
import type { TransactionContext } from "../../common/application/application-ports.js";
import type {
	AdminProductCategory,
	AdminProductDetail,
	AdminProductListItem,
	ProductAttributeDefinition,
	ProductAttributeQuery,
	ProductCatalog,
	ProductCatalogQuery,
	ProductCategoryMutationSnapshot,
	ProductMutationSnapshot,
	ProductSkuMutationSnapshot,
	ProductSkuStatus,
	ProductStatus,
} from "./product.types.js";

export interface ProductReadRepositoryPort {
	findCatalogForSite(
		site: SiteContext,
		query: ProductCatalogQuery,
	): Promise<ProductCatalog>;

	findAttributesForSite(site: SiteContext): Promise<ProductAttributeDefinition[]>;

	findAttributesForAdmin(
		scopes: readonly AdminScope[] | undefined,
		query: ProductAttributeQuery,
	): Promise<ProductAttributeDefinition[]>;
}

export type AdminProductScopeQuery = {
	adminAccess: AdminAccessContext;
	selectedScope?: AdminScope;
	limit: number;
	status?: ProductStatus;
};

export type UpdateAdminProductStatusInput = {
	adminAccess: AdminAccessContext;
	productId: string;
	status: ProductStatus;
	transaction: TransactionContext;
};

export type UpdateAdminProductSkuInput = {
	adminAccess: AdminAccessContext;
	skuId: string;
	title?: string;
	status?: ProductSkuStatus;
	currency?: string;
	listPrice?: string;
	salePrice?: string | null;
	transaction: TransactionContext;
};

export type UpdateAdminCategoryInput = {
	adminAccess: AdminAccessContext;
	categoryId: string;
	name?: string;
	sortOrder?: number;
	isActive?: boolean;
	transaction: TransactionContext;
};

export type CreateAdminProductAttributeInput = {
	adminAccess: AdminAccessContext;
	verticalId: string;
	code: string;
	name: string;
	type: ProductAttributeDefinition["type"];
	required: boolean;
	searchable: boolean;
	filterable: boolean;
	sortOrder: number;
	status: ProductAttributeDefinition["status"];
	transaction: TransactionContext;
};

export type UpdateAdminProductAttributeInput = {
	adminAccess: AdminAccessContext;
	attributeId: string;
	name?: string;
	required?: boolean;
	searchable?: boolean;
	filterable?: boolean;
	sortOrder?: number;
	status?: ProductAttributeDefinition["status"];
	transaction: TransactionContext;
};

export type CreateAdminProductAttributeOptionInput = {
	adminAccess: AdminAccessContext;
	attributeId: string;
	label: string;
	value: string;
	sortOrder: number;
	transaction: TransactionContext;
};

export type ProductMutationResult<TSnapshot> = {
	before?: TSnapshot;
	after: TSnapshot;
};

export interface ProductAdminRepositoryPort {
	listAdminProducts(
		query: AdminProductScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminProductListItem[]>;

	getAdminProductDetail(
		input: {
			adminAccess: AdminAccessContext;
			productId: string;
		},
		transaction: TransactionContext,
	): Promise<AdminProductDetail | null>;

	listAdminCategories(
		query: AdminProductScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminProductCategory[]>;

	updateAdminProductStatus(
		input: UpdateAdminProductStatusInput,
	): Promise<ProductMutationResult<ProductMutationSnapshot> | null>;

	updateAdminProductSku(
		input: UpdateAdminProductSkuInput,
	): Promise<ProductMutationResult<ProductSkuMutationSnapshot> | null>;

	updateAdminCategory(
		input: UpdateAdminCategoryInput,
	): Promise<ProductMutationResult<ProductCategoryMutationSnapshot> | null>;

	createAdminProductAttribute(
		input: CreateAdminProductAttributeInput,
	): Promise<ProductAttributeDefinition | null>;

	updateAdminProductAttribute(
		input: UpdateAdminProductAttributeInput,
	): Promise<ProductMutationResult<ProductAttributeDefinition> | null>;

	createAdminProductAttributeOption(
		input: CreateAdminProductAttributeOptionInput,
	): Promise<ProductAttributeDefinition | null>;
}
