import { proxyAdminPost } from "@/lib/admin-api-proxy";

export async function POST(request: Request) {
	return proxyAdminPost(request, "/api/admin/operations/process-pending-commerce");
}
