import { Injectable } from "@nestjs/common";
import type { AdminAccessContext } from "../../common/admin/admin-access.js";
import type { SiteContext } from "../../common/site/site-context.js";
import {
	createDefaultProductAttributeDefinitions,
	createDefaultProductCatalog,
} from "./default-catalog.js";
import { PgProductRepository } from "./repositories/pg-product.repository.js";
import type {
	ProductAttributeDefinition,
	ProductAttributeQuery,
	ProductCatalog,
	ProductCatalogQuery,
} from "./product.types.js";

function isDatabaseUnavailable(error: unknown): error is Error {
	return (
		error instanceof Error &&
		error.message.includes("DATABASE_URL is required")
	);
}

@Injectable()
export class ProductCatalogService {
	constructor(private readonly products: PgProductRepository) {}

	async listCatalogForSite(
		site: SiteContext,
		query: ProductCatalogQuery = {},
	): Promise<ProductCatalog> {
		const currency = query.currency ?? site.defaultCurrency;

		try {
			const catalog = await this.products.findCatalogForSite(site, {
				...query,
				currency,
			});

			return catalog.products.length > 0
				? catalog
				: createDefaultProductCatalog(site, currency);
		} catch (error) {
			if (isDatabaseUnavailable(error)) {
				return createDefaultProductCatalog(site, currency);
			}

			throw error;
		}
	}

	async listAttributesForSite(
		site: SiteContext,
	): Promise<ProductAttributeDefinition[]> {
		try {
			const attributes = await this.products.findAttributesForSite(site);

			return attributes.length > 0
				? attributes
				: createDefaultProductAttributeDefinitions(site);
		} catch (error) {
			if (isDatabaseUnavailable(error)) {
				return createDefaultProductAttributeDefinitions(site);
			}

			throw error;
		}
	}

	async listAttributesForAdmin(
		access: AdminAccessContext,
		query: ProductAttributeQuery = {},
	): Promise<ProductAttributeDefinition[]> {
		try {
			return this.products.findAttributesForAdmin(access.scopes, query);
		} catch (error) {
			if (isDatabaseUnavailable(error)) {
				return [];
			}

			throw error;
		}
	}
}
