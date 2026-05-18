import type {
	AdminScopeType,
	AdminSite,
	AnalyticsScopeType,
} from "@/lib/admin-sites";

export function normalizeDashboardScopeType(
	value: string | string[] | undefined,
): AdminScopeType {
	const raw = Array.isArray(value) ? value[0] : value;

	if (
		raw === "global" ||
		raw === "vertical" ||
		raw === "brand" ||
		raw === "site"
	) {
		return raw;
	}

	return "global";
}

export function selectedDashboardScopeIdForSite(
	scopeType: AdminScopeType,
	site: AdminSite,
) {
	if (scopeType === "site") {
		return site.siteId;
	}

	if (scopeType === "vertical") {
		return site.verticalId;
	}

	if (scopeType === "brand") {
		return site.brandId;
	}

	return undefined;
}

export function buildAdminAnalyticsPath(input: {
	scopeType: AdminScopeType;
	scopeId?: string;
	siteId?: string;
}) {
	const params = new URLSearchParams();
	params.set("scopeType", input.scopeType);

	if (input.scopeId) {
		params.set("scopeId", input.scopeId);
	}

	if (input.siteId) {
		params.set("siteId", input.siteId);
	}

	return `/analytics?${params.toString()}`;
}

export function buildAdminOperationsPath(input: {
	scopeType: AdminScopeType;
	scopeId?: string;
	siteId?: string;
}) {
	const params = new URLSearchParams();
	params.set("scopeType", input.scopeType);

	if (input.scopeId) {
		params.set("scopeId", input.scopeId);
	}

	if (input.siteId) {
		params.set("siteId", input.siteId);
	}

	return `/operations?${params.toString()}`;
}

function scopeKeyForSite(scopeType: AnalyticsScopeType, site: AdminSite) {
	if (scopeType === "global") {
		return "global";
	}

	if (scopeType === "vertical") {
		return site.verticalId;
	}

	if (scopeType === "brand") {
		return site.brandId;
	}

	return site.siteId;
}

export function filterAnalyticsRows<T extends { scopeType: string; scopeKey: string }>(
	rows: T[],
	scopeType: AnalyticsScopeType,
	site: AdminSite,
) {
	const scopeKey = scopeKeyForSite(scopeType, site);

	return rows.filter(
		(row) => row.scopeType === scopeType && row.scopeKey === scopeKey,
	);
}

export function filterDimensionRows<
	T extends { siteId?: string; verticalId?: string; brandId?: string },
>(rows: T[], scopeType: AdminScopeType, site: AdminSite) {
	if (scopeType === "global") {
		return rows;
	}

	if (scopeType === "vertical") {
		return rows.filter((row) => row.verticalId === site.verticalId);
	}

	if (scopeType === "brand") {
		return rows.filter((row) => row.brandId === site.brandId);
	}

	return rows.filter((row) => row.siteId === site.siteId);
}

export function formatDashboardMoney(value: string | undefined, currency = "USD") {
	const amount = Number(value ?? "0");

	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
	}).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDashboardDate(value: string | undefined) {
	return value ? value.slice(0, 16).replace("T", " ") : "-";
}

export function sumMoney<T>(rows: T[], key: keyof T) {
	return rows.reduce((sum, row) => {
		const amount = Number(row[key] ?? "0");

		return sum + (Number.isFinite(amount) ? amount : 0);
	}, 0);
}
