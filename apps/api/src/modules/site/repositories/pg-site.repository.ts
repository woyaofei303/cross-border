import { Injectable } from "@nestjs/common";
import {
	type AdminScope,
	globalAdminScope,
	hasGlobalAdminScope,
} from "../../../common/admin/admin-access.js";
import type { SiteContext } from "../../../common/site/site-context.js";
import { PgPoolService } from "../../database/pg/pg-pool.service.js";
import type {
	BrandAdminSummary,
	SiteAdminSummary,
	SiteStatus,
	VerticalAdminSummary,
} from "../site.service.js";

type SiteRow = {
	site_id: string;
	site_code: string;
	site_name: string;
	domain: string;
	vertical_id: string;
	vertical_code: string;
	vertical_name: string;
	brand_id: string;
	brand_code: string;
	brand_name: string;
	default_language: string;
	default_currency: string;
	theme: string | null;
	logo_url: string | null;
	primary_color: string | null;
	enabled_languages: string[] | null;
	enabled_currencies: string[] | null;
	payment_channels: string[] | null;
	shipping_countries: string[] | null;
	seo_title: string | null;
	seo_description: string | null;
	seo_keywords: string[] | null;
	default_domain?: string;
	site_status?: SiteStatus;
	created_at?: Date;
	updated_at?: Date;
};

function mapSite(row: SiteRow): SiteContext {
	return {
		siteId: row.site_id,
		siteCode: row.site_code,
		siteName: row.site_name,
		domain: row.domain,
		verticalId: row.vertical_id,
		verticalCode: row.vertical_code,
		verticalName: row.vertical_name,
		brandId: row.brand_id,
		brandCode: row.brand_code,
		brandName: row.brand_name,
		defaultLanguage: row.default_language,
		defaultCurrency: row.default_currency,
		config: {
			theme: row.theme ?? "default",
			...(row.logo_url ? { logoUrl: row.logo_url } : {}),
			...(row.primary_color ? { primaryColor: row.primary_color } : {}),
			enabledLanguages: row.enabled_languages ?? [row.default_language],
			enabledCurrencies: row.enabled_currencies ?? [row.default_currency],
			paymentChannels: row.payment_channels ?? [],
			shippingCountries: row.shipping_countries ?? [],
			...(row.seo_title ? { seoTitle: row.seo_title } : {}),
			...(row.seo_description ? { seoDescription: row.seo_description } : {}),
			seoKeywords: row.seo_keywords ?? [],
		},
	};
}

function mapAdminSite(row: SiteRow): SiteAdminSummary {
	return {
		...mapSite(row),
		defaultDomain: row.default_domain ?? row.domain,
		status: row.site_status ?? "active",
		...(row.created_at ? { createdAt: row.created_at.toISOString() } : {}),
		...(row.updated_at ? { updatedAt: row.updated_at.toISOString() } : {}),
	};
}

type VerticalRow = {
	id: string;
	code: string;
	name: string;
	description: string | null;
	status: SiteStatus;
};

function mapVertical(row: VerticalRow): VerticalAdminSummary {
	return {
		id: row.id,
		code: row.code,
		name: row.name,
		...(row.description ? { description: row.description } : {}),
		status: row.status,
	};
}

type BrandRow = {
	id: string;
	code: string;
	name: string;
	logo_url: string | null;
	status: SiteStatus;
};

function mapBrand(row: BrandRow): BrandAdminSummary {
	return {
		id: row.id,
		code: row.code,
		name: row.name,
		...(row.logo_url ? { logoUrl: row.logo_url } : {}),
		status: row.status,
	};
}

type SqlPredicate = {
	sql: string;
	params: string[];
};

function appendPredicateParam(
	params: string[],
	startIndex: number,
	value: string,
): string {
	params.push(value);

	return `$${startIndex + params.length - 1}`;
}

function normalizeScopes(scopes: readonly AdminScope[] | undefined): AdminScope[] {
	return scopes === undefined ? [globalAdminScope] : [...scopes];
}

