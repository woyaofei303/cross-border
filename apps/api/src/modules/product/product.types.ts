export type ProductAttributeType =
	| "text"
	| "number"
	| "boolean"
	| "select"
	| "multiselect"
	| "json";

export type ProductAttributeOption = {
	id: string;
	label: string;
	value: string;
	sortOrder: number;
};

export type ProductAttributeDefinition = {
	id: string;
	verticalId: string;
	code: string;
	name: string;
	type: ProductAttributeType;
	required: boolean;
	searchable: boolean;
	filterable: boolean;
	sortOrder: number;
	status: "active" | "inactive" | "archived";
	options: ProductAttributeOption[];
};

export type ProductAttributeValue = {
	attributeId: string;
	code: string;
	name: string;
	type: ProductAttributeType;
	value: unknown;
};

export type ProductCatalogItem = {
	id: string;
	skuId: string;
	skuCode: string;
	warehouseId?: string;
	slug: string;
	name: string;
	category: string;
	description: string;
	price: number;
	compareAt?: number;
	currency: string;
	rating: number;
	reviews: number;
	image: string;
	badge: string;
	origin: string;
	shipsIn: string;
	availableQty: number;
	stockStatus: "in_stock" | "low_stock" | "out_of_stock";
	siteId: string;
	verticalId: string;
	brandId: string;
	attributeValues: ProductAttributeValue[];
};

export type ProductCatalog = {
	siteId: string;
	siteCode: string;
	verticalId: string;
	verticalCode: string;
	brandId: string;
	brandCode: string;
	currency: string;
	categories: string[];
	attributeDefinitions: ProductAttributeDefinition[];
	products: ProductCatalogItem[];
};

export type ProductCatalogQuery = {
	currency?: string | undefined;
	category?: string | undefined;
};

export type ProductAttributeQuery = {
	verticalId?: string | undefined;
};

export type ProductStatus = "draft" | "active" | "inactive" | "archived";

export type ProductSkuStatus = "active" | "inactive" | "archived";

export type AdminProductListItem = {
	siteId: string;
	verticalId: string;
	brandId: string;
	productId: string;
	spuCode: string;
	slug: string;
	title: string;
	status: ProductStatus;
	categoryId?: string;
	categoryName?: string;
	skuCount: number;
	activeSkuCount: number;
	availableQty: number;
	minPrice?: string;
	currency?: string;
	updatedAt: string;
	publishedAt?: string;
};

export type AdminSkuPrice = {
	priceId: string;
	currency: string;
	regionCode?: string;
	listPrice: string;
	salePrice?: string;
};

export type AdminProductSku = {
	siteId: string;
	verticalId: string;
	brandId: string;
	skuId: string;
	productId: string;
	skuCode: string;
	title?: string;
	status: ProductSkuStatus;
	attributes: Record<string, unknown>;
	weightGram?: number;
	lengthMm?: number;
	widthMm?: number;
	heightMm?: number;
	availableQty: number;
	lockedQty: number;
	physicalQty: number;
	prices: AdminSkuPrice[];
	updatedAt: string;
};

export type AdminProductMedia = {
	mediaId: string;
	skuId?: string;
	mediaType: "image" | "video";
	url: string;
	altText?: string;
	sortOrder: number;
};

export type AdminProductDetail = AdminProductListItem & {
	description?: string;
	seoTitle?: string;
	seoDescription?: string;
	tags: string[];
	skus: AdminProductSku[];
	media: AdminProductMedia[];
	attributeValues: ProductAttributeValue[];
	createdAt: string;
};

export type AdminProductCategory = {
	siteId: string;
	verticalId: string;
	brandId: string;
	categoryId: string;
	parentId?: string;
	slug: string;
	name: string;
	sortOrder: number;
	isActive: boolean;
	productCount: number;
	createdAt: string;
	updatedAt: string;
};

export type ProductMutationSnapshot = {
	siteId: string;
	verticalId: string;
	brandId: string;
	productId: string;
	spuCode: string;
	status: ProductStatus;
	updatedAt: string;
};

export type ProductSkuMutationSnapshot = {
	siteId: string;
	verticalId: string;
	brandId: string;
	skuId: string;
	productId: string;
	skuCode: string;
	title?: string;
	status: ProductSkuStatus;
	listPrice?: string;
	salePrice?: string;
	currency?: string;
	updatedAt: string;
};

export type ProductCategoryMutationSnapshot = {
	siteId: string;
	verticalId: string;
	brandId: string;
	categoryId: string;
	slug: string;
	name: string;
	sortOrder: number;
	isActive: boolean;
	updatedAt: string;
};
