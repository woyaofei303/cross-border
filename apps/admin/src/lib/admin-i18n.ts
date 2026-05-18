export const adminLocaleCookieName = "commerce_admin_locale";
export const adminLocaleStorageKey = "commerce.admin.locale";

export const adminLocales = [
	{
		code: "en-US",
		label: "English",
		shortLabel: "EN",
	},
	{
		code: "zh-CN",
		label: "简体中文",
		shortLabel: "中",
	},
] as const;

export type AdminLocale = (typeof adminLocales)[number]["code"];

export const defaultAdminLocale: AdminLocale = "en-US";

export function normalizeAdminLocale(
	value: string | null | undefined,
): AdminLocale {
	const raw = value?.trim().toLowerCase();

	if (!raw) {
		return defaultAdminLocale;
	}

	if (raw === "zh" || raw === "zh-cn" || raw.startsWith("zh-cn")) {
		return "zh-CN";
	}

	if (raw === "en" || raw === "en-us" || raw.startsWith("en")) {
		return "en-US";
	}

	return defaultAdminLocale;
}

export const adminMessages = {
	"en-US": {
		"actions.language": "Language",
		"brand.title": "Commerce OS",
		"brand.subtitle": "Unified Admin",
		"group.siteManagement": "Site Management",
		"group.commerce": "Commerce",
		"group.system": "System",
		"header.eyebrow": "Multi-site Operations",
		"header.scopeSuffix": "Scope",
		"header.titlePrefix": "Unified Admin",
		"label.active": "Active",
		"label.brand": "Brand",
		"label.code": "Code",
		"label.currencies": "Currencies",
		"label.default": "Default",
		"label.delivered": "Delivered",
		"label.description": "Description",
		"label.domain": "Domain",
		"label.fulfillmentStatus": "Fulfillment",
		"label.languages": "Languages",
		"label.logo": "Logo",
		"label.orders": "Orders",
		"label.paymentChannels": "Payment Channels",
		"label.paymentStatus": "Payment",
		"label.primary": "Primary",
		"label.ready": "Ready",
		"label.seo": "SEO",
		"label.shipped": "Shipped",
		"label.shippingCountries": "Shipping Countries",
		"label.site": "Site",
		"label.status": "Status",
		"label.theme": "Theme",
		"label.updated": "Updated",
		"label.vertical": "Vertical",
		"nav.afterSales": "After-sales",
		"nav.apiCatalog": "API Catalog",
		"nav.analytics": "Analytics",
		"nav.auditTrail": "Audit Trail",
		"nav.brands": "Brands",
		"nav.customers": "Customers",
		"nav.dashboard": "Dashboard",
		"nav.domains": "Domains",
		"nav.fulfillment": "Fulfillment",
		"nav.inventory": "Inventory",
		"nav.orders": "Orders",
		"nav.payments": "Payments",
		"nav.products": "Products",
		"nav.rbacScope": "RBAC Scope",
		"nav.riskOps": "Risk Ops",
		"nav.siteConfig": "Site Config",
		"nav.sites": "Sites",
		"nav.verticalAttributes": "Vertical Attributes",
		"nav.verticals": "Verticals",
		"page.brands.description":
			"Brand ownership and brand assets used by multi-site commerce operations.",
		"page.domains.description":
			"Domain to site mappings. Storefront requests must resolve site context from the domain.",
		"page.fulfillment.description":
			"Fulfillment queue derived from scoped orders and their payment and fulfillment statuses.",
		"page.siteConfig.description":
			"Per-site theme, locale, payment, shipping and SEO configuration.",
		"page.sites.description":
			"Sales sites bound to one vertical and one brand, with default locale and currency settings.",
		"page.verticals.description":
			"Vertical domains that drive catalog attributes, filters and operating models.",
		"scope.brand": "Brand",
		"scope.global": "Global",
		"scope.site": "Site",
		"scope.vertical": "Vertical",
		"search.placeholder": "Search sites, domains, brands",
		"search.srOnly": "Search admin records",
		"siteSwitcher.srOnly": "Site switcher",
	},
	"zh-CN": {
		"actions.language": "语言",
		"brand.title": "Commerce OS",
		"brand.subtitle": "统一后台",
		"group.siteManagement": "站点管理",
		"group.commerce": "交易运营",
		"group.system": "系统设置",
		"header.eyebrow": "多站点运营",
		"header.scopeSuffix": "数据范围",
		"header.titlePrefix": "统一后台",
		"label.active": "启用",
		"label.brand": "品牌",
		"label.code": "编码",
		"label.currencies": "币种",
		"label.default": "默认值",
		"label.delivered": "已签收",
		"label.description": "说明",
		"label.domain": "域名",
		"label.fulfillmentStatus": "履约",
		"label.languages": "语言",
		"label.logo": "Logo",
		"label.orders": "订单",
		"label.paymentChannels": "支付渠道",
		"label.paymentStatus": "支付",
		"label.primary": "主域名",
		"label.ready": "待发货",
		"label.seo": "SEO",
		"label.shipped": "已发货",
		"label.shippingCountries": "配送国家",
		"label.site": "站点",
		"label.status": "状态",
		"label.theme": "主题",
		"label.updated": "更新时间",
		"label.vertical": "垂类",
		"nav.afterSales": "售后管理",
		"nav.apiCatalog": "接口目录",
		"nav.analytics": "数据分析",
		"nav.auditTrail": "操作审计",
		"nav.brands": "品牌管理",
		"nav.customers": "客户管理",
		"nav.dashboard": "运营总览",
		"nav.domains": "域名管理",
		"nav.fulfillment": "履约发货",
		"nav.inventory": "库存管理",
		"nav.orders": "订单管理",
		"nav.payments": "支付记录",
		"nav.products": "商品管理",
		"nav.rbacScope": "权限范围",
		"nav.riskOps": "风险运营",
		"nav.siteConfig": "站点配置",
		"nav.sites": "站点管理",
		"nav.verticalAttributes": "垂类属性",
		"nav.verticals": "垂类管理",
		"page.brands.description": "多站点运营使用的品牌归属和品牌资产。",
		"page.domains.description":
			"域名到站点的映射。前台请求必须从域名解析站点上下文。",
		"page.fulfillment.description":
			"从授权范围内订单推导的履约队列，展示支付和履约状态。",
		"page.siteConfig.description": "每个站点的主题、语言、支付、配送和 SEO 配置。",
		"page.sites.description":
			"绑定到一个垂类和一个品牌的销售站点，包含默认语言和币种配置。",
		"page.verticals.description": "决定商品属性、筛选方式和运营模型的业务垂类。",
		"scope.brand": "品牌",
		"scope.global": "全局",
		"scope.site": "站点",
		"scope.vertical": "垂类",
		"search.placeholder": "搜索站点、域名、品牌",
		"search.srOnly": "搜索后台记录",
		"siteSwitcher.srOnly": "站点切换器",
	},
} as const;

export type AdminMessageKey = keyof (typeof adminMessages)["en-US"];

export function getAdminMessage(locale: AdminLocale, key: AdminMessageKey) {
	return adminMessages[locale][key] ?? adminMessages[defaultAdminLocale][key];
}

export function getAdminScopeMessageKey(
	scopeType: "global" | "vertical" | "brand" | "site",
): AdminMessageKey {
	return `scope.${scopeType}` as AdminMessageKey;
}
