export const adminWorkTabsStorageKey = "commerce.admin.workTabs";

export type AdminWorkTab = {
	key: string;
	pathname: string;
	query: string;
	title: string;
	closable: boolean;
	lastActiveAt: number;
};

export function buildAdminWorkTabKey(pathname: string, query = "") {
	void query;
	return pathname;
}

export function tabPath(tab: Pick<AdminWorkTab, "pathname" | "query">) {
	return tab.query ? `${tab.pathname}?${tab.query}` : tab.pathname;
}

export function shortenRouteId(value: string | undefined) {
	if (!value) {
		return "";
	}

	return value.length > 12 ? value.slice(0, 12) : value;
}

export function getAdminWorkTabTitle(input: {
	pathname: string;
	locale: "en-US" | "zh-CN";
	fallbackTitle?: string;
}) {
	const { pathname, locale, fallbackTitle } = input;
	const zh = locale === "zh-CN";
	const segments = pathname.split("/").filter(Boolean);
	const route = `/${segments[0] ?? ""}`;
	const id = shortenRouteId(segments[1]);

	if (pathname === "/") {
		return zh ? "运营总览" : "Dashboard";
	}

	if (route === "/orders" && id) {
		return zh ? `订单详情 / ${id}` : `Order Detail / ${id}`;
	}

	if (route === "/products" && id) {
		return zh ? `商品详情 / ${id}` : `Product Detail / ${id}`;
	}

	if (route === "/after-sales" && id) {
		return zh ? `售后详情 / ${id}` : `After-sales Detail / ${id}`;
	}

	const routeTitles: Record<string, { en: string; zh: string }> = {
		"/after-sales": { en: "After-sales", zh: "售后管理" },
		"/api-catalog": { en: "API Catalog", zh: "接口目录" },
		"/analytics": { en: "Analytics", zh: "数据分析" },
		"/audit": { en: "Audit Trail", zh: "操作审计" },
		"/brands": { en: "Brands", zh: "品牌管理" },
		"/customers": { en: "Customers", zh: "客户管理" },
		"/domains": { en: "Domains", zh: "域名管理" },
		"/fulfillment": { en: "Fulfillment", zh: "履约发货" },
		"/inventory": { en: "Inventory", zh: "库存管理" },
		"/operations": { en: "Risk Ops", zh: "风险运营" },
		"/orders": { en: "Orders", zh: "订单管理" },
		"/payments": { en: "Payments", zh: "支付记录" },
		"/product-attributes": { en: "Vertical Attributes", zh: "垂类属性" },
		"/products": { en: "Products", zh: "商品管理" },
		"/rbac": { en: "RBAC Scope", zh: "权限范围" },
		"/site-config": { en: "Site Config", zh: "站点配置" },
		"/sites": { en: "Sites", zh: "站点管理" },
		"/verticals": { en: "Verticals", zh: "垂类管理" },
	};
	const routeTitle = routeTitles[pathname] ?? routeTitles[route];

	if (routeTitle) {
		return zh ? routeTitle.zh : routeTitle.en;
	}

	return fallbackTitle ?? (zh ? "后台页面" : "Admin Page");
}

export function createAdminWorkTab(input: {
	pathname: string;
	query?: string;
	title: string;
	now?: number;
}): AdminWorkTab {
	const query = input.query ?? "";
	const key = buildAdminWorkTabKey(input.pathname, query);

	return {
		key,
		pathname: input.pathname,
		query,
		title: input.title,
		closable: input.pathname !== "/",
		lastActiveAt: input.now ?? Date.now(),
	};
}

export function defaultAdminWorkTabs(now = Date.now()): AdminWorkTab[] {
	return [
		createAdminWorkTab({
			pathname: "/",
			title: "Dashboard",
			now,
		}),
	];
}

export function normalizeAdminWorkTabs(
	value: unknown,
	now = Date.now(),
): AdminWorkTab[] {
	if (!Array.isArray(value)) {
		return defaultAdminWorkTabs(now);
	}

	const tabsByKey = new Map<string, AdminWorkTab>();
	const orderedKeys: string[] = [];
	const tabs = value
		.filter((item): item is Partial<AdminWorkTab> => {
			return Boolean(item && typeof item === "object");
		})
		.flatMap((item) => {
			if (typeof item.pathname !== "string" || !item.pathname.startsWith("/")) {
				return [];
			}

			const query = typeof item.query === "string" ? item.query : "";
			const title =
				typeof item.title === "string" && item.title.trim()
					? item.title
					: "Admin Page";

			return [
				{
					key: buildAdminWorkTabKey(item.pathname, query),
					pathname: item.pathname,
					query,
					title,
					closable: item.pathname === "/" ? false : item.closable !== false,
					lastActiveAt:
						typeof item.lastActiveAt === "number" ? item.lastActiveAt : now,
				},
			];
		});
	for (const tab of tabs) {
		const current = tabsByKey.get(tab.key);

		if (!current) {
			orderedKeys.push(tab.key);
		}

		if (!current || tab.lastActiveAt >= current.lastActiveAt) {
			tabsByKey.set(tab.key, tab);
		}
	}
	const normalizedTabs = orderedKeys
		.map((key) => tabsByKey.get(key))
		.filter((tab): tab is AdminWorkTab => Boolean(tab));
	const dashboard = normalizedTabs.find((tab) => tab.pathname === "/");
	const otherTabs = normalizedTabs.filter((tab) => tab.pathname !== "/");

	if (!dashboard) {
		return [...defaultAdminWorkTabs(now), ...otherTabs];
	}

	return [{ ...dashboard, closable: false }, ...otherTabs];
}

export function upsertAdminWorkTab(
	tabs: AdminWorkTab[],
	nextTab: AdminWorkTab,
	limit = 12,
) {
	const hasExistingTab = tabs.some((tab) => tab.key === nextTab.key);
	const merged = hasExistingTab
		? tabs.map((tab) => (tab.key === nextTab.key ? nextTab : tab))
		: [...tabs, nextTab];
	const dashboard = merged.find((tab) => tab.pathname === "/");
	const orderedOtherTabs = merged.filter((tab) => tab.pathname !== "/");
	const overflowCount = Math.max(0, orderedOtherTabs.length - limit + 1);
	const removableKeys = new Set(
		[...orderedOtherTabs]
			.sort((first, second) => first.lastActiveAt - second.lastActiveAt)
			.slice(0, overflowCount)
			.map((tab) => tab.key),
	);
	const otherTabs = orderedOtherTabs.filter((tab) => !removableKeys.has(tab.key));

	return [...(dashboard ? [{ ...dashboard, closable: false }] : []), ...otherTabs];
}

export function closeAdminWorkTab(
	tabs: AdminWorkTab[],
	targetKey: string,
	activeKey: string,
) {
	const target = tabs.find((tab) => tab.key === targetKey);

	if (!target || target.closable === false) {
		return {
			tabs,
			nextActiveKey: activeKey,
		};
	}

	const remaining = tabs.filter((tab) => tab.key !== targetKey);
	const nextActive =
		targetKey === activeKey
			? [...remaining].sort(
					(first, second) => second.lastActiveAt - first.lastActiveAt,
				)[0]
			: remaining.find((tab) => tab.key === activeKey);

	return {
		tabs: remaining,
		nextActiveKey: nextActive?.key ?? remaining[0]?.key ?? "/",
	};
}
