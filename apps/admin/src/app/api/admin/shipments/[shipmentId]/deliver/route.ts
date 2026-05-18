import { proxyAdminPost } from "@/lib/admin-api-proxy";

type RouteContext = {
	params: Promise<{ shipmentId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
	const { shipmentId } = await context.params;

	return proxyAdminPost(
		request,
		`/api/admin/shipments/${encodeURIComponent(shipmentId)}/deliver`,
	);
}