function buildScopedSitePredicate(
	scopes: readonly AdminScope[] | undefined,
	siteAlias: string,
	startIndex = 1,
): SqlPredicate {
	const normalizedScopes = normalizeScopes(scopes);

	if (hasGlobalAdminScope(normalizedScopes)) {
		return {
			sql: "TRUE",
			params: [],
		};
	}

	const params: string[] = [];
	const clauses = normalizedScopes.flatMap((scope) => {
		if (!scope.scopeId) {
			return [];
		}

		const placeholder = appendPredicateParam(params, startIndex, scope.scopeId);

		if (scope.scopeType === "site") {
			return [`${siteAlias}.id = ${placeholder}`];
		}

		if (scope.scopeType === "vertical") {
			return [`${siteAlias}.vertical_id = ${placeholder}`];
		}

		if (scope.scopeType === "brand") {
			return [`${siteAlias}.brand_id = ${placeholder}`];
		}

		return [];
	});

	return {
		sql: clauses.length > 0 ? `(${clauses.join(" OR ")})` : "FALSE",
		params,
	};
}

function buildScopedVerticalPredicate(
	scopes: readonly AdminScope[] | undefined,
	startIndex = 1,
): SqlPredicate {
	const normalizedScopes = normalizeScopes(scopes);

	if (hasGlobalAdminScope(normalizedScopes)) {
		return {
			sql: "TRUE",
			params: [],
		};
	}

	const params: string[] = [];
	const clauses = normalizedScopes.flatMap((scope) => {
		if (!scope.scopeId) {
			return [];
		}

		const placeholder = appendPredicateParam(params, startIndex, scope.scopeId);

		if (scope.scopeType === "vertical") {
			return [`verticals.id = ${placeholder}`];
		}

		if (scope.scopeType === "brand") {
			return [
				`EXISTS (
          SELECT 1
          FROM sites scoped_sites
          WHERE scoped_sites.vertical_id = verticals.id
            AND scoped_sites.brand_id = ${placeholder}
        )`,
			];
		}

		if (scope.scopeType === "site") {
			return [
				`EXISTS (
          SELECT 1
          FROM sites scoped_sites
          WHERE scoped_sites.vertical_id = verticals.id
            AND scoped_sites.id = ${placeholder}
        )`,
			];
		}

		return [];
	});

	return {
		sql: clauses.length > 0 ? `(${clauses.join(" OR ")})` : "FALSE",
		params,
	};
}

function buildScopedBrandPredicate(
	scopes: readonly AdminScope[] | undefined,
	startIndex = 1,
): SqlPredicate {
	const normalizedScopes = normalizeScopes(scopes);

	if (hasGlobalAdminScope(normalizedScopes)) {
		return {
			sql: "TRUE",
			params: [],
		};
	}

	const params: string[] = [];
	const clauses = normalizedScopes.flatMap((scope) => {
		if (!scope.scopeId) {
			return [];
		}

		const placeholder = appendPredicateParam(params, startIndex, scope.scopeId);

		if (scope.scopeType === "brand") {
			return [`brands.id = ${placeholder}`];
		}

		if (scope.scopeType === "vertical") {
			return [
				`EXISTS (
          SELECT 1
          FROM sites scoped_sites
          WHERE scoped_sites.brand_id = brands.id
            AND scoped_sites.vertical_id = ${placeholder}
        )`,
			];
		}

		if (scope.scopeType === "site") {
			return [
				`EXISTS (
          SELECT 1
          FROM sites scoped_sites
          WHERE scoped_sites.brand_id = brands.id
            AND scoped_sites.id = ${placeholder}
        )`,
			];
		}

		return [];
	});

	return {
		sql: clauses.length > 0 ? `(${clauses.join(" OR ")})` : "FALSE",
		params,
	};
}

@Injectable()
export class PgSiteRepository {
	constructor(private readonly pool: PgPoolService) {}

