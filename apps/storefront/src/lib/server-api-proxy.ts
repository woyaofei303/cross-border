import { NextResponse } from "next/server";
import { normalizeStorefrontHost } from "@/lib/site-context";

export function getStorefrontApiBaseUrl(): string | undefined {
	return process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
}

export function getRequestSiteDomain(request: Request) {
	return normalizeStorefrontHost(
		request.headers.get("x-site-domain") ??
			request.headers.get("x-forwarded-host") ??
			request.headers.get("host"),
	);
}

export async function proxyStorefrontApi(
	request: Request,
	pathname: string,
	init: RequestInit = {},
) {
	const apiBaseUrl = getStorefrontApiBaseUrl();

	if (!apiBaseUrl) {
		return NextResponse.json(
			{
				code: "STOREFRONT_API_UNAVAILABLE",
				message: "API_BASE_URL is required for cart operations.",
			},
			{ status: 503 },
		);
	}

	const url = new URL(pathname, apiBaseUrl);
	const sourceUrl = new URL(request.url);

	for (const [key, value] of sourceUrl.searchParams) {
		url.searchParams.append(key, value);
	}

	const response = await fetch(url, {
		...init,
		cache: "no-store",
		headers: {
			"content-type": "application/json",
			"x-site-domain": getRequestSiteDomain(request),
			...init.headers,
		},
	});
	const payload = await response.json().catch(() => ({}));

	return NextResponse.json(payload, { status: response.status });
}
