import {
	categories as defaultCategories,
	products as defaultProducts,
	type ProductAttributeDefinition,
	type Product,
} from "@/lib/products";
import type { StorefrontSiteContext } from "@/lib/site-context";

type StorefrontCatalog = {
	products: Product[];
	categories: string[];
	attributeDefinitions: ProductAttributeDefinition[];
};

type ProductCatalogApiResponse = StorefrontCatalog & {
	siteId: string;
	siteCode: string;
	currency: string;
};

function getApiBaseUrl(): string | undefined {
	return process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
}

function getDefaultCatalog(): StorefrontCatalog {
	return {
		products: defaultProducts,
		categories: defaultCategories,
		attributeDefinitions: [],
	};
}

async function fetchCatalogFromApi(
	site: StorefrontSiteContext,
): Promise<StorefrontCatalog | null> {
	const apiBaseUrl = getApiBaseUrl();

	if (!apiBaseUrl) {
		return null;
	}

	try {
		const url = new URL("/api/products", apiBaseUrl);
		url.searchParams.set("currency", site.defaultCurrency);

		const response = await fetch(url, {
			cache: "no-store",
			headers: {
				"x-site-domain": site.domain,
			},
		});

		if (!response.ok) {
			return null;
		}

		const catalog = (await response.json()) as ProductCatalogApiResponse;

		return {
			products: catalog.products,
			categories: catalog.categories.length > 0 ? catalog.categories : ["All"],
			attributeDefinitions: catalog.attributeDefinitions ?? [],
		};
	} catch {
		return null;
	}
}

export async function loadStorefrontCatalog(
	site: StorefrontSiteContext,
): Promise<StorefrontCatalog> {
	return (await fetchCatalogFromApi(site)) ?? getDefaultCatalog();
}
