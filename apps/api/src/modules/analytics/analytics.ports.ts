import type { TransactionContext } from "../../common/application/application-ports.js";
import type { AdminAccessContext } from "../../common/admin/admin-access.js";
import type {
	AnalyticsDomainEvent,
	AnalyticsEventRecord,
	AnalyticsStatsQuery,
	ChannelPerformanceDelta,
	ChannelPerformanceStatsRow,
	CustomerLtvDelta,
	CustomerLtvStatsRow,
	DailySalesDelta,
	DailySalesStatsRow,
	OrderAnalyticsSnapshot,
	ProductPerformanceDelta,
	ProductPerformanceStatsRow,
} from "./analytics.types.js";

export interface AnalyticsRepositoryPort {
	claimPendingOrderPaidEvents(input: {
		limit: number;
		transaction: TransactionContext;
	}): Promise<string[]>;

	getDomainEventForUpdate(
		eventId: string,
		transaction: TransactionContext,
	): Promise<AnalyticsDomainEvent | null>;

	getOrderAnalyticsSnapshot(
		input: {
			orderId: string;
			paymentOrderId: string;
		},
		transaction: TransactionContext,
	): Promise<OrderAnalyticsSnapshot>;

	appendAnalyticsEventIfNew(
		record: AnalyticsEventRecord,
		transaction: TransactionContext,
	): Promise<boolean>;

	markDomainEventProcessed(
		eventId: string,
		transaction: TransactionContext,
	): Promise<void>;

	markDomainEventFailed(
		input: {
			eventId: string;
			maxRetryCount: number;
			retryDelaySeconds: number;
		},
		transaction: TransactionContext,
	): Promise<void>;

	upsertDailySalesDelta(
		delta: DailySalesDelta,
		transaction: TransactionContext,
	): Promise<void>;

	upsertChannelPerformanceDelta(
		delta: ChannelPerformanceDelta,
		transaction: TransactionContext,
	): Promise<void>;

	upsertProductPerformanceDelta(
		delta: ProductPerformanceDelta,
		transaction: TransactionContext,
	): Promise<void>;

	upsertCustomerLtvDelta(
		delta: CustomerLtvDelta,
		transaction: TransactionContext,
	): Promise<void>;

	listDailySalesStats(
		query: AnalyticsStatsQuery,
		access: AdminAccessContext,
	): Promise<DailySalesStatsRow[]>;

	listChannelPerformanceStats(
		query: AnalyticsStatsQuery,
		access: AdminAccessContext,
	): Promise<ChannelPerformanceStatsRow[]>;

	listProductPerformanceStats(
		query: AnalyticsStatsQuery,
		access: AdminAccessContext,
	): Promise<ProductPerformanceStatsRow[]>;

	listCustomerLtvStats(
		query: AnalyticsStatsQuery,
		access: AdminAccessContext,
	): Promise<CustomerLtvStatsRow[]>;
}