	async findActiveByDomain(domain: string): Promise<SiteContext | null> {
		const result = await this.pool.getPool().query<SiteRow>(
			`
        SELECT
          sites.id AS site_id,
          sites.code AS site_code,
          sites.name AS site_name,
          COALESCE(site_domains.domain, sites.default_domain) AS domain,
          verticals.id AS vertical_id,
          verticals.code AS vertical_code,
          verticals.name AS vertical_name,
          brands.id AS brand_id,
          brands.code AS brand_code,
          brands.name AS brand_name,
          sites.default_language,
          sites.default_currency,
          site_configs.theme,
          site_configs.logo_url,
          site_configs.primary_color,
          site_configs.enabled_languages,
          site_configs.enabled_currencies,
          site_configs.payment_channels,
          site_configs.shipping_countries,
          site_configs.seo_title,
          site_configs.seo_description,
          site_configs.seo_keywords
        FROM sites
        JOIN verticals ON verticals.id = sites.vertical_id
        JOIN brands ON brands.id = sites.brand_id
        LEFT JOIN site_domains
          ON site_domains.site_id = sites.id
         AND site_domains.domain = $1
         AND site_domains.status = 'active'
        LEFT JOIN site_configs ON site_configs.site_id = sites.id
        WHERE sites.status = 'active'
          AND verticals.status = 'active'
          AND brands.status = 'active'
          AND (
            sites.default_domain = $1
            OR site_domains.domain = $1
          )
        ORDER BY site_domains.is_primary DESC NULLS LAST
        LIMIT 1
      `,
			[domain],
		);
		const row = result.rows[0];

		return row ? mapSite(row) : null;
	}

	async findSitesForAdmin(
		scopes?: readonly AdminScope[],
	): Promise<SiteAdminSummary[]> {
		const scopePredicate = buildScopedSitePredicate(scopes, "sites");
		const result = await this.pool.getPool().query<SiteRow>(
			`
        SELECT
          sites.id AS site_id,
          sites.code AS site_code,
          sites.name AS site_name,
          COALESCE(primary_domains.domain, sites.default_domain) AS domain,
          sites.default_domain,
          sites.status AS site_status,
          sites.created_at,
          sites.updated_at,
          verticals.id AS vertical_id,
          verticals.code AS vertical_code,
          verticals.name AS vertical_name,
          brands.id AS brand_id,
          brands.code AS brand_code,
          brands.name AS brand_name,
          sites.default_language,
          sites.default_currency,
          site_configs.theme,
          site_configs.logo_url,
          site_configs.primary_color,
          site_configs.enabled_languages,
          site_configs.enabled_currencies,
          site_configs.payment_channels,
          site_configs.shipping_countries,
          site_configs.seo_title,
          site_configs.seo_description,
          site_configs.seo_keywords
        FROM sites
        JOIN verticals ON verticals.id = sites.vertical_id
        JOIN brands ON brands.id = sites.brand_id
        LEFT JOIN LATERAL (
          SELECT site_domains.domain
          FROM site_domains
          WHERE site_domains.site_id = sites.id
            AND site_domains.status = 'active'
          ORDER BY site_domains.is_primary DESC, site_domains.created_at ASC
          LIMIT 1
        ) primary_domains ON TRUE
        LEFT JOIN site_configs ON site_configs.site_id = sites.id
        WHERE ${scopePredicate.sql}
        ORDER BY sites.created_at ASC
      `,
			scopePredicate.params,
		);

		return result.rows.map(mapAdminSite);
	}

	async findVerticalsForAdmin(
		scopes?: readonly AdminScope[],
	): Promise<VerticalAdminSummary[]> {
		const scopePredicate = buildScopedVerticalPredicate(scopes);
		const result = await this.pool.getPool().query<VerticalRow>(
			`
        SELECT id, code, name, description, status
        FROM verticals
        WHERE ${scopePredicate.sql}
        ORDER BY created_at ASC
      `,
			scopePredicate.params,
		);

		return result.rows.map(mapVertical);
	}

	async findBrandsForAdmin(
		scopes?: readonly AdminScope[],
	): Promise<BrandAdminSummary[]> {
		const scopePredicate = buildScopedBrandPredicate(scopes);
		const result = await this.pool.getPool().query<BrandRow>(
			`
        SELECT id, code, name, logo_url, status
        FROM brands
        WHERE ${scopePredicate.sql}
        ORDER BY created_at ASC
      `,
			scopePredicate.params,
		);

		return result.rows.map(mapBrand);
	}
}
