import { proxyAdminPost } from "@/lib/admin-api-proxy";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ refundId: string }> },
) {
	const { refundId } = await params;

	return proxyAdminPost(
		request,
		`/api/admin/payment-refunds/${encodeURIComponent(refundId)}/mark-succeeded`,
	);
}
