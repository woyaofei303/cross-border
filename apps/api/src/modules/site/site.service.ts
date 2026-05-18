import { Injectable } from "@nestjs/common";
import type { AdminAccessContext } from "../../common/admin/admin-access.js";
import {
	defaultSiteContext,
	defaultSiteForDomain,
	isLocalDevelopmentDomain,
	normalizeSiteDomain,
	type SiteContext,
	type SiteResolutionResult,
} from "../../common/site/site-context.js";
import { PgSiteRepository } from "./repositories/pg-site.repository.js";

export type SiteStatus = "active" | "inactive" | "archived";

export type SiteAdminSummary = SiteContext & {
	defaultDomain: string;
	status: SiteStatus;
	createdAt?: string;
	updatedAt?: string;
};

export type VerticalAdminSummary = {
	id: string;
	code: string;
	name: string;
	description?: string;
	status: SiteStatus;
};

export type BrandAdminSummary = {
	id: string;
	code: string;
	name: string;
	logoUrl?: string;
	status: SiteStatus;
};

export type ResolveSiteForRequestInput = {
	host?: string | undefined;
	forwardedHost?: string | undefined;
	siteDomain?: string | undefined;
};

function isDatabaseUnavailable(error: unknown): error is Error {
	return (
		error instanceof Error &&
		error.message.includes("DATABASE_URL is required")
	);
}

function shouldUseDefaultAdminCatalog(
	access: AdminAccessContext | undefined,
): boolean {
	return !access || access.source !== "database";
}

@Injectable()
export class SiteResolverService {
	constructor(private readonly sites: PgSiteRepository) {}

	async listAdminSites(
		access?: AdminAccessContext,
	): Promise<SiteAdminSummary[]> {
		try {
			const sites = await this.sites.findSitesForAdmin(access?.scopes);

			return sites.length > 0 || !shouldUseDefaultAdminCatalog(access)
				? sites
				: [this.getDefaultAdminSite()];
		} catch (error) {
			if (isDatabaseUnavailable(error)) {
				return [this.getDefaultAdminSite()];
			}

			throw error;
		}
	}

	async listAdminVerticals(
		access?: AdminAccessContext,
	): Promise<VerticalAdminSummary[]> {
		try {
			const verticals = await this.sites.findVerticalsForAdmin(access?.scopes);

			return verticals.length > 0 || !shouldUseDefaultAdminCatalog(access)
				? verticals
				: [this.getDefaultVertical()];
		} catch (error) {
			if (isDatabaseUnavailable(error)) {
				return [this.getDefaultVertical()];
			}

			throw error;
		}
	}

	async listAdminBrands(
		access?: AdminAccessContext,
	): Promise<BrandAdminSummary[]> {
		try {
			const brands = await this.sites.findBrandsForAdmin(access?.scopes);

			return brands.length > 0 || !shouldUseDefaultAdminCatalog(access)
				? brands
				: [this.getDefaultBrand()];
		} catch (error) {
			if (isDatabaseUnavailable(error)) {
				return [this.getDefaultBrand()];
			}

			throw error;
		}
	}

	async resolveForRequest(
		input: ResolveSiteForRequestInput,
	): Promise<SiteResolutionResult> {
		const domain = normalizeSiteDomain(
			input.siteDomain ?? input.forwardedHost ?? input.host,
		);

		if (isLocalDevelopmentDomain(domain)) {
			return {
				status: "resolved",
				domain,
				resolvedFrom: "default",
				site: defaultSiteForDomain(domain),
			};
		}

		try {
			const site = await this.sites.findActiveByDomain(domain);

			if (site) {
				return {
					status: "resolved",
					domain,
					resolvedFrom: "database",
					site,
				};
			}

			return {
				status: "unresolved",
				domain,
				reason: "domain_not_found",
			};
		} catch (error) {
			if (isDatabaseUnavailable(error)) {
				return {
					status: "unresolved",
					domain,
					reason: "lookup_failed",
					errorMessage: error.message,
				};
			}

			throw error;
		}
	}

	private getDefaultAdminSite(): SiteAdminSummary {
		return {
			...defaultSiteContext,
			defaultDomain: defaultSiteContext.domain,
			status: "active",
		};
	}

	private getDefaultVertical(): VerticalAdminSummary {
		return {
			id: defaultSiteContext.verticalId,
			code: defaultSiteContext.verticalCode,
			name: defaultSiteContext.verticalName,
			description: "Default vertical for migrated single-site commerce data.",
			status: "active",
		};
	}

	private getDefaultBrand(): BrandAdminSummary {
		return {
			id: defaultSiteContext.brandId,
			code: defaultSiteContext.brandCode,
			name: defaultSiteContext.brandName,
			status: "active",
		};
	}
}
