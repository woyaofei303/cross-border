export type SiteStatus = "active" | "inactive" | "archived";

export type AdminSiteConfig = {
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

export type AdminSite = {
	siteId: string;
	siteCode: string;
	siteName: string;
	domain: string;
	defaultDomain: string;
	verticalId: string;
	verticalCode: string;
	verticalName: string;
	brandId: string;
	brandCode: string;
	brandName: string;
	defaultLanguage: string;
	defaultCurrency: string;
	status: SiteStatus;
	config: AdminSiteConfig;
};

export type AdminVertical = {
	id: string;
	code: string;
	name: string;
	description?: string;
	status: SiteStatus;
};

export type AdminBrand = {
	id: string;
	code: string;
	name: string;
	logoUrl?: string;
	status: SiteStatus;
};

export type AdminScopeType = "global" | "vertical" | "brand" | "site";
export type AnalyticsScopeType = AdminScopeType;

export type AdminScope = {
	scopeType: AdminScopeType;
	scopeId?: string;
};

export type AdminAccessContext = {
	source: "database" | "fallback" | "database_unavailable";
	adminUserId?: string;
	scopes: AdminScope[];
};

export type ProductAttributeType =
	| "text"
	| "number"
	| "boolean"
	| "select"
	| "multiselect"
	| "json";

export type AdminProductAttributeOption = {
	id: string;
	label: string;
	value: string;
	sortOrder: number;
};

export type AdminProductAttribute = {
	id: string;
	verticalId: string;
	code: string;
	name: string;
	type: ProductAttributeType;
	required: boolean;
	searchable: boolean;
	filterable: boolean;
	sortOrder: number;
	status: SiteStatus;
	options: AdminProductAttributeOption[];
};

export type AdminSiteManagementData = {
	sites: AdminSite[];
	verticals: AdminVertical[];
	brands: AdminBrand[];
	access: AdminAccessContext;
	productAttributes: AdminProductAttribute[];
	analytics: AdminAnalyticsData;
	operations: AdminOperationsData;
};

export type DailySalesStat = {
	statDate: string;
	scopeType: AnalyticsScopeType;
	scopeKey: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	currency: string;
	gmvAmount: string;
	netSalesAmount: string;
	refundAmount: string;
	chargebackAmount: string;
	orderCount: number;
	paidOrderCount: number;
	refundedOrderCount: number;
	chargebackCount: number;
};

export type ChannelPerformanceStat = {
	statDate: string;
	scopeType: AnalyticsScopeType;
	scopeKey: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	channelCode: string;
	currency: string;
	orderCount: number;
	gmvAmount: string;
	netSalesAmount: string;
	refundAmount: string;
	chargebackAmount: string;
	adSpendAmount: string;
};

export type ProductPerformanceStat = {
	statDate: string;
	scopeType: AnalyticsScopeType;
	scopeKey: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	productId: string;
	skuId: string;
	currency: string;
	unitsSold: number;
	orderCount: number;
	gmvAmount: string;
	netSalesAmount: string;
	refundAmount: string;
};

export type CustomerLtvStat = {
	scopeType: AnalyticsScopeType;
	scopeKey: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	customerIdentityType: "user" | "guest";
	customerIdentityKey: string;
	userId?: string;
	guestToken?: string;
	currency: string;
	firstOrderAt: string;
	lastOrderAt: string;
	orderCount: number;
	grossSalesAmount: string;
	netSalesAmount: string;
	refundAmount: string;
};

export type AdminAnalyticsData = {
	dailySales: DailySalesStat[];
	channelPerformance: ChannelPerformanceStat[];
	productPerformance: ProductPerformanceStat[];
	customerLtv: CustomerLtvStat[];
};

export type AnalyticsProjectionStatus =
	| "processed"
	| "already_processed"
	| "ignored"
	| "failed";

export type ProjectAnalyticsEventResponse = {
	status: AnalyticsProjectionStatus;
	reason?: string;
	errorMessage?: string;
};

export type ProcessPendingAnalyticsEventResult = ProjectAnalyticsEventResponse & {
	eventId: string;
};

export type ProcessPendingAnalyticsEventsResponse = {
	claimed: number;
	processed: number;
	alreadyProcessed: number;
	ignored: number;
	failed: number;
	results: ProcessPendingAnalyticsEventResult[];
};

export type CommercePipelineResultItem = {
	id: string;
	status: string;
	reason?: string;
	errorMessage?: string;
};

export type CommercePipelineBatchResult = {
	claimed: number;
	processed: number;
	skipped: number;
	alreadyProcessed: number;
	failed: number;
	results: CommercePipelineResultItem[];
};

export type CommercePipelineAnalyticsBatchResult = {
	claimed: number;
	processed: number;
	alreadyProcessed: number;
	ignored: number;
	failed: number;
	results: CommercePipelineResultItem[];
};

export type ProcessCommercePipelineResponse = {
	paymentWebhooks: CommercePipelineBatchResult;
	paymentSucceededEvents: CommercePipelineBatchResult;
	analyticsEvents: CommercePipelineAnalyticsBatchResult;
};

export type OperationsOrderRiskRow = {
	id: string;
	orderNo: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	orderStatus: string;
	paymentStatus: string;
	fulfillmentStatus: string;
	aftersalesStatus: string;
	currency: string;
	totalAmount: string;
	paymentNo?: string;
	paymentOrderStatus?: string;
	paymentChannelCode?: string;
	itemCount: number;
	statusLogCount: number;
	createdAt: string;
	updatedAt: string;
	paidAt?: string;
	cancelledAt?: string;
};

export type OperationsPaymentWebhookRow = {
	id: string;
	paymentOrderId?: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	channelCode: string;
	providerEventId: string;
	eventType: string;
	providerObjectId?: string;
	status: string;
	errorMessage?: string;
	receivedAt: string;
	processedAt?: string;
};

export type OperationsInventoryLockRow = {
	id: string;
	orderId: string;
	orderItemId: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	skuId: string;
	warehouseId: string;
	quantity: number;
	status: string;
	expiresAt: string;
	releasedAt?: string;
	deductedAt?: string;
	createdAt: string;
};

export type OperationsInventoryTransactionRow = {
	id: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	skuId: string;
	warehouseId: string;
	orderId?: string;
	type: string;
	quantity: number;
	beforeAvailable: number;
	afterAvailable: number;
	beforeLocked: number;
	afterLocked: number;
	beforePhysical: number;
	afterPhysical: number;
	idempotencyKey: string;
	createdAt: string;
};

export type OperationsAfterSalesRequestRow = {
	id: string;
	requestNo: string;
	orderId: string;
	orderNo?: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	type: string;
	status: string;
	reason: string;
	requestedAmount?: string;
	approvedAmount?: string;
	createdAt: string;
	updatedAt: string;
};

export type OperationsPaymentRefundRow = {
	id: string;
	refundNo: string;
	requestId?: string;
	requestNo?: string;
	paymentOrderId: string;
	orderId: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	status: string;
	amount: string;
	currency: string;
	providerRefundId?: string;
	createdAt: string;
	updatedAt: string;
	succeededAt?: string;
	failedAt?: string;
};

export type OperationsAuditLogRow = {
	id: string;
	source: "audit" | "admin_operation";
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	actorType: "user" | "admin" | "system";
	actorId?: string;
	action: string;
	resourceType: string;
	resourceId?: string;
	ipAddress?: string;
	requestId?: string;
	createdAt: string;
};

export type AdminOperationsData = {
	orders: OperationsOrderRiskRow[];
	paymentWebhooks: OperationsPaymentWebhookRow[];
	inventoryLocks: OperationsInventoryLockRow[];
	inventoryTransactions: OperationsInventoryTransactionRow[];
	afterSalesRequests: OperationsAfterSalesRequestRow[];
	paymentRefunds: OperationsPaymentRefundRow[];
	auditLogs: OperationsAuditLogRow[];
};

type AdminSitesApiResponse = {
	sites: AdminSite[];
};

type AdminVerticalsApiResponse = {
	verticals: AdminVertical[];
};

type AdminBrandsApiResponse = {
	brands: AdminBrand[];
};

type AdminAccessContextApiResponse = AdminAccessContext;

type AdminProductAttributesApiResponse = {
	attributes: AdminProductAttribute[];
};

type DailySalesStatsApiResponse = {
	items: DailySalesStat[];
};

type ChannelPerformanceStatsApiResponse = {
	items: ChannelPerformanceStat[];
};

type ProductPerformanceStatsApiResponse = {
	items: ProductPerformanceStat[];
};

type CustomerLtvStatsApiResponse = {
	items: CustomerLtvStat[];
};

type OperationsRiskDashboardApiResponse = AdminOperationsData;

export const defaultAdminSiteData: AdminSiteManagementData = {
	sites: [
		{
			siteId: "00000000-0000-4000-8000-000000000301",
			siteCode: "default-site",
			siteName: "Default Site",
			domain: "localhost",
			defaultDomain: "localhost",
			verticalId: "00000000-0000-4000-8000-000000000101",
			verticalCode: "default",
			verticalName: "Default Vertical",
			brandId: "00000000-0000-4000-8000-000000000201",
			brandCode: "default",
			brandName: "Default Brand",
			defaultLanguage: "en-US",
			defaultCurrency: "USD",
			status: "active",
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
		},
	],
	verticals: [
		{
			id: "00000000-0000-4000-8000-000000000101",
			code: "default",
			name: "Default Vertical",
			description: "Default vertical for migrated single-site commerce data.",
			status: "active",
		},
	],
	brands: [
		{
			id: "00000000-0000-4000-8000-000000000201",
			code: "default",
			name: "Default Brand",
			status: "active",
		},
	],
	access: {
		source: "fallback",
		scopes: [{ scopeType: "global" }],
	},
	productAttributes: [
		{
			id: "00000000-0000-4000-8000-000000000101:origin",
			verticalId: "00000000-0000-4000-8000-000000000101",
			code: "origin",
			name: "Origin",
			type: "text",
			required: false,
			searchable: true,
			filterable: true,
			sortOrder: 10,
			status: "active",
			options: [],
		},
		{
			id: "00000000-0000-4000-8000-000000000101:badge",
			verticalId: "00000000-0000-4000-8000-000000000101",
			code: "badge",
			name: "Merchandising Badge",
			type: "text",
			required: false,
			searchable: false,
			filterable: true,
			sortOrder: 20,
			status: "active",
			options: [],
		},
		{
			id: "00000000-0000-4000-8000-000000000101:ships_in",
			verticalId: "00000000-0000-4000-8000-000000000101",
			code: "ships_in",
			name: "Dispatch Promise",
			type: "text",
			required: false,
			searchable: false,
			filterable: true,
			sortOrder: 30,
			status: "active",
			options: [],
		},
	],
	analytics: {
		dailySales: [],
		channelPerformance: [],
		productPerformance: [],
		customerLtv: [],
	},
	operations: {
		orders: [],
		paymentWebhooks: [],
		inventoryLocks: [],
		inventoryTransactions: [],
		afterSalesRequests: [],
		paymentRefunds: [],
		auditLogs: [],
	},
};

export function getAdminApiBaseUrl(): string | undefined {
	return process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;
}

async function fetchJson<T>(apiBaseUrl: string, pathname: string): Promise<T> {
	const response = await fetch(new URL(pathname, apiBaseUrl), {
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`Admin API request failed: ${pathname}`);
	}

	return (await response.json()) as T;
}

export async function loadSiteManagementData(): Promise<AdminSiteManagementData> {
	const apiBaseUrl = getAdminApiBaseUrl();

	if (!apiBaseUrl) {
		return defaultAdminSiteData;
	}

	try {
		const [
			sitesResponse,
			verticalsResponse,
			brandsResponse,
			accessResponse,
			attributesResponse,
			dailySalesResponse,
			channelPerformanceResponse,
			productPerformanceResponse,
			customerLtvResponse,
			operationsResponse,
		] = await Promise.all([
				fetchJson<AdminSitesApiResponse>(apiBaseUrl, "/api/admin/sites"),
				fetchJson<AdminVerticalsApiResponse>(
					apiBaseUrl,
					"/api/admin/verticals",
				),
				fetchJson<AdminBrandsApiResponse>(apiBaseUrl, "/api/admin/brands"),
				fetchJson<AdminAccessContextApiResponse>(
					apiBaseUrl,
					"/api/admin/access-context",
				),
				fetchJson<AdminProductAttributesApiResponse>(
					apiBaseUrl,
					"/api/admin/product-attributes",
				),
				fetchJson<DailySalesStatsApiResponse>(
					apiBaseUrl,
					"/api/admin/analytics/daily-sales?limit=100",
				),
				fetchJson<ChannelPerformanceStatsApiResponse>(
					apiBaseUrl,
					"/api/admin/analytics/channel-performance?limit=100",
				),
				fetchJson<ProductPerformanceStatsApiResponse>(
					apiBaseUrl,
					"/api/admin/analytics/product-performance?limit=100",
				),
				fetchJson<CustomerLtvStatsApiResponse>(
					apiBaseUrl,
					"/api/admin/analytics/customer-ltv?limit=100",
				),
				fetchJson<OperationsRiskDashboardApiResponse>(
					apiBaseUrl,
					"/api/admin/operations/risk-dashboard?limit=50",
				),
			]);

		return {
			sites:
				sitesResponse.sites.length > 0
					? sitesResponse.sites
					: defaultAdminSiteData.sites,
			verticals:
				verticalsResponse.verticals.length > 0
					? verticalsResponse.verticals
					: defaultAdminSiteData.verticals,
			brands:
				brandsResponse.brands.length > 0
					? brandsResponse.brands
					: defaultAdminSiteData.brands,
			access: accessResponse,
			productAttributes:
				attributesResponse.attributes.length > 0
					? attributesResponse.attributes
					: defaultAdminSiteData.productAttributes,
			analytics: {
				dailySales: dailySalesResponse.items,
				channelPerformance: channelPerformanceResponse.items,
				productPerformance: productPerformanceResponse.items,
				customerLtv: customerLtvResponse.items,
			},
			operations: operationsResponse,
		};
	} catch {
		return defaultAdminSiteData;
	}
}

export function countSitesByStatus(sites: AdminSite[], status: SiteStatus) {
	return sites.filter((site) => site.status === status).length;
}

export function findSelectedSite(sites: AdminSite[], selectedSiteId: string) {
	return (
		sites.find((site) => site.siteId === selectedSiteId) ??
		sites[0] ??
		defaultAdminSiteData.sites[0]
	);
}

export function canSelectAdminScope(
	scopes: AdminScope[],
	scopeType: AdminScopeType,
) {
	return (
		scopes.some((scope) => scope.scopeType === "global") ||
		scopes.some((scope) => scope.scopeType === scopeType)
	);
}

export function getAdminScopeDisplayName(scopeType: AdminScopeType) {
	if (scopeType === "global") {
		return "Global";
	}

	if (scopeType === "vertical") {
		return "Vertical";
	}

	if (scopeType === "brand") {
		return "Brand";
	}

	return "Site";
}
