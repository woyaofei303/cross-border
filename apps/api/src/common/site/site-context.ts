export type SiteContext = {
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

export type SiteDimensions = {
	siteId: string;
	verticalId: string;
	brandId: string;
};

export type SiteResolutionResult =
	| {
			status: "resolved";
			domain: string;
			resolvedFrom: "database" | "default";
			site: SiteContext;
	  }
	| {
			status: "unresolved";
			domain: string;
			reason: "domain_not_found" | "lookup_failed";
			errorMessage?: string;
	  };

export type SiteAwareRequest = {
	headers: Record<string, string | string[] | undefined>;
	siteResolution?: SiteResolutionResult;
};

export const defaultSiteContext: SiteContext = {
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
		seoTitle: "Default Site",
		seoDescription:
			"Default site migrated from the original single-site storefront.",
		seoKeywords: [],
	},
};

export function readHeaderValue(
	value: string | string[] | undefined,
): string | undefined {
	if (Array.isArray(value)) {
		return value[0];
	}

	return value;
}

export function normalizeSiteDomain(rawHost: string | undefined): string {
	const fallbackHost = rawHost?.trim() || "localhost";
	const firstHost = fallbackHost.split(",")[0]?.trim() || "localhost";
	const withoutProtocol = firstHost.replace(/^https?:\/\//i, "");
	const hostOnly = withoutProtocol.split("/")[0]?.toLowerCase() || "localhost";

	if (hostOnly.startsWith("[") && hostOnly.includes("]")) {
		return hostOnly.slice(1, hostOnly.indexOf("]"));
	}

	return hostOnly.split(":")[0] || "localhost";
}

export function isLocalDevelopmentDomain(domain: string): boolean {
	return ["localhost", "127.0.0.1", "::1", "0.0.0.0"].includes(domain);
}

export function defaultSiteForDomain(domain: string): SiteContext {
	return {
		...defaultSiteContext,
		domain,
	};
}

export function getResolvedSiteFromRequest(
	request: SiteAwareRequest,
): SiteContext | null {
	if (!request.siteResolution) {
		return defaultSiteContext;
	}

	if (request.siteResolution.status === "resolved") {
		return request.siteResolution.site;
	}

	return null;
}

export function getSiteDimensions(site: SiteContext): SiteDimensions {
	return {
		siteId: site.siteId,
		verticalId: site.verticalId,
		brandId: site.brandId,
	};
}
