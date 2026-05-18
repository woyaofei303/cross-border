import type { Metadata } from "next";
import { CheckoutPage } from "@/components/CheckoutPage";
import { loadStorefrontCatalog } from "@/lib/server-catalog";
import { resolveCurrentSiteContext } from "@/lib/server-site-context";
import type { Currency } from "@/lib/products";
import { currencies } from "@/lib/products";

export async function generateMetadata(): Promise<Metadata> {
	const site = await resolveCurrentSiteContext();

	return {
		title: `Checkout | ${site.siteName}`,
		description: "Create a current-site order and demo payment order.",
	};
}

function getSupportedCurrency(currency: string): Currency {
	return currencies.includes(currency as Currency)
		? (currency as Currency)
		: "USD";
}

export default async function CheckoutRoutePage() {
	const site = await resolveCurrentSiteContext();
	const catalog = await loadStorefrontCatalog(site);
	const fallbackWarehouseId = process.env.NEXT_PUBLIC_DEFAULT_WAREHOUSE_ID;
	const warehouseOptions = catalog.products.flatMap((product) => {
		const warehouseId = product.warehouseId ?? fallbackWarehouseId;

		if (!product.skuId || !warehouseId) {
			return [];
		}

		return [
			{
				skuId: product.skuId,
				warehouseId,
			},
		];
	});

	return (
		<CheckoutPage
			site={site}
			currency={getSupportedCurrency(site.defaultCurrency)}
			warehouseOptions={warehouseOptions}
		/>
	);
}
