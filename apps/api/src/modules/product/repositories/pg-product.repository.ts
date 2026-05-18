import { Injectable } from "@nestjs/common";
import {
	type AdminScope,
	globalAdminScope,
	hasGlobalAdminScope,
} from "../../../common/admin/admin-access.js";
import type { AdminAccessContext } from "../../../common/admin/admin-access.js";
import type { TransactionContext } from "../../../common/application/application-ports.js";
import type { SiteContext } from "../../../common/site/site-context.js";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import { getPgClient } from "../../database/pg/pg-transaction-manager.js";
import { PgPoolService } from "../../database/pg/pg-pool.service.js";
import type {
	AdminProductScopeQuery,
	CreateAdminProductAttributeInput,
	CreateAdminProductAttributeOptionInput,
	ProductAdminRepositoryPort,
	ProductMutationResult,
	ProductReadRepositoryPort,
	UpdateAdminCategoryInput,
	UpdateAdminProductAttributeInput,
	UpdateAdminProductSkuInput,
	UpdateAdminProductStatusInput,
} from "../product.ports.js";
import type {
	AdminProductCategory,
	AdminProductDetail,
	AdminProductListItem,
	AdminProductMedia,
	AdminProductSku,
	AdminSkuPrice,
	ProductAttributeDefinition,
	ProductAttributeOption,
	ProductAttributeQuery,
	ProductAttributeType,
	ProductAttributeValue,
	ProductCatalog,
	ProductCatalogItem,
	ProductCatalogQuery,
	ProductCategoryMutationSnapshot,
	ProductMutationSnapshot,
	ProductSkuMutationSnapshot,
} from "../product.types.js";

type ProductCatalogRow = {
	product_id: string;
	sku_id: string;
	sku_code: string;
	warehouse_id: string | null;
	slug: string;
	product_title: string;
	product_description: string | null;
	category_name: string | null;
	list_price: string | null;
	sale_price: string | null;
	currency: string | null;
	image_url: string | null;
	tags: string[];
	attributes: Record<string, unknown>;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	available_qty: number | string | null;
};

type ProductAttributeDefinitionRow = {
	id: string;
	vertical_id: string;
	code: string;
	name: string;
	type: ProductAttributeType;
	required: boolean;
	searchable: boolean;
	filterable: boolean;
	sort_order: number;
	status: "active" | "inactive" | "archived";
	option_id: string | null;
	option_label: string | null;
	option_value: string | null;
	option_sort_order: number | null;
};

type ProductAttributeValueRow = {
	product_id: string;
	sku_id: string | null;
	attribute_id: string;
	code: string;
	name: string;
	type: ProductAttributeType;
	value: unknown;
};

type AdminProductListRow = {
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	product_id: string;
	spu_code: string;
	slug: string;
	title: string;
	status: "draft" | "active" | "inactive" | "archived";
	category_id: string | null;
	category_name: string | null;
	sku_count: number | string;
	active_sku_count: number | string;
	available_qty: number | string | null;
	min_price: string | null;
	currency: string | null;
	updated_at: Date | string;
	published_at: Date | string | null;
};

type AdminProductDetailRow = AdminProductListRow & {
	description: string | null;
	seo_title: string | null;
	seo_description: string | null;
	tags: string[];
	created_at: Date | string;
};

type AdminProductSkuRow = {
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	sku_id: string;
	product_id: string;
	sku_code: string;
	title: string | null;
	status: "active" | "inactive" | "archived";
	attributes: Record<string, unknown>;
	weight_gram: number | null;
	length_mm: number | null;
	width_mm: number | null;
	height_mm: number | null;
	available_qty: number | string | null;
	locked_qty: number | string | null;
	physical_qty: number | string | null;
	price_id: string | null;
	currency: string | null;
	region_code: string | null;
	list_price: string | null;
	sale_price: string | null;
	updated_at: Date | string;
};

type AdminProductMediaRow = {
	media_id: string;
	sku_id: string | null;
	media_type: "image" | "video";
	url: string;
	alt_text: string | null;
	sort_order: number;
};

type AdminProductCategoryRow = {
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	category_id: string;
	parent_id: string | null;
	slug: string;
	name: string;
	sort_order: number;
	is_active: boolean;
	product_count: number | string;
	created_at: Date | string;
	updated_at: Date | string;
};

type ProductMutationRow = {
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	product_id: string;
	spu_code: string;
	status: "draft" | "active" | "inactive" | "archived";
	updated_at: Date | string;
};

type ProductSkuMutationRow = {
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	sku_id: string;
	product_id: string;
	sku_code: string;
	title: string | null;
	status: "active" | "inactive" | "archived";
	list_price: string | null;
	sale_price: string | null;
	currency: string | null;
	updated_at: Date | string;
};

type ProductCategoryMutationRow = {
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	category_id: string;
	slug: string;
	name: string;
	sort_order: number;
	is_active: boolean;
	updated_at: Date | string;
};

type AttributeValueBuckets = {
	productValuesByProductId: Map<string, ProductAttributeValue[]>;
	skuValuesBySkuId: Map<string, ProductAttributeValue[]>;
};

type SqlPredicate = {
	sql: string;
	params: string[];
};

