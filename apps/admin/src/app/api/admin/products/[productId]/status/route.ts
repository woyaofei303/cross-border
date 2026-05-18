import { proxyAdminPost } from "@/lib/admin-api-proxy";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ productId: string }> },
) {
	const { productId } = await params;

	return proxyAdminPost(
		request,
		`/api/admin/products/${encodeURIComponent(productId)}/status`,
	);
}
