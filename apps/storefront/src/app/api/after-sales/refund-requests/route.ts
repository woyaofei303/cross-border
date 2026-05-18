import { proxyStorefrontApi } from "@/lib/server-api-proxy";

export async function POST(request: Request) {
	return proxyStorefrontApi(request, "/api/after-sales/refund-requests", {
		method: "POST",
		body: await request.text(),
	});
}