function readNumberAttribute(
	attributes: Record<string, unknown>,
	key: string,
	fallback: number,
): number {
	const value = attributes[key];

	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readStringAttribute(
	attributes: Record<string, unknown>,
	key: string,
	fallback: string,
): string {
	const value = attributes[key];

	return typeof value === "string" && value.trim() ? value : fallback;
}

function readAvailableQty(value: number | string | null): number {
	const availableQty = Number(value ?? 0);

	return Number.isFinite(availableQty) && availableQty > 0
		? Math.floor(availableQty)
		: 0;
}

function getStockStatus(availableQty: number) {
	if (availableQty <= 0) {
		return "out_of_stock" as const;
	}

	if (availableQty <= 5) {
		return "low_stock" as const;
	}

	return "in_stock" as const;
}

function readPrice(value: string | null): number | null {
	if (!value) {
		return null;
	}

	const price = Number(value);

	return Number.isFinite(price) ? price : null;
}

function toCamelCase(code: string): string {
	return code.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function readLegacyAttributeValue(
	attributes: Record<string, unknown>,
	code: string,
): unknown {
	const candidates = [code, toCamelCase(code)];

	for (const candidate of candidates) {
		if (Object.prototype.hasOwnProperty.call(attributes, candidate)) {
			return attributes[candidate];
		}
	}

	return undefined;
}

function getLegacyAttributeValues(
	attributes: Record<string, unknown>,
	definitions: ProductAttributeDefinition[],
): ProductAttributeValue[] {
	return definitions.flatMap((definition) => {
		const value = readLegacyAttributeValue(attributes, definition.code);

		if (value === undefined) {
			return [];
		}

		return [
			{
				attributeId: definition.id,
				code: definition.code,
				name: definition.name,
				type: definition.type,
				value,
			},
		];
	});
}

function mergeAttributeValues(
	legacyValues: ProductAttributeValue[],
	dynamicValues: ProductAttributeValue[],
): ProductAttributeValue[] {
	const valuesByCode = new Map<string, ProductAttributeValue>();

	for (const value of legacyValues) {
		valuesByCode.set(value.code, value);
	}

	for (const value of dynamicValues) {
		valuesByCode.set(value.code, value);
	}

	return [...valuesByCode.values()];
}

function mapProduct(
	row: ProductCatalogRow,
	site: SiteContext,
	attributeValues: ProductAttributeValue[],
): ProductCatalogItem {
	const listPrice = readPrice(row.list_price) ?? 0;
	const salePrice = readPrice(row.sale_price);
	const price = salePrice ?? listPrice;
	const availableQty = readAvailableQty(row.available_qty);

	return {
		id: row.product_id,
		skuId: row.sku_id,
		skuCode: row.sku_code,
		...(row.warehouse_id ? { warehouseId: row.warehouse_id } : {}),
		slug: row.slug,
		name: row.product_title,
		category: row.category_name ?? "Uncategorized",
		description: row.product_description ?? "",
		price,
		...(salePrice !== null && salePrice < listPrice
			? { compareAt: listPrice }
			: {}),
		currency: row.currency ?? site.defaultCurrency,
		rating: readNumberAttribute(row.attributes, "rating", 4.8),
		reviews: readNumberAttribute(row.attributes, "reviews", 0),
		image: row.image_url ?? "https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1200&q=85",
		badge: readStringAttribute(row.attributes, "badge", row.tags[0] ?? "Active"),
		origin: readStringAttribute(row.attributes, "origin", "Global"),
		shipsIn: readStringAttribute(row.attributes, "shipsIn", "Ships in 48h"),
		availableQty,
		stockStatus: getStockStatus(availableQty),
		siteId: row.site_id ?? site.siteId,
		verticalId: row.vertical_id ?? site.verticalId,
		brandId: row.brand_id ?? site.brandId,
		attributeValues,
	};
}

function getCategories(products: ProductCatalogItem[]) {
	return [
		"All",
		...Array.from(new Set(products.map((product) => product.category))),
	];
}

function mapAttributeDefinitions(
	rows: ProductAttributeDefinitionRow[],
): ProductAttributeDefinition[] {
	const definitionsById = new Map<string, ProductAttributeDefinition>();

	for (const row of rows) {
		const existing = definitionsById.get(row.id);
		const definition =
			existing ??
			({
				id: row.id,
				verticalId: row.vertical_id,
				code: row.code,
				name: row.name,
				type: row.type,
				required: row.required,
				searchable: row.searchable,
				filterable: row.filterable,
				sortOrder: row.sort_order,
				status: row.status,
				options: [],
			} satisfies ProductAttributeDefinition);

		if (row.option_id && row.option_label && row.option_value) {
			const option: ProductAttributeOption = {
				id: row.option_id,
				label: row.option_label,
				value: row.option_value,
				sortOrder: row.option_sort_order ?? 0,
			};
			definition.options.push(option);
		}

		definitionsById.set(row.id, definition);
	}

	return [...definitionsById.values()];
}

function mapAttributeValue(row: ProductAttributeValueRow): ProductAttributeValue {
	return {
		attributeId: row.attribute_id,
		code: row.code,
		name: row.name,
		type: row.type,
		value: row.value,
	};
}

function bucketAttributeValues(
	rows: ProductAttributeValueRow[],
): AttributeValueBuckets {
	const productValuesByProductId = new Map<string, ProductAttributeValue[]>();
	const skuValuesBySkuId = new Map<string, ProductAttributeValue[]>();

	for (const row of rows) {
		const value = mapAttributeValue(row);

		if (row.sku_id) {
			const skuValues = skuValuesBySkuId.get(row.sku_id) ?? [];
			skuValues.push(value);
			skuValuesBySkuId.set(row.sku_id, skuValues);
			continue;
		}

		const productValues = productValuesByProductId.get(row.product_id) ?? [];
		productValues.push(value);
		productValuesByProductId.set(row.product_id, productValues);
	}

	return {
		productValuesByProductId,
		skuValuesBySkuId,
	};
}

function isMissingDynamicAttributeTable(error: unknown): error is Error {
	return (
		error instanceof Error &&
		(error.message.includes('relation "vertical_attributes" does not exist') ||
			error.message.includes(
				'relation "product_attribute_values" does not exist',
			))
	);
}

function appendPredicateParam(
	params: string[],
	startIndex: number,
	value: string,
): string {
	params.push(value);

	return `$${startIndex + params.length - 1}`;
}

function appendParam(params: unknown[], value: unknown): string {
	params.push(value);

	return `$${params.length}`;
}

function toIsoString(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : value;
}

function dimensionFields(row: {
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
}) {
	return {
		siteId: row.site_id ?? defaultSiteContext.siteId,
		verticalId: row.vertical_id ?? defaultSiteContext.verticalId,
		brandId: row.brand_id ?? defaultSiteContext.brandId,
	};
}

function readQty(value: number | string | null): number {
	const quantity = Number(value ?? 0);

	return Number.isFinite(quantity) ? Math.max(Math.floor(quantity), 0) : 0;
}

function optionalIso(value: Date | string | null): string | undefined {
	return value ? toIsoString(value) : undefined;
}

function buildDimensionPredicate(
	scope: AdminScope,
	alias: string,
	params: unknown[],
): string {
	if (scope.scopeType === "global") {
		return "TRUE";
	}

	if (!scope.scopeId) {
		return "FALSE";
	}

	const placeholder = appendParam(params, scope.scopeId);

	if (scope.scopeType === "site") {
		return `(${alias}.site_id = ${placeholder} OR (${placeholder} = '${defaultSiteContext.siteId}' AND ${alias}.site_id IS NULL))`;
	}

	if (scope.scopeType === "vertical") {
		return `(${alias}.vertical_id = ${placeholder} OR (${placeholder} = '${defaultSiteContext.verticalId}' AND ${alias}.vertical_id IS NULL))`;
	}

	return `(${alias}.brand_id = ${placeholder} OR (${placeholder} = '${defaultSiteContext.brandId}' AND ${alias}.brand_id IS NULL))`;
}

function buildAdminAccessPredicate(
	access: AdminAccessContext,
	alias: string,
	params: unknown[],
): string {
	if (hasGlobalAdminScope(access.scopes)) {
		return "TRUE";
	}

	const clauses = access.scopes.map((scope) =>
		buildDimensionPredicate(scope, alias, params),
	);

	return clauses.length > 0 ? `(${clauses.join(" OR ")})` : "FALSE";
}

function buildSelectedScopePredicate(
	selectedScope: AdminScope | undefined,
	alias: string,
	params: unknown[],
): string {
	return selectedScope
		? buildDimensionPredicate(selectedScope, alias, params)
		: "TRUE";
}

function buildAttributeAccessPredicate(
	access: AdminAccessContext,
	params: unknown[],
): string {
	if (hasGlobalAdminScope(access.scopes)) {
		return "TRUE";
	}

	const clauses = access.scopes.flatMap((scope) => {
		if (!scope.scopeId) {
			return [];
		}

		const placeholder = appendParam(params, scope.scopeId);

		if (scope.scopeType === "vertical") {
			return [`vertical_attributes.vertical_id = ${placeholder}`];
		}

		if (scope.scopeType === "brand") {
			return [
				`EXISTS (
          SELECT 1
          FROM sites scoped_sites
          WHERE scoped_sites.vertical_id = vertical_attributes.vertical_id
            AND scoped_sites.brand_id = ${placeholder}
        )`,
			];
		}

		if (scope.scopeType === "site") {
			return [
				`EXISTS (
          SELECT 1
          FROM sites scoped_sites
          WHERE scoped_sites.vertical_id = vertical_attributes.vertical_id
            AND scoped_sites.id = ${placeholder}
        )`,
			];
		}

		return [];
	});

	return clauses.length > 0 ? `(${clauses.join(" OR ")})` : "FALSE";
}

function mapAdminProductListRow(
	row: AdminProductListRow,
): AdminProductListItem {
	const publishedAt = optionalIso(row.published_at);

	return {
		...dimensionFields(row),
		productId: row.product_id,
		spuCode: row.spu_code,
		slug: row.slug,
		title: row.title,
		status: row.status,
		...(row.category_id ? { categoryId: row.category_id } : {}),
		...(row.category_name ? { categoryName: row.category_name } : {}),
		skuCount: Number(row.sku_count),
		activeSkuCount: Number(row.active_sku_count),
		availableQty: readQty(row.available_qty),
		...(row.min_price ? { minPrice: row.min_price } : {}),
		...(row.currency ? { currency: row.currency } : {}),
		updatedAt: toIsoString(row.updated_at),
		...(publishedAt ? { publishedAt } : {}),
	};
}

function mapAdminProductCategory(
	row: AdminProductCategoryRow,
): AdminProductCategory {
	return {
		...dimensionFields(row),
		categoryId: row.category_id,
		...(row.parent_id ? { parentId: row.parent_id } : {}),
		slug: row.slug,
		name: row.name,
		sortOrder: row.sort_order,
		isActive: row.is_active,
		productCount: Number(row.product_count),
		createdAt: toIsoString(row.created_at),
		updatedAt: toIsoString(row.updated_at),
	};
}

function mapProductMutation(row: ProductMutationRow): ProductMutationSnapshot {
	return {
		...dimensionFields(row),
		productId: row.product_id,
		spuCode: row.spu_code,
		status: row.status,
		updatedAt: toIsoString(row.updated_at),
	};
}

function mapProductSkuMutation(
	row: ProductSkuMutationRow,
): ProductSkuMutationSnapshot {
	return {
		...dimensionFields(row),
		skuId: row.sku_id,
		productId: row.product_id,
		skuCode: row.sku_code,
		...(row.title ? { title: row.title } : {}),
		status: row.status,
		...(row.list_price ? { listPrice: row.list_price } : {}),
		...(row.sale_price ? { salePrice: row.sale_price } : {}),
		...(row.currency ? { currency: row.currency } : {}),
		updatedAt: toIsoString(row.updated_at),
	};
}

function mapProductCategoryMutation(
	row: ProductCategoryMutationRow,
): ProductCategoryMutationSnapshot {
	return {
		...dimensionFields(row),
		categoryId: row.category_id,
		slug: row.slug,
		name: row.name,
		sortOrder: row.sort_order,
		isActive: row.is_active,
		updatedAt: toIsoString(row.updated_at),
	};
}

function addAttributeOption(
	definition: ProductAttributeDefinition,
	row: ProductAttributeDefinitionRow,
) {
	if (row.option_id && row.option_label && row.option_value) {
		definition.options.push({
			id: row.option_id,
			label: row.option_label,
			value: row.option_value,
			sortOrder: row.option_sort_order ?? 0,
		});
	}
}

function normalizeScopes(scopes: readonly AdminScope[] | undefined): AdminScope[] {
	return scopes === undefined ? [globalAdminScope] : [...scopes];
}

function buildScopedAttributePredicate(
	scopes: readonly AdminScope[] | undefined,
	query: ProductAttributeQuery,
): SqlPredicate {
	const params: string[] = [];
	const clauses: string[] = [];

	if (query.verticalId) {
		const placeholder = appendPredicateParam(params, 1, query.verticalId);
		clauses.push(`vertical_attributes.vertical_id = ${placeholder}`);
	}

	const normalizedScopes = normalizeScopes(scopes);

	if (!hasGlobalAdminScope(normalizedScopes)) {
		const scopeClauses = normalizedScopes.flatMap((scope) => {
			if (!scope.scopeId) {
				return [];
			}

			const placeholder = appendPredicateParam(params, 1, scope.scopeId);

			if (scope.scopeType === "vertical") {
				return [`vertical_attributes.vertical_id = ${placeholder}`];
			}

			if (scope.scopeType === "brand") {
				return [
					`EXISTS (
            SELECT 1
            FROM sites scoped_sites
            WHERE scoped_sites.vertical_id = vertical_attributes.vertical_id
              AND scoped_sites.brand_id = ${placeholder}
          )`,
				];
			}

			if (scope.scopeType === "site") {
				return [
					`EXISTS (
            SELECT 1
            FROM sites scoped_sites
            WHERE scoped_sites.vertical_id = vertical_attributes.vertical_id
              AND scoped_sites.id = ${placeholder}
          )`,
				];
			}

			return [];
		});

		clauses.push(
			scopeClauses.length > 0 ? `(${scopeClauses.join(" OR ")})` : "FALSE",
		);
	}

	return {
		sql: clauses.length > 0 ? clauses.join(" AND ") : "TRUE",
		params,
	};
}

@Injectable()
export class PgProductRepository
	implements ProductReadRepositoryPort, ProductAdminRepositoryPort
{
	constructor(private readonly pool: PgPoolService) {}

	async findCatalogForSite(
		site: SiteContext,
		query: ProductCatalogQuery,
	): Promise<ProductCatalog> {
		const currency = query.currency ?? site.defaultCurrency;
		const allowLegacyNullScope = site.siteCode === "default-site";
		const result = await this.pool.getPool().query<ProductCatalogRow>(
			`
        SELECT
          products.id AS product_id,
          product_skus.id AS sku_id,
          product_skus.sku_code,
          products.slug,
          COALESCE(product_translations.title, products.title) AS product_title,
          COALESCE(product_translations.description, products.description) AS product_description,
          product_categories.name AS category_name,
          sku_prices.list_price::text,
          sku_prices.sale_price::text,
          sku_prices.currency,
          product_media.url AS image_url,
          products.tags,
          product_skus.attributes,
          products.site_id,
          products.vertical_id,
          products.brand_id,
          inventory.warehouse_id,
          COALESCE(inventory.available_qty, 0) AS available_qty
        FROM products
        JOIN product_skus
          ON product_skus.product_id = products.id
         AND product_skus.status = 'active'
         AND (
           product_skus.site_id = $1
           OR ($5::boolean AND product_skus.site_id IS NULL)
         )
         AND (
           product_skus.vertical_id = $2
           OR ($5::boolean AND product_skus.vertical_id IS NULL)
         )
         AND (
           product_skus.brand_id = $3
           OR ($5::boolean AND product_skus.brand_id IS NULL)
         )
        LEFT JOIN product_categories
          ON product_categories.id = products.category_id
         AND product_categories.is_active = TRUE
         AND (
           product_categories.site_id = $1
           OR ($5::boolean AND product_categories.site_id IS NULL)
         )
        LEFT JOIN product_translations
          ON product_translations.product_id = products.id
         AND product_translations.locale = $6
         AND (
           product_translations.site_id = $1
           OR ($5::boolean AND product_translations.site_id IS NULL)
         )
        LEFT JOIN LATERAL (
          SELECT url
          FROM product_media
          WHERE product_media.product_id = products.id
            AND product_media.media_type = 'image'
            AND (
              product_media.site_id = $1
              OR ($5::boolean AND product_media.site_id IS NULL)
            )
          ORDER BY product_media.sort_order ASC, product_media.created_at ASC
          LIMIT 1
        ) product_media ON TRUE
        LEFT JOIN LATERAL (
          SELECT currency, list_price, sale_price
          FROM sku_prices
          WHERE sku_prices.sku_id = product_skus.id
            AND sku_prices.currency = $4
            AND (
              sku_prices.site_id = $1
              OR ($5::boolean AND sku_prices.site_id IS NULL)
            )
          ORDER BY sku_prices.region_code NULLS FIRST, sku_prices.created_at DESC
          LIMIT 1
        ) sku_prices ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(
              SUM(GREATEST(sku_inventory.available_qty - sku_inventory.safety_qty, 0)),
              0
            )::integer AS available_qty,
            (ARRAY_AGG(
              sku_inventory.warehouse_id
              ORDER BY
                GREATEST(sku_inventory.available_qty - sku_inventory.safety_qty, 0) DESC,
                sku_inventory.updated_at DESC
            ))[1] AS warehouse_id
          FROM sku_inventory
          WHERE sku_inventory.sku_id = product_skus.id
            AND (
              sku_inventory.site_id = $1
              OR ($5::boolean AND sku_inventory.site_id IS NULL)
            )
            AND (
              sku_inventory.vertical_id = $2
              OR ($5::boolean AND sku_inventory.vertical_id IS NULL)
            )
            AND (
              sku_inventory.brand_id = $3
              OR ($5::boolean AND sku_inventory.brand_id IS NULL)
            )
        ) inventory ON TRUE
        WHERE products.status = 'active'
          AND (
            products.site_id = $1
            OR ($5::boolean AND products.site_id IS NULL)
          )
          AND (
            products.vertical_id = $2
            OR ($5::boolean AND products.vertical_id IS NULL)
          )
          AND (
            products.brand_id = $3
            OR ($5::boolean AND products.brand_id IS NULL)
          )
          AND (
            $7::text IS NULL
            OR product_categories.name = $7
            OR product_categories.slug = $7
          )
        ORDER BY products.published_at DESC NULLS LAST, products.updated_at DESC
      `,
			[
				site.siteId,
				site.verticalId,
				site.brandId,
				currency,
				allowLegacyNullScope,
				site.defaultLanguage,
				query.category ?? null,
			],
		);
		const attributeDefinitions = await this.findAttributesForSite(site);
		const attributeValueBuckets = await this.findAttributeValuesForCatalog(
			site,
			result.rows,
		);
		const products = result.rows.map((row) => {
			const legacyValues = getLegacyAttributeValues(
				row.attributes,
				attributeDefinitions,
			);
			const dynamicValues = [
				...(attributeValueBuckets.productValuesByProductId.get(row.product_id) ??
					[]),
				...(attributeValueBuckets.skuValuesBySkuId.get(row.sku_id) ?? []),
			];

			return mapProduct(
				row,
				site,
				mergeAttributeValues(legacyValues, dynamicValues),
			);
		});

		return {
			siteId: site.siteId,
			siteCode: site.siteCode,
			verticalId: site.verticalId,
			verticalCode: site.verticalCode,
			brandId: site.brandId,
			brandCode: site.brandCode,
			currency,
			categories: getCategories(products),
			attributeDefinitions,
			products,
		};
	}

	async findAttributesForSite(
		site: SiteContext,
	): Promise<ProductAttributeDefinition[]> {
		return this.findAttributeDefinitions({
			verticalId: site.verticalId,
		});
	}

	async findAttributesForAdmin(
		scopes: readonly AdminScope[] | undefined,
		query: ProductAttributeQuery,
	): Promise<ProductAttributeDefinition[]> {
		const predicate = buildScopedAttributePredicate(scopes, query);

		return this.findAttributeDefinitions(query, predicate);
	}

	async listAdminProducts(
		query: AdminProductScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminProductListItem[]> {
		const params: unknown[] = [];
		const accessPredicate = buildAdminAccessPredicate(
			query.adminAccess,
			"products",
			params,
		);
		const selectedPredicate = buildSelectedScopePredicate(
			query.selectedScope,
			"products",
			params,
		);
		const statusPredicate = query.status
			? `products.status = ${appendParam(params, query.status)}`
			: "TRUE";
		const limitPlaceholder = appendParam(params, query.limit);
		const result = await getPgClient(transaction).query<AdminProductListRow>(
			`
        SELECT
          products.site_id,
          products.vertical_id,
          products.brand_id,
          products.id AS product_id,
          products.spu_code,
          products.slug,
          products.title,
          products.status,
          product_categories.id AS category_id,
          product_categories.name AS category_name,
          COALESCE(sku_stats.sku_count, 0) AS sku_count,
          COALESCE(sku_stats.active_sku_count, 0) AS active_sku_count,
          COALESCE(inventory_stats.available_qty, 0) AS available_qty,
          price_stats.min_price::text,
          price_stats.currency,
          products.updated_at,
          products.published_at
        FROM products
        LEFT JOIN product_categories
          ON product_categories.id = products.category_id
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::integer AS sku_count,
            COUNT(*) FILTER (WHERE product_skus.status = 'active')::integer AS active_sku_count
          FROM product_skus
          WHERE product_skus.product_id = products.id
        ) sku_stats ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            MIN(COALESCE(sku_prices.sale_price, sku_prices.list_price)) AS min_price,
            (ARRAY_AGG(sku_prices.currency ORDER BY sku_prices.currency))[1] AS currency
          FROM product_skus
          JOIN sku_prices
            ON sku_prices.sku_id = product_skus.id
          WHERE product_skus.product_id = products.id
        ) price_stats ON TRUE
        LEFT JOIN LATERAL (
          SELECT SUM(GREATEST(sku_inventory.available_qty - sku_inventory.safety_qty, 0))::integer AS available_qty
          FROM product_skus
          JOIN sku_inventory
            ON sku_inventory.sku_id = product_skus.id
          WHERE product_skus.product_id = products.id
        ) inventory_stats ON TRUE
        WHERE ${accessPredicate}
          AND ${selectedPredicate}
          AND ${statusPredicate}
        ORDER BY products.updated_at DESC, products.created_at DESC
        LIMIT ${limitPlaceholder}
      `,
			params,
		);

		return result.rows.map(mapAdminProductListRow);
	}

	async getAdminProductDetail(
		input: {
			adminAccess: AdminAccessContext;
			productId: string;
		},
		transaction: TransactionContext,
	): Promise<AdminProductDetail | null> {
		const params: unknown[] = [input.productId];
		const accessPredicate = buildAdminAccessPredicate(
			input.adminAccess,
			"products",
			params,
		);
		const productResult = await getPgClient(transaction).query<AdminProductDetailRow>(
			`
        SELECT
          products.site_id,
          products.vertical_id,
          products.brand_id,
          products.id AS product_id,
          products.spu_code,
          products.slug,
          products.title,
          products.description,
          products.status,
          products.seo_title,
          products.seo_description,
          products.tags,
          product_categories.id AS category_id,
          product_categories.name AS category_name,
          COALESCE(sku_stats.sku_count, 0) AS sku_count,
          COALESCE(sku_stats.active_sku_count, 0) AS active_sku_count,
          COALESCE(inventory_stats.available_qty, 0) AS available_qty,
          price_stats.min_price::text,
          price_stats.currency,
          products.created_at,
          products.updated_at,
          products.published_at
        FROM products
        LEFT JOIN product_categories
          ON product_categories.id = products.category_id
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::integer AS sku_count,
            COUNT(*) FILTER (WHERE product_skus.status = 'active')::integer AS active_sku_count
          FROM product_skus
          WHERE product_skus.product_id = products.id
        ) sku_stats ON TRUE
        LEFT JOIN LATERAL (
          SELECT
            MIN(COALESCE(sku_prices.sale_price, sku_prices.list_price)) AS min_price,
            (ARRAY_AGG(sku_prices.currency ORDER BY sku_prices.currency))[1] AS currency
          FROM product_skus
          JOIN sku_prices
            ON sku_prices.sku_id = product_skus.id
          WHERE product_skus.product_id = products.id
        ) price_stats ON TRUE
        LEFT JOIN LATERAL (
          SELECT SUM(GREATEST(sku_inventory.available_qty - sku_inventory.safety_qty, 0))::integer AS available_qty
          FROM product_skus
          JOIN sku_inventory
            ON sku_inventory.sku_id = product_skus.id
          WHERE product_skus.product_id = products.id
        ) inventory_stats ON TRUE
        WHERE products.id = $1
          AND ${accessPredicate}
        LIMIT 1
      `,
			params,
		);
		const row = productResult.rows[0];

		if (!row) {
			return null;
		}

		const [skus, media, attributeValues] = await Promise.all([
			this.findAdminSkus(input.productId, transaction),
			this.findAdminProductMedia(input.productId, transaction),
			this.findAdminProductAttributeValues(input.productId, transaction),
		]);

		return {
			...mapAdminProductListRow(row),
			...(row.description ? { description: row.description } : {}),
			...(row.seo_title ? { seoTitle: row.seo_title } : {}),
			...(row.seo_description ? { seoDescription: row.seo_description } : {}),
			tags: row.tags,
			skus,
			media,
			attributeValues,
			createdAt: toIsoString(row.created_at),
		};
	}

	async listAdminCategories(
		query: AdminProductScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminProductCategory[]> {
		const params: unknown[] = [];
		const accessPredicate = buildAdminAccessPredicate(
			query.adminAccess,
			"product_categories",
			params,
		);
		const selectedPredicate = buildSelectedScopePredicate(
			query.selectedScope,
			"product_categories",
			params,
		);
		const limitPlaceholder = appendParam(params, query.limit);
		const result = await getPgClient(transaction).query<AdminProductCategoryRow>(
			`
        SELECT
          product_categories.site_id,
          product_categories.vertical_id,
          product_categories.brand_id,
          product_categories.id AS category_id,
          product_categories.parent_id,
          product_categories.slug,
          product_categories.name,
          product_categories.sort_order,
          product_categories.is_active,
          COUNT(products.id)::integer AS product_count,
          product_categories.created_at,
          product_categories.updated_at
        FROM product_categories
        LEFT JOIN products
          ON products.category_id = product_categories.id
        WHERE ${accessPredicate}
          AND ${selectedPredicate}
        GROUP BY product_categories.id
        ORDER BY product_categories.sort_order ASC, product_categories.updated_at DESC
        LIMIT ${limitPlaceholder}
      `,
			params,
		);

		return result.rows.map(mapAdminProductCategory);
	}

	async updateAdminProductStatus(
		input: UpdateAdminProductStatusInput,
	): Promise<ProductMutationResult<ProductMutationSnapshot> | null> {
		const client = getPgClient(input.transaction);
		const before = await this.findProductMutationSnapshotForUpdate(input);

		if (!before) {
			return null;
		}

		const result = await client.query<ProductMutationRow>(
			`
        UPDATE products
        SET
          status = $2::varchar,
          published_at = CASE
            WHEN $2::varchar = 'active' AND published_at IS NULL THEN now()
            ELSE published_at
          END,
          updated_at = now()
        WHERE id = $1
        RETURNING
          site_id,
          vertical_id,
          brand_id,
          id AS product_id,
          spu_code,
          status,
          updated_at
      `,
			[input.productId, input.status],
		);
		const row = result.rows[0];

		return row ? { before, after: mapProductMutation(row) } : null;
	}

	async updateAdminProductSku(
		input: UpdateAdminProductSkuInput,
	): Promise<ProductMutationResult<ProductSkuMutationSnapshot> | null> {
		const client = getPgClient(input.transaction);
		const before = await this.findSkuMutationSnapshotForUpdate(input);

		if (!before) {
			return null;
		}

		await client.query(
			`
        UPDATE product_skus
        SET
          title = COALESCE($2, title),
          status = COALESCE($3, status),
          updated_at = now()
        WHERE id = $1
      `,
			[input.skuId, input.title ?? null, input.status ?? null],
		);

		if (input.currency && (input.listPrice !== undefined || input.salePrice !== undefined)) {
			await this.upsertAdminSkuPrice(input);
		}

		const after = await this.findSkuMutationSnapshotForUpdate(input);

		return after ? { before, after } : null;
	}

	async updateAdminCategory(
		input: UpdateAdminCategoryInput,
	): Promise<ProductMutationResult<ProductCategoryMutationSnapshot> | null> {
		const before = await this.findCategoryMutationSnapshotForUpdate(input);

		if (!before) {
			return null;
		}

		const result = await getPgClient(input.transaction).query<ProductCategoryMutationRow>(
			`
        UPDATE product_categories
        SET
          name = COALESCE($2, name),
          sort_order = COALESCE($3, sort_order),
          is_active = COALESCE($4, is_active),
          updated_at = now()
        WHERE id = $1
        RETURNING
          site_id,
          vertical_id,
          brand_id,
          id AS category_id,
          slug,
          name,
          sort_order,
          is_active,
          updated_at
      `,
			[
				input.categoryId,
				input.name ?? null,
				input.sortOrder ?? null,
				input.isActive ?? null,
			],
		);
		const row = result.rows[0];

		return row ? { before, after: mapProductCategoryMutation(row) } : null;
	}

	async createAdminProductAttribute(
		input: CreateAdminProductAttributeInput,
	): Promise<ProductAttributeDefinition | null> {
		if (!(await this.canAccessVertical(input))) {
			return null;
		}

		const result = await getPgClient(input.transaction).query<{ id: string }>(
			`
        INSERT INTO vertical_attributes (
          vertical_id,
          code,
          name,
          type,
          required,
          searchable,
          filterable,
          sort_order,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (vertical_id, code)
        DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          required = EXCLUDED.required,
          searchable = EXCLUDED.searchable,
          filterable = EXCLUDED.filterable,
          sort_order = EXCLUDED.sort_order,
          status = EXCLUDED.status,
          updated_at = now()
        RETURNING id
      `,
			[
				input.verticalId,
				input.code,
				input.name,
				input.type,
				input.required,
				input.searchable,
				input.filterable,
				input.sortOrder,
				input.status,
			],
		);

		return this.findAdminAttributeById(
			result.rows[0]?.id ?? "",
			input.adminAccess,
			input.transaction,
		);
	}

	async updateAdminProductAttribute(
		input: UpdateAdminProductAttributeInput,
	): Promise<ProductMutationResult<ProductAttributeDefinition> | null> {
		const before = await this.findAdminAttributeById(
			input.attributeId,
			input.adminAccess,
			input.transaction,
		);

		if (!before) {
			return null;
		}

		await getPgClient(input.transaction).query(
			`
        UPDATE vertical_attributes
        SET
          name = COALESCE($2, name),
          required = COALESCE($3, required),
          searchable = COALESCE($4, searchable),
          filterable = COALESCE($5, filterable),
          sort_order = COALESCE($6, sort_order),
          status = COALESCE($7, status),
          updated_at = now()
        WHERE id = $1
      `,
			[
				input.attributeId,
				input.name ?? null,
				input.required ?? null,
				input.searchable ?? null,
				input.filterable ?? null,
				input.sortOrder ?? null,
				input.status ?? null,
			],
		);
		const after = await this.findAdminAttributeById(
			input.attributeId,
			input.adminAccess,
			input.transaction,
		);

		return after ? { before, after } : null;
	}

	async createAdminProductAttributeOption(
		input: CreateAdminProductAttributeOptionInput,
	): Promise<ProductAttributeDefinition | null> {
		const attribute = await this.findAdminAttributeById(
			input.attributeId,
			input.adminAccess,
			input.transaction,
		);

		if (!attribute) {
			return null;
		}

		await getPgClient(input.transaction).query(
			`
        INSERT INTO vertical_attribute_options (
          attribute_id,
          label,
          value,
          sort_order
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (attribute_id, value)
        DO UPDATE SET
          label = EXCLUDED.label,
          sort_order = EXCLUDED.sort_order
      `,
			[input.attributeId, input.label, input.value, input.sortOrder],
		);

		return this.findAdminAttributeById(
			input.attributeId,
			input.adminAccess,
			input.transaction,
		);
	}

	private async findAdminSkus(
		productId: string,
		transaction: TransactionContext,
	): Promise<AdminProductSku[]> {
		const result = await getPgClient(transaction).query<AdminProductSkuRow>(
			`
        SELECT
          product_skus.site_id,
          product_skus.vertical_id,
          product_skus.brand_id,
          product_skus.id AS sku_id,
          product_skus.product_id,
          product_skus.sku_code,
          product_skus.title,
          product_skus.status,
          product_skus.attributes,
          product_skus.weight_gram,
          product_skus.length_mm,
          product_skus.width_mm,
          product_skus.height_mm,
          COALESCE(inventory_stats.available_qty, 0) AS available_qty,
          COALESCE(inventory_stats.locked_qty, 0) AS locked_qty,
          COALESCE(inventory_stats.physical_qty, 0) AS physical_qty,
          sku_prices.id AS price_id,
          sku_prices.currency,
          sku_prices.region_code,
          sku_prices.list_price::text,
          sku_prices.sale_price::text,
          product_skus.updated_at
        FROM product_skus
        LEFT JOIN LATERAL (
          SELECT
            SUM(sku_inventory.available_qty)::integer AS available_qty,
            SUM(sku_inventory.locked_qty)::integer AS locked_qty,
            SUM(sku_inventory.physical_qty)::integer AS physical_qty
          FROM sku_inventory
          WHERE sku_inventory.sku_id = product_skus.id
        ) inventory_stats ON TRUE
        LEFT JOIN sku_prices
          ON sku_prices.sku_id = product_skus.id
        WHERE product_skus.product_id = $1
        ORDER BY product_skus.created_at ASC, sku_prices.currency ASC NULLS LAST
      `,
			[productId],
		);
		const skuMap = new Map<string, AdminProductSku>();

		for (const row of result.rows) {
			const existing = skuMap.get(row.sku_id);
			const sku =
				existing ??
				({
					...dimensionFields(row),
					skuId: row.sku_id,
					productId: row.product_id,
					skuCode: row.sku_code,
					...(row.title ? { title: row.title } : {}),
					status: row.status,
					attributes: row.attributes,
					...(row.weight_gram !== null ? { weightGram: row.weight_gram } : {}),
					...(row.length_mm !== null ? { lengthMm: row.length_mm } : {}),
					...(row.width_mm !== null ? { widthMm: row.width_mm } : {}),
					...(row.height_mm !== null ? { heightMm: row.height_mm } : {}),
					availableQty: readQty(row.available_qty),
					lockedQty: readQty(row.locked_qty),
					physicalQty: readQty(row.physical_qty),
					prices: [],
					updatedAt: toIsoString(row.updated_at),
				} satisfies AdminProductSku);

			if (row.price_id && row.currency && row.list_price) {
				const price: AdminSkuPrice = {
					priceId: row.price_id,
					currency: row.currency,
					...(row.region_code ? { regionCode: row.region_code } : {}),
					listPrice: row.list_price,
					...(row.sale_price ? { salePrice: row.sale_price } : {}),
				};
				sku.prices.push(price);
			}

			skuMap.set(row.sku_id, sku);
		}

		return [...skuMap.values()];
	}

	private async findAdminProductMedia(
		productId: string,
		transaction: TransactionContext,
	): Promise<AdminProductMedia[]> {
		const result = await getPgClient(transaction).query<AdminProductMediaRow>(
			`
        SELECT
          id AS media_id,
          sku_id,
          media_type,
          url,
          alt_text,
          sort_order
        FROM product_media
        WHERE product_id = $1
        ORDER BY sort_order ASC, created_at ASC
      `,
			[productId],
		);

		return result.rows.map((row) => ({
			mediaId: row.media_id,
			...(row.sku_id ? { skuId: row.sku_id } : {}),
			mediaType: row.media_type,
			url: row.url,
			...(row.alt_text ? { altText: row.alt_text } : {}),
			sortOrder: row.sort_order,
		}));
	}

	private async findAdminProductAttributeValues(
		productId: string,
		transaction: TransactionContext,
	): Promise<ProductAttributeValue[]> {
		try {
			const result = await getPgClient(transaction).query<ProductAttributeValueRow>(
				`
          SELECT
            product_attribute_values.product_id,
            product_attribute_values.sku_id,
            vertical_attributes.id AS attribute_id,
            vertical_attributes.code,
            vertical_attributes.name,
            vertical_attributes.type,
            product_attribute_values.value
          FROM product_attribute_values
          JOIN vertical_attributes
            ON vertical_attributes.id = product_attribute_values.attribute_id
          WHERE product_attribute_values.product_id = $1
          ORDER BY vertical_attributes.sort_order ASC, product_attribute_values.created_at ASC
        `,
				[productId],
			);

			return result.rows.map(mapAttributeValue);
		} catch (error) {
			if (isMissingDynamicAttributeTable(error)) {
				return [];
			}

			throw error;
		}
	}

	private async findProductMutationSnapshotForUpdate(
		input: UpdateAdminProductStatusInput,
	): Promise<ProductMutationSnapshot | null> {
		const params: unknown[] = [input.productId];
		const accessPredicate = buildAdminAccessPredicate(
			input.adminAccess,
			"products",
			params,
		);
		const result = await getPgClient(input.transaction).query<ProductMutationRow>(
			`
        SELECT
          site_id,
          vertical_id,
          brand_id,
          id AS product_id,
          spu_code,
          status,
          updated_at
        FROM products
        WHERE id = $1
          AND ${accessPredicate}
        FOR UPDATE
      `,
			params,
		);
		const row = result.rows[0];

		return row ? mapProductMutation(row) : null;
	}

	private async findSkuMutationSnapshotForUpdate(
		input: Pick<UpdateAdminProductSkuInput, "adminAccess" | "skuId" | "transaction">,
	): Promise<ProductSkuMutationSnapshot | null> {
		const params: unknown[] = [input.skuId];
		const accessPredicate = buildAdminAccessPredicate(
			input.adminAccess,
			"products",
			params,
		);
		const result = await getPgClient(input.transaction).query<ProductSkuMutationRow>(
			`
        SELECT
          product_skus.site_id,
          product_skus.vertical_id,
          product_skus.brand_id,
          product_skus.id AS sku_id,
          product_skus.product_id,
          product_skus.sku_code,
          product_skus.title,
          product_skus.status,
          sku_prices.list_price::text,
          sku_prices.sale_price::text,
          sku_prices.currency,
          product_skus.updated_at
        FROM product_skus
        JOIN products
          ON products.id = product_skus.product_id
        LEFT JOIN LATERAL (
          SELECT list_price, sale_price, currency
          FROM sku_prices
          WHERE sku_prices.sku_id = product_skus.id
          ORDER BY
            CASE WHEN sku_prices.region_code IS NULL THEN 0 ELSE 1 END,
            sku_prices.created_at DESC
          LIMIT 1
        ) sku_prices ON TRUE
        WHERE product_skus.id = $1
          AND ${accessPredicate}
        FOR UPDATE OF product_skus
      `,
			params,
		);
		const row = result.rows[0];

		return row ? mapProductSkuMutation(row) : null;
	}

	private async upsertAdminSkuPrice(
		input: UpdateAdminProductSkuInput,
	): Promise<void> {
		if (!input.currency) {
			return;
		}

		const client = getPgClient(input.transaction);
		const currentPrice = await client.query<{
			id: string;
			list_price: string;
			sale_price: string | null;
		}>(
			`
        SELECT id, list_price::text, sale_price::text
        FROM sku_prices
        WHERE sku_id = $1
          AND currency = $2
          AND region_code IS NULL
        FOR UPDATE
      `,
			[input.skuId, input.currency],
		);
		const row = currentPrice.rows[0];
		const listPrice = input.listPrice ?? row?.list_price;

		if (!listPrice) {
			throw new Error("listPrice is required when creating a SKU price.");
		}

		if (row) {
			await client.query(
				`
          UPDATE sku_prices
          SET
            list_price = $2,
            sale_price = $3
          WHERE id = $1
        `,
				[
					row.id,
					listPrice,
					input.salePrice === undefined ? row.sale_price : input.salePrice,
				],
			);
			return;
		}

		const snapshot = await this.findSkuMutationSnapshotForUpdate(input);

		await client.query(
			`
        INSERT INTO sku_prices (
          sku_id,
          currency,
          list_price,
          sale_price,
          site_id,
          vertical_id,
          brand_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
			[
				input.skuId,
				input.currency,
				listPrice,
				input.salePrice ?? null,
				snapshot?.siteId ?? null,
				snapshot?.verticalId ?? null,
				snapshot?.brandId ?? null,
			],
		);
	}

	private async findCategoryMutationSnapshotForUpdate(
		input: UpdateAdminCategoryInput,
	): Promise<ProductCategoryMutationSnapshot | null> {
		const params: unknown[] = [input.categoryId];
		const accessPredicate = buildAdminAccessPredicate(
			input.adminAccess,
			"product_categories",
			params,
		);
		const result = await getPgClient(input.transaction).query<ProductCategoryMutationRow>(
			`
        SELECT
          site_id,
          vertical_id,
          brand_id,
          id AS category_id,
          slug,
          name,
          sort_order,
          is_active,
          updated_at
        FROM product_categories
        WHERE id = $1
          AND ${accessPredicate}
        FOR UPDATE
      `,
			params,
		);
		const row = result.rows[0];

		return row ? mapProductCategoryMutation(row) : null;
	}

	private async canAccessVertical(
		input: Pick<
			CreateAdminProductAttributeInput,
			"adminAccess" | "verticalId" | "transaction"
		>,
	): Promise<boolean> {
		if (hasGlobalAdminScope(input.adminAccess.scopes)) {
			const result = await getPgClient(input.transaction).query<{ exists: boolean }>(
				"SELECT EXISTS (SELECT 1 FROM verticals WHERE id = $1) AS exists",
				[input.verticalId],
			);

			return result.rows[0]?.exists ?? false;
		}

		const params: unknown[] = [input.verticalId];
		const clauses = input.adminAccess.scopes.flatMap((scope) => {
			if (!scope.scopeId) {
				return [];
			}

			const placeholder = appendParam(params, scope.scopeId);

			if (scope.scopeType === "vertical") {
				return [`verticals.id = ${placeholder}`];
			}

			if (scope.scopeType === "brand") {
				return [
					`EXISTS (
            SELECT 1
            FROM sites
            WHERE sites.vertical_id = verticals.id
              AND sites.brand_id = ${placeholder}
          )`,
				];
			}

			if (scope.scopeType === "site") {
				return [
					`EXISTS (
            SELECT 1
            FROM sites
            WHERE sites.vertical_id = verticals.id
              AND sites.id = ${placeholder}
          )`,
				];
			}

			return [];
		});
		const accessPredicate = clauses.length > 0 ? clauses.join(" OR ") : "FALSE";
		const result = await getPgClient(input.transaction).query<{ exists: boolean }>(
			`
        SELECT EXISTS (
          SELECT 1
          FROM verticals
          WHERE verticals.id = $1
            AND (${accessPredicate})
        ) AS exists
      `,
			params,
		);

		return result.rows[0]?.exists ?? false;
	}

	private async findAdminAttributeById(
		attributeId: string,
		adminAccess: AdminAccessContext,
		transaction: TransactionContext,
	): Promise<ProductAttributeDefinition | null> {
		const params: unknown[] = [attributeId];
		const accessPredicate = buildAttributeAccessPredicate(adminAccess, params);
		const result = await getPgClient(transaction).query<ProductAttributeDefinitionRow>(
			`
        SELECT
          vertical_attributes.id,
          vertical_attributes.vertical_id,
          vertical_attributes.code,
          vertical_attributes.name,
          vertical_attributes.type,
          vertical_attributes.required,
          vertical_attributes.searchable,
          vertical_attributes.filterable,
          vertical_attributes.sort_order,
          vertical_attributes.status,
          vertical_attribute_options.id AS option_id,
          vertical_attribute_options.label AS option_label,
          vertical_attribute_options.value AS option_value,
          vertical_attribute_options.sort_order AS option_sort_order
        FROM vertical_attributes
        LEFT JOIN vertical_attribute_options
          ON vertical_attribute_options.attribute_id = vertical_attributes.id
        WHERE vertical_attributes.id = $1
          AND ${accessPredicate}
        ORDER BY vertical_attribute_options.sort_order ASC NULLS LAST,
          vertical_attribute_options.created_at ASC NULLS LAST
      `,
			params,
		);
		const first = result.rows[0];

		if (!first) {
			return null;
		}

		const definition: ProductAttributeDefinition = {
			id: first.id,
			verticalId: first.vertical_id,
			code: first.code,
			name: first.name,
			type: first.type,
			required: first.required,
			searchable: first.searchable,
			filterable: first.filterable,
			sortOrder: first.sort_order,
			status: first.status,
			options: [],
		};

		for (const row of result.rows) {
			addAttributeOption(definition, row);
		}

		return definition;
	}

	private async findAttributeDefinitions(
		query: ProductAttributeQuery,
		predicate?: SqlPredicate,
	): Promise<ProductAttributeDefinition[]> {
		const scopedPredicate =
			predicate ??
			({
				sql: "vertical_attributes.vertical_id = $1",
				params: [query.verticalId ?? ""],
			} satisfies SqlPredicate);

		try {
			const result = await this.pool.getPool().query<ProductAttributeDefinitionRow>(
				`
          SELECT
            vertical_attributes.id,
            vertical_attributes.vertical_id,
            vertical_attributes.code,
            vertical_attributes.name,
            vertical_attributes.type,
            vertical_attributes.required,
            vertical_attributes.searchable,
            vertical_attributes.filterable,
            vertical_attributes.sort_order,
            vertical_attributes.status,
            vertical_attribute_options.id AS option_id,
            vertical_attribute_options.label AS option_label,
            vertical_attribute_options.value AS option_value,
            vertical_attribute_options.sort_order AS option_sort_order
          FROM vertical_attributes
          LEFT JOIN vertical_attribute_options
            ON vertical_attribute_options.attribute_id = vertical_attributes.id
          WHERE vertical_attributes.status = 'active'
            AND ${scopedPredicate.sql}
          ORDER BY
            vertical_attributes.sort_order ASC,
            vertical_attributes.created_at ASC,
            vertical_attribute_options.sort_order ASC NULLS LAST,
            vertical_attribute_options.created_at ASC NULLS LAST
        `,
				scopedPredicate.params,
			);

			return mapAttributeDefinitions(result.rows);
		} catch (error) {
			if (isMissingDynamicAttributeTable(error)) {
				return [];
			}

			throw error;
		}
	}

	private async findAttributeValuesForCatalog(
		site: SiteContext,
		rows: ProductCatalogRow[],
	): Promise<AttributeValueBuckets> {
		const productIds = [...new Set(rows.map((row) => row.product_id))];
		const skuIds = [...new Set(rows.map((row) => row.sku_id))];

		if (productIds.length === 0) {
			return bucketAttributeValues([]);
		}

		try {
			const result = await this.pool.getPool().query<ProductAttributeValueRow>(
				`
          SELECT
            product_attribute_values.product_id,
            product_attribute_values.sku_id,
            vertical_attributes.id AS attribute_id,
            vertical_attributes.code,
            vertical_attributes.name,
            vertical_attributes.type,
            product_attribute_values.value
          FROM product_attribute_values
          JOIN vertical_attributes
            ON vertical_attributes.id = product_attribute_values.attribute_id
           AND vertical_attributes.status = 'active'
          WHERE product_attribute_values.site_id = $1
            AND product_attribute_values.vertical_id = $2
            AND product_attribute_values.product_id = ANY($3::uuid[])
            AND (
              product_attribute_values.sku_id IS NULL
              OR product_attribute_values.sku_id = ANY($4::uuid[])
            )
          ORDER BY vertical_attributes.sort_order ASC, product_attribute_values.created_at ASC
        `,
				[site.siteId, site.verticalId, productIds, skuIds],
			);

			return bucketAttributeValues(result.rows);
		} catch (error) {
			if (isMissingDynamicAttributeTable(error)) {
				return bucketAttributeValues([]);
			}

			throw error;
		}
	}
}
