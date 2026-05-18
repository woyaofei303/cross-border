import { proxyStorefrontApi } from "@/lib/server-api-proxy";

export async function POST(request: Request) {
	return proxyStorefrontApi(request, "/api/cart/items", {
		method: "POST",
		body: await request.text(),
	});
}
