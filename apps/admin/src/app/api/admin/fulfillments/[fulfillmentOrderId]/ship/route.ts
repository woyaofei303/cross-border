import { proxyAdminPost } from "@/lib/admin-api-proxy";

type RouteContext = {
	params: Promise<{ fulfillmentOrderId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
	const { fulfillmentOrderId } = await context.params;

	return proxyAdminPost(
		request,
		`/api/admin/fulfillments/${encodeURIComponent(fulfillmentOrderId)}/ship`,
	);
}
