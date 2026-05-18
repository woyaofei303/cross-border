import type { Metadata } from "next";
import { ProductDiscovery } from "@/components/ProductDiscovery";
import { loadStorefrontCatalog } from "@/lib/server-catalog";
import { resolveCurrentSiteContext } from "@/lib/server-site-context";

type ProductsPageProps = {
	searchParams: Promise<{
		category?: string | string[];
	}>;
};

export async function generateMetadata(): Promise<Metadata> {
	const site = await resolveCurrentSiteContext();

	return {
		title: `${site.siteName} Products | Cross-border commerce storefront`,
		description:
			site.config.seoDescription ??
			`Browse the current-site product catalog for ${site.siteName}.`,
	};
}

function normalizeQueryValue(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
	const site = await resolveCurrentSiteContext();
	const catalog = await loadStorefrontCatalog(site);
	const params = await searchParams;

	return (
		<ProductDiscovery
			site={site}
			productCatalog={catalog.products}
			categoryCatalog={catalog.categories}
			attributeDefinitions={catalog.attributeDefinitions}
			initialCategory={normalizeQueryValue(params.category)}
		/>
	);
}
