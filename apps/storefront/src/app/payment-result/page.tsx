import type { Metadata } from "next";
import { PaymentResultPage } from "@/components/PaymentResultPage";
import { resolveCurrentSiteContext } from "@/lib/server-site-context";

type PaymentResultRoutePageProps = {
	searchParams: Promise<{
		orderId?: string;
		paymentOrderId?: string;
	}>;
};

export async function generateMetadata(): Promise<Metadata> {
	const site = await resolveCurrentSiteContext();

	return {
		title: `Payment Result | ${site.siteName}`,
		description: "Read order and payment statuses from backend truth.",
	};
}

export default async function PaymentResultRoutePage({
	searchParams,
}: PaymentResultRoutePageProps) {
	const site = await resolveCurrentSiteContext();
	const params = await searchParams;

	return (
		<PaymentResultPage
			site={site}
			orderId={params.orderId}
			paymentOrderId={params.paymentOrderId}
		/>
	);
}
