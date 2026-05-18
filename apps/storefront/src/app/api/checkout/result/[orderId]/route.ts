import { proxyStorefrontApi } from "@/lib/server-api-proxy";

type CheckoutResultRouteContext = {
	params: Promise<{
		orderId: string;
	}>;
};

export async function GET(
	request: Request,
	{ params }: CheckoutResultRouteContext,
) {
	const { orderId } = await params;

	return proxyStorefrontApi(
		request,
		`/api/orders/${encodeURIComponent(orderId)}/checkout-result`,
	);
}
