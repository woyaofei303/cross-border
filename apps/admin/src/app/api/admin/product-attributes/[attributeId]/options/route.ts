import { proxyAdminPost } from "@/lib/admin-api-proxy";

type RouteContext = {
	params: Promise<{ attributeId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
	const { attributeId } = await context.params;

	return proxyAdminPost(
		request,
		`/api/admin/product-attributes/${attributeId}/options`,
	);
}
