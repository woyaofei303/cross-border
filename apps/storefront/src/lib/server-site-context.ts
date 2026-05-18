import { headers } from "next/headers";
import {
	normalizeStorefrontHost,
	resolveStorefrontSiteFromHost,
	type StorefrontSiteContext,
} from "@/lib/site-context";

type ApiCurrentSiteResponse = StorefrontSiteContext & {
	resolvedFrom: "database" | "default";
};

function getApiBaseUrl(): string | undefined {
	return process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
}

async function fetchSiteContextFromApi(
	domain: string,
): Promise<StorefrontSiteContext | null> {
	const apiBaseUrl = getApiBaseUrl();

	if (!apiBaseUrl) {
		return null;
	}

	try {
		const response = await fetch(new URL("/api/site/current", apiBaseUrl), {
			cache: "no-store",
			headers: {
				"x-site-domain": domain,
			},
		});

		if (!response.ok) {
			return null;
		}

		const site = (await response.json()) as ApiCurrentSiteResponse;

		return site;
	} catch {
		return null;
	}
}

export async function resolveCurrentSiteContext(): Promise<StorefrontSiteContext> {
	const requestHeaders = await headers();
	const domain = normalizeStorefrontHost(
		requestHeaders.get("x-site-domain") ??
			requestHeaders.get("x-forwarded-host") ??
			requestHeaders.get("host"),
	);
	const apiSite = await fetchSiteContextFromApi(domain);

	return apiSite ?? resolveStorefrontSiteFromHost(domain);
}
