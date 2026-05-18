import type { Metadata } from "next";
import { CartPage } from "@/components/CartPage";
import { resolveCurrentSiteContext } from "@/lib/server-site-context";
import type { Currency } from "@/lib/products";
import { currencies } from "@/lib/products";

export async function generateMetadata(): Promise<Metadata> {
	const site = await resolveCurrentSiteContext();

	return {
		title: `Cart | ${site.siteName}`,
		description: "Review current-site cart lines before checkout.",
	};
}

function getSupportedCurrency(currency: string): Currency {
	return currencies.includes(currency as Currency)
		? (currency as Currency)
		: "USD";
}

export default async function CartRoutePage() {
	const site = await resolveCurrentSiteContext();

	return <CartPage site={site} currency={getSupportedCurrency(site.defaultCurrency)} />;
}
