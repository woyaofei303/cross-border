import type { Metadata } from "next";
import { OrderDetailPage } from "@/components/OrderDetailPage";
import { resolveCurrentSiteContext } from "@/lib/server-site-context";

type OrderDetailRoutePageProps = {
	params: Promise<{
		orderId: string;
	}>;
};

export async function generateMetadata({
	params,
}: OrderDetailRoutePageProps): Promise<Metadata> {
	const site = await resolveCurrentSiteContext();
	const { orderId } = await params;

	return {
		title: `Order ${orderId} | ${site.siteName}`,
		description: "Review current-site order detail and shipment status.",
	};
}

export default async function StorefrontOrderDetailRoutePage({
	params,
}: OrderDetailRoutePageProps) {
	const site = await resolveCurrentSiteContext();
	const { orderId } = await params;

	return <OrderDetailPage site={site} orderId={orderId} />;
}
