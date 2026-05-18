import type { Metadata } from "next";
import { OrdersPage } from "@/components/OrdersPage";
import { resolveCurrentSiteContext } from "@/lib/server-site-context";

export async function generateMetadata(): Promise<Metadata> {
	const site = await resolveCurrentSiteContext();

	return {
		title: `My Orders | ${site.siteName}`,
		description: "Review current-site order history and status dimensions.",
	};
}

export default async function StorefrontOrdersRoutePage() {
	const site = await resolveCurrentSiteContext();

	return <OrdersPage site={site} />;
}
