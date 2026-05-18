import { proxyStorefrontApi } from "@/lib/server-api-proxy";

type CartItemRouteContext = {
	params: Promise<{
		skuId: string;
	}>;
};

export async function PATCH(
	request: Request,
	{ params }: CartItemRouteContext,
) {
	const { skuId } = await params;

	return proxyStorefrontApi(
		request,
		`/api/cart/items/${encodeURIComponent(skuId)}`,
		{
			method: "PATCH",
			body: await request.text(),
		},
	);
}

export async function DELETE(
	request: Request,
	{ params }: CartItemRouteContext,
) {
	const { skuId } = await params;

	return proxyStorefrontApi(
		request,
		`/api/cart/items/${encodeURIComponent(skuId)}`,
		{ method: "DELETE" },
	);
}
