import { proxyAdminPost } from "@/lib/admin-api-proxy";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ requestId: string }> },
) {
	const { requestId } = await params;

	return proxyAdminPost(
		request,
		`/api/admin/after-sales/${encodeURIComponent(requestId)}/approve-refund`,
	);
}
