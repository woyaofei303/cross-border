import { proxyAdminPost } from "@/lib/admin-api-proxy";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ attributeId: string }> },
) {
	const { attributeId } = await params;

	return proxyAdminPost(
		request,
		`/api/admin/product-attributes/${encodeURIComponent(attributeId)}/update`,
	);
}
