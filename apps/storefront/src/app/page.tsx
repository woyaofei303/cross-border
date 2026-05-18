import type { Metadata } from "next";
import { Storefront } from "@/components/Storefront";
import { loadStorefrontCatalog } from "@/lib/server-catalog";
import { resolveCurrentSiteContext } from "@/lib/server-site-context";

export async function generateMetadata(): Promise<Metadata> {
	const site = await resolveCurrentSiteContext();

	return {
		title:
			site.config.seoTitle ??
			`${site.siteName} | Cross-border commerce storefront`,
		description: site.config.seoDescription,
		keywords: site.config.seoKeywords,
	};
}

export default async function Home() {
	const site = await resolveCurrentSiteContext();
	const catalog = await loadStorefrontCatalog(site);

	return (
		<Storefront
			site={site}
			productCatalog={catalog.products}
			categoryCatalog={catalog.categories}
			attributeDefinitions={catalog.attributeDefinitions}
		/>
	);
}
