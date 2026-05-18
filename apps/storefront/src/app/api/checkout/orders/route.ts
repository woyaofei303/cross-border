import { proxyStorefrontApi } from "@/lib/server-api-proxy";

export async function POST(request: Request) {
	return proxyStorefrontApi(request, "/api/orders", {
		method: "POST",
		body: await request.text(),
	});
}
