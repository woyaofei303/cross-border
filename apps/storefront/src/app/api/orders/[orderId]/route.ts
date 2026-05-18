import { proxyStorefrontApi } from "@/lib/server-api-proxy";

type OrderDetailRouteContext = {
	params: Promise<{
		orderId: string;
	}>;
};

export async function GET(request: Request, { params }: OrderDetailRouteContext) {
	const { orderId } = await params;

	return proxyStorefrontApi(
		request,
		`/api/orders/${encodeURIComponent(orderId)}`,
	);
}
