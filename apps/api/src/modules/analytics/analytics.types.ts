import type { DomainEventType } from "@cross-border/shared";
import type { SiteDimensions } from "../../common/site/site-context.js";

export type AnalyticsScopeType = "global" | "vertical" | "brand" | "site";

export type AnalyticsScope = {
	scopeType: AnalyticsScopeType;
	scopeKey: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
};

export type AnalyticsDomainEvent = Partial<SiteDimensions> & {
	id: string;
	eventType: DomainEventType;
	aggregateType: string;
	aggregateId: string;
	payload: Record<string, unknown>;
	createdAt: string;
};

export type OrderAnalyticsItem = {
	productId: string;
	skuId: string;
	quantity: number;
	totalAmount: string;
};

export type OrderAnalyticsSnapshot = SiteDimensions & {
	orderId: string;
	orderNo: string;
	userId?: string;
	guestToken?: string;
	currency: string;
	totalAmount: string;
	paidAt: string;
	createdAt: string;
	channelCode: string;
	items: OrderAnalyticsItem[];
};

export type AnalyticsEventRecord = SiteDimensions & {
	eventType: string;
	subjectType: string;
	subjectId: string;
	userId?: string;
	guestToken?: string;
	orderId?: string;
	productId?: string;
	skuId?: string;
	channelCode?: string;
	currency?: string;
	amount?: string;
	properties: Record<string, unknown>;
	idempotencyKey: string;
	occurredAt: string;
};

export type DailySalesDelta = AnalyticsScope & {
	statDate: string;
	currency: string;
	gmvAmount: string;
	netSalesAmount: string;
	orderCount: number;
	paidOrderCount: number;
};

export type ChannelPerformanceDelta = AnalyticsScope & {
	statDate: string;
	channelCode: string;
	currency: string;
	orderCount: number;
	gmvAmount: string;
	netSalesAmount: string;
};

export type ProductPerformanceDelta = AnalyticsScope & {
	statDate: string;
	productId: string;
	skuId: string;
	currency: string;
	unitsSold: number;
	orderCount: number;
	gmvAmount: string;
	netSalesAmount: string;
};

export type CustomerLtvDelta = AnalyticsScope & {
	customerIdentityType: "user" | "guest";
	customerIdentityKey: string;
	userId?: string;
	guestToken?: string;
	currency: string;
	orderedAt: string;
	orderCount: number;
	grossSalesAmount: string;
	netSalesAmount: string;
};

export type AnalyticsStatsQuery = {
	scopeType?: AnalyticsScopeType;
	scopeId?: string;
	from?: string;
	to?: string;
	currency?: string;
	limit?: number;
};

export type DailySalesStatsRow = Partial<SiteDimensions> & {
	statDate: string;
	scopeType: AnalyticsScopeType;
	scopeKey: string;
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

export type ChannelPerformanceStatsRow = Partial<SiteDimensions> & {
	statDate: string;
	scopeType: AnalyticsScopeType;
	scopeKey: string;
	channelCode: string;
	currency: string;
	orderCount: number;
	gmvAmount: string;
	netSalesAmount: string;
	refundAmount: string;
	chargebackAmount: string;
	adSpendAmount: string;
};

export type ProductPerformanceStatsRow = Partial<SiteDimensions> & {
	statDate: string;
	scopeType: AnalyticsScopeType;
	scopeKey: string;
	productId: string;
	skuId: string;
	currency: string;
	unitsSold: number;
	orderCount: number;
	gmvAmount: string;
	netSalesAmount: string;
	refundAmount: string;
};

export type CustomerLtvStatsRow = Partial<SiteDimensions> & {
	scopeType: AnalyticsScopeType;
	scopeKey: string;
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
