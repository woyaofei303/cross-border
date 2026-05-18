import type { SiteDimensions } from "../site/site-context.js";

export type AdminScopeType = "global" | "vertical" | "brand" | "site";

export type AdminScope = {
	scopeType: AdminScopeType;
	scopeId?: string;
};

export type AdminAccessSource =
	| "database"
	| "fallback"
	| "database_unavailable";

export type AdminAccessContext = {
	source: AdminAccessSource;
	adminUserId?: string;
	scopes: AdminScope[];
};

export type AdminAccessAwareRequest = {
	headers: Record<string, string | string[] | undefined>;
};

export const globalAdminScope: AdminScope = {
	scopeType: "global",
};

export const fallbackGlobalAdminAccess: AdminAccessContext = {
	source: "fallback",
	scopes: [globalAdminScope],
};

export function hasGlobalAdminScope(scopes: readonly AdminScope[]): boolean {
	return scopes.some((scope) => scope.scopeType === "global");
}

export function canAccessSiteDimensions(
	scopes: readonly AdminScope[],
	dimensions: SiteDimensions,
): boolean {
	if (hasGlobalAdminScope(scopes)) {
		return true;
	}

	return scopes.some((scope) => {
		if (scope.scopeType === "site") {
			return scope.scopeId === dimensions.siteId;
		}

		if (scope.scopeType === "vertical") {
			return scope.scopeId === dimensions.verticalId;
		}

		if (scope.scopeType === "brand") {
			return scope.scopeId === dimensions.brandId;
		}

		return false;
	});
}
