import { proxyStorefrontApi } from "@/lib/server-api-proxy";

type SiteCustomerRouteContext = {
	params: Promise<{
		siteCustomerId: string;
	}>;
};

export async function GET(
	request: Request,
	context: SiteCustomerRouteContext,
) {
	const { siteCustomerId } = await context.params;

	return proxyStorefrontApi(
		request,
		`/api/customers/site-customers/${encodeURIComponent(siteCustomerId)}`,
	);
}
