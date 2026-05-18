import { describe, expect, it } from "vitest";
import {
	NoopTransactionManager,
	type EventProcessLogPort,
	type TransactionContext,
} from "../../common/application/application-ports.js";
import { defaultSiteContext } from "../../common/site/site-context.js";
import type { AnalyticsRepositoryPort } from "./analytics.ports.js";
import { AnalyticsProjectionService } from "./analytics.service.js";
import type {
	AnalyticsDomainEvent,
	AnalyticsEventRecord,
	ChannelPerformanceDelta,
	CustomerLtvDelta,
	DailySalesDelta,
	OrderAnalyticsSnapshot,
	ProductPerformanceDelta,
} from "./analytics.types.js";
import { ProjectOrderPaidAnalyticsUseCase } from "./analytics.use-cases.js";
import { ProcessPendingAnalyticsEventsUseCase } from "./analytics.use-cases.js";

class MemoryEventProcessLog implements EventProcessLogPort {
	status: "started" | "already_processed" = "started";
	processed = false;
	failed: string | null = null;

	async tryStartProcessing(): Promise<"started" | "already_processed"> {
		return this.status;
	}

	async markProcessed(): Promise<void> {
		this.processed = true;
	}

	async markFailed(input: { errorMessage: string }): Promise<void> {
		this.failed = input.errorMessage;
	}
}

class MemoryAnalyticsRepository implements AnalyticsRepositoryPort {
	event: AnalyticsDomainEvent | null = {
		id: "event-1",
		eventType: "OrderPaid",
		aggregateType: "order",
		aggregateId: "order-1",
		payload: {
			orderId: "order-1",
			paymentOrderId: "pay-1",
		},
		createdAt: "2026-05-16T01:00:00.000Z",
	};
	order: OrderAnalyticsSnapshot = {
		orderId: "order-1",
		orderNo: "CB202605160001",
		siteId: defaultSiteContext.siteId,
		verticalId: defaultSiteContext.verticalId,
		brandId: defaultSiteContext.brandId,
		guestToken: "guest-1",
		currency: "USD",
		totalAmount: "100.00",
		paidAt: "2026-05-16T01:00:00.000Z",
		createdAt: "2026-05-16T00:59:00.000Z",
		channelCode: "stripe",
		items: [
			{
				productId: "product-1",
				skuId: "sku-1",
				quantity: 2,
				totalAmount: "100.00",
			},
		],
	};
	insertAnalyticsEvent = true;
	claimedEventIds = ["event-1"];
	processedEvents: string[] = [];
	failedEvents: string[] = [];
	analyticsEvents: AnalyticsEventRecord[] = [];
	dailySales: DailySalesDelta[] = [];
	channelPerformance: ChannelPerformanceDelta[] = [];
	productPerformance: ProductPerformanceDelta[] = [];
	customerLtv: CustomerLtvDelta[] = [];

	async getDomainEventForUpdate(): Promise<AnalyticsDomainEvent | null> {
		return this.event;
	}

	async claimPendingOrderPaidEvents(): Promise<string[]> {
		return this.claimedEventIds;
	}

	async getOrderAnalyticsSnapshot(): Promise<OrderAnalyticsSnapshot> {
		return this.order;
	}

	async appendAnalyticsEventIfNew(record: AnalyticsEventRecord): Promise<boolean> {
		this.analyticsEvents.push(record);
		return this.insertAnalyticsEvent;
	}

	async markDomainEventProcessed(eventId: string): Promise<void> {
		this.processedEvents.push(eventId);
	}

	async markDomainEventFailed(input: { eventId: string }): Promise<void> {
		this.failedEvents.push(input.eventId);
	}

	async upsertDailySalesDelta(delta: DailySalesDelta): Promise<void> {
		this.dailySales.push(delta);
	}

	async upsertChannelPerformanceDelta(
		delta: ChannelPerformanceDelta,
	): Promise<void> {
		this.channelPerformance.push(delta);
	}

	async upsertProductPerformanceDelta(
		delta: ProductPerformanceDelta,
	): Promise<void> {
		this.productPerformance.push(delta);
	}

	async upsertCustomerLtvDelta(delta: CustomerLtvDelta): Promise<void> {
		this.customerLtv.push(delta);
	}

	async listDailySalesStats() {
		return [];
	}

	async listChannelPerformanceStats() {
		return [];
	}

	async listProductPerformanceStats() {
		return [];
	}

	async listCustomerLtvStats() {
		return [];
	}
}

function createUseCase() {
	const analytics = new MemoryAnalyticsRepository();
	const eventProcessLog = new MemoryEventProcessLog();
	const useCase = new ProjectOrderPaidAnalyticsUseCase({
		transactions: new NoopTransactionManager(),
		analytics,
		eventProcessLog,
		projection: new AnalyticsProjectionService(),
	});

	return {
		analytics,
		eventProcessLog,
		useCase,
	};
}

describe("ProjectOrderPaidAnalyticsUseCase", () => {
	it("projects OrderPaid into all analytics aggregates once", async () => {
		const { analytics, eventProcessLog, useCase } = createUseCase();

		const result = await useCase.execute("event-1");

		expect(result.status).toBe("processed");
		expect(eventProcessLog.processed).toBe(true);
		expect(analytics.processedEvents).toEqual(["event-1"]);
		expect(analytics.analyticsEvents).toHaveLength(1);
		expect(analytics.dailySales).toHaveLength(4);
		expect(analytics.channelPerformance).toHaveLength(4);
		expect(analytics.productPerformance).toHaveLength(4);
		expect(analytics.customerLtv).toHaveLength(4);
	});

	it("does not increment stats when the analytics event idempotency key already exists", async () => {
		const { analytics, eventProcessLog, useCase } = createUseCase();
		analytics.insertAnalyticsEvent = false;

		const result = await useCase.execute("event-1");

		expect(result.status).toBe("processed");
		expect(eventProcessLog.processed).toBe(true);
		expect(analytics.processedEvents).toEqual(["event-1"]);
		expect(analytics.analyticsEvents).toHaveLength(1);
		expect(analytics.dailySales).toHaveLength(0);
		expect(analytics.channelPerformance).toHaveLength(0);
		expect(analytics.productPerformance).toHaveLength(0);
		expect(analytics.customerLtv).toHaveLength(0);
	});

	it("skips work when the event has already been processed by the consumer", async () => {
		const { analytics, eventProcessLog, useCase } = createUseCase();
		eventProcessLog.status = "already_processed";

		const result = await useCase.execute("event-1");

		expect(result.status).toBe("already_processed");
		expect(analytics.analyticsEvents).toHaveLength(0);
	});

	it("claims pending OrderPaid events and processes them as a bounded batch", async () => {
		const { analytics, useCase } = createUseCase();
		analytics.claimedEventIds = ["event-1", "event-2"];
		const batchUseCase = new ProcessPendingAnalyticsEventsUseCase({
			transactions: new NoopTransactionManager(),
			analytics,
			projectOrderPaid: useCase,
		});

		const result = await batchUseCase.execute({ limit: 2 });

		expect(result).toMatchObject({
			claimed: 2,
			processed: 2,
			alreadyProcessed: 0,
			ignored: 0,
			failed: 0,
		});
		expect(result.results.map((item) => item.eventId)).toEqual([
			"event-1",
			"event-2",
		]);
	});
});
