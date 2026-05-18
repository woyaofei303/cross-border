import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/ProductDetail";
import { findProductByRouteId } from "@/lib/commerce";
import { loadStorefrontCatalog } from "@/lib/server-catalog";
import { resolveCurrentSiteContext } from "@/lib/server-site-context";

type ProductPageProps = {
	params: Promise<{
		productId: string;
	}>;
};

export async function generateMetadata({
	params,
}: ProductPageProps): Promise<Metadata> {
	const site = await resolveCurrentSiteContext();
	const catalog = await loadStorefrontCatalog(site);
	const { productId } = await params;
	const product = findProductByRouteId(catalog.products, productId);

	if (!product) {
		return {
			title: "Product not found",
		};
	}

	return {
		title: `${product.name} | ${site.siteName}`,
		description: product.description,
	};
}

export default async function ProductPage({ params }: ProductPageProps) {
	const site = await resolveCurrentSiteContext();
	const catalog = await loadStorefrontCatalog(site);
	const { productId } = await params;
	const product = findProductByRouteId(catalog.products, productId);

	if (!product) {
		notFound();
	}

	const relatedProducts = catalog.products
		.filter((item) => item.id !== product.id && item.category === product.category)
		.slice(0, 3);

	return (
		<ProductDetail
			site={site}
			product={product}
			relatedProducts={relatedProducts}
			attributeDefinitions={catalog.attributeDefinitions}
		/>
	);
}
