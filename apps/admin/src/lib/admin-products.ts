import type { AdminScopeType, AdminSite } from "@/lib/admin-sites";

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

export type AdminProductAttributeValue = {
	attributeId: string;
	code: string;
	name: string;
	type: string;
	value: unknown;
};

export type AdminProductDetail = AdminProductListItem & {
	description?: string;
	seoTitle?: string;
	seoDescription?: string;
	tags: string[];
	skus: AdminProductSku[];
	media: AdminProductMedia[];
	attributeValues: AdminProductAttributeValue[];
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

type AdminProductListResponse = {
	products: AdminProductListItem[];
};

type AdminProductCategoryListResponse = {
	categories: AdminProductCategory[];
};

const API_BASE_URL =
	process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

export function normalizeProductScopeType(
	value: string | string[] | undefined,
): AdminScopeType {
	const raw = Array.isArray(value) ? value[0] : value;

	if (
		raw === "global" ||
		raw === "vertical" ||
		raw === "brand" ||
		raw === "site"
	) {
		return raw;
	}

	return "global";
}

export function normalizeProductStatus(
	value: string | string[] | undefined,
): ProductStatus | undefined {
	const raw = Array.isArray(value) ? value[0] : value;

	if (
		raw === "draft" ||
		raw === "active" ||
		raw === "inactive" ||
		raw === "archived"
	) {
		return raw;
	}

	return undefined;
}

export function selectedProductScopeIdForSite(
	scopeType: AdminScopeType,
	site: AdminSite,
): string | undefined {
	if (scopeType === "site") {
		return site.siteId;
	}

	if (scopeType === "vertical") {
		return site.verticalId;
	}

	if (scopeType === "brand") {
		return site.brandId;
	}

	return undefined;
}

export function buildAdminProductsPath(input: {
	scopeType: AdminScopeType;
	scopeId?: string;
	siteId?: string;
	status?: ProductStatus;
	limit?: number;
	query?: string;
	page?: number;
	pageSize?: number;
}) {
	const params = new URLSearchParams();
	params.set("scopeType", input.scopeType);

	if (input.scopeId) {
		params.set("scopeId", input.scopeId);
	}

	if (input.siteId) {
		params.set("siteId", input.siteId);
	}

	if (input.status) {
		params.set("status", input.status);
	}

	if (input.limit) {
		params.set("limit", String(input.limit));
	}

	if (input.query) {
		params.set("query", input.query);
	}

	if (input.page) {
		params.set("page", String(input.page));
	}

	if (input.pageSize) {
		params.set("pageSize", String(input.pageSize));
	}

	return `/products?${params.toString()}`;
}

function buildAdminCatalogApiPath(
	pathname: string,
	input: {
		scopeType: AdminScopeType;
		scopeId?: string;
		status?: ProductStatus;
		limit?: number;
	},
) {
	const params = new URLSearchParams();
	params.set("scopeType", input.scopeType);

	if (input.scopeId) {
		params.set("scopeId", input.scopeId);
	}

	if (input.status) {
		params.set("status", input.status);
	}

	if (input.limit) {
		params.set("limit", String(input.limit));
	}

	return `${pathname}?${params.toString()}`;
}

async function fetchJson<T>(pathname: string): Promise<T> {
	if (!API_BASE_URL) {
		throw new Error("Admin API base URL is not configured.");
	}

	const response = await fetch(new URL(pathname, API_BASE_URL), {
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`Admin product API request failed: ${pathname}`);
	}

	return (await response.json()) as T;
}

export async function loadAdminProducts(input: {
	scopeType: AdminScopeType;
	scopeId?: string;
	status?: ProductStatus;
	limit?: number;
}): Promise<AdminProductListItem[]> {
	if (!API_BASE_URL) {
		return [];
	}

	const payload = await fetchJson<AdminProductListResponse>(
		buildAdminCatalogApiPath("/api/admin/products", input),
	);

	return payload.products;
}

export async function loadAdminProductCategories(input: {
	scopeType: AdminScopeType;
	scopeId?: string;
	limit?: number;
}): Promise<AdminProductCategory[]> {
	if (!API_BASE_URL) {
		return [];
	}

	const payload = await fetchJson<AdminProductCategoryListResponse>(
		buildAdminCatalogApiPath("/api/admin/categories", input),
	);

	return payload.categories;
}

export async function loadAdminProductDetail(
	productId: string,
): Promise<AdminProductDetail | null> {
	if (!API_BASE_URL) {
		return null;
	}

	const response = await fetch(
		new URL(`/api/admin/products/${productId}`, API_BASE_URL),
		{ cache: "no-store" },
	);

	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		throw new Error("Admin product detail request failed.");
	}

	return (await response.json()) as AdminProductDetail;
}

export function getSiteForProduct(
	sites: AdminSite[],
	product: { siteId: string },
): AdminSite | undefined {
	return sites.find((site) => site.siteId === product.siteId);
}

export function productStatusClassName(status: string) {
	if (status === "active") {
		return "border-[#bbdfcc] bg-[#eef8f1] text-[#1d7053]";
	}

	if (status === "draft") {
		return "border-[#d9e1dc] bg-[#f5f7f8] text-[#425149]";
	}

	if (status === "inactive") {
		return "border-[#e5dac0] bg-[#fff8e6] text-[#8a5a13]";
	}

	return "border-[#e8c8c1] bg-[#fff1ee] text-[#a43b24]";
}

export function formatCurrency(value: string | undefined, currency = "USD") {
	const amount = Number(value ?? "0");

	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
	}).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDateTime(value: string | undefined) {
	return value ? value.slice(0, 16).replace("T", " ") : "-";
}

export function shortId(value: string | undefined) {
	return value ? value.slice(0, 8) : "-";
}
