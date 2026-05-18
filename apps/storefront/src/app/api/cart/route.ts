import { proxyStorefrontApi } from "@/lib/server-api-proxy";

export async function GET(request: Request) {
	return proxyStorefrontApi(request, "/api/cart");
}
