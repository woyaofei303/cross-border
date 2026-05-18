import { proxyAdminPost } from "@/lib/admin-api-proxy";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ categoryId: string }> },
) {
	const { categoryId } = await params;

	return proxyAdminPost(
		request,
		`/api/admin/categories/${encodeURIComponent(categoryId)}/update`,
	);
}
