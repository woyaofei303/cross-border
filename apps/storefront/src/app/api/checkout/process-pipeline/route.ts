import { proxyStorefrontApi } from "@/lib/server-api-proxy";

export async function POST(request: Request) {
	return proxyStorefrontApi(request, "/api/admin/operations/process-pending-commerce", {
		method: "POST",
		body: await request.text(),
	});
}
