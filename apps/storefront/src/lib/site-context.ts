export type StorefrontSiteContext = {
	siteId: string;
	siteCode: string;
	siteName: string;
	domain: string;
	verticalId: string;
	verticalCode: string;
	verticalName: string;
	brandId: string;
	brandCode: string;
	brandName: string;
	defaultLanguage: string;
	defaultCurrency: string;
	config: {
		theme: string;
		logoUrl?: string;
		primaryColor?: string;
		enabledLanguages: string[];
		enabledCurrencies: string[];
		paymentChannels: string[];
		shippingCountries: string[];
		seoTitle?: string;
		seoDescription?: string;
		seoKeywords: string[];
	};
};

export const defaultStorefrontSiteContext: StorefrontSiteContext = {
	siteId: "00000000-0000-4000-8000-000000000301",
	siteCode: "default-site",
	siteName: "Default Site",
	domain: "localhost",
	verticalId: "00000000-0000-4000-8000-000000000101",
	verticalCode: "default",
	verticalName: "Default Vertical",
	brandId: "00000000-0000-4000-8000-000000000201",
	brandCode: "default",
	brandName: "Default Brand",
	defaultLanguage: "en-US",
	defaultCurrency: "USD",
	config: {
		theme: "default",
		primaryColor: "#17221b",
		enabledLanguages: ["en-US"],
		enabledCurrencies: ["USD"],
		paymentChannels: [],
		shippingCountries: [],
		seoTitle: "NOVA TRADE | Cross-border commerce storefront",
		seoDescription:
			"A modern cross-border ecommerce storefront for premium lifestyle products, global payments, and fast international fulfillment.",
		seoKeywords: [],
	},
};

export function normalizeStorefrontHost(rawHost: string | null | undefined) {
	const fallbackHost = rawHost?.trim() || "localhost";
	const firstHost = fallbackHost.split(",")[0]?.trim() || "localhost";
	const withoutProtocol = firstHost.replace(/^https?:\/\//i, "");
	const hostOnly = withoutProtocol.split("/")[0]?.toLowerCase() || "localhost";

	if (hostOnly.startsWith("[") && hostOnly.includes("]")) {
		return hostOnly.slice(1, hostOnly.indexOf("]"));
	}

	return hostOnly.split(":")[0] || "localhost";
}

export function resolveStorefrontSiteFromHost(
	rawHost: string | null | undefined,
): StorefrontSiteContext {
	return {
		...defaultStorefrontSiteContext,
		domain: normalizeStorefrontHost(rawHost),
	};
}
