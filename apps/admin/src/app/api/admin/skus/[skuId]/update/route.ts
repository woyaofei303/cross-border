import { proxyAdminPost } from "@/lib/admin-api-proxy";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ skuId: string }> },
) {
	const { skuId } = await params;

	return proxyAdminPost(
		request,
		`/api/admin/skus/${encodeURIComponent(skuId)}/update`,
	);
}
