import { proxyStorefrontApi } from "@/lib/server-api-proxy";

export async function POST(request: Request) {
	return proxyStorefrontApi(request, "/api/customers/site-customers", {
		method: "POST",
		body: await request.text(),
	});
}
