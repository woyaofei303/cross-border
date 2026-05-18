import { Injectable } from "@nestjs/common";
import { assertDomainRule } from "../../common/domain/domain-errors.js";
import { parseMoneyToMinorUnits } from "../../common/money/money.js";
import type {
	AnalyticsDomainEvent,
	AnalyticsEventRecord,
	AnalyticsScope,
	ChannelPerformanceDelta,
	CustomerLtvDelta,
	DailySalesDelta,
	OrderAnalyticsItem,
	OrderAnalyticsSnapshot,
	ProductPerformanceDelta,
} from "./analytics.types.js";

function formatMinorUnits(amount: bigint): string {
	const sign = amount < 0n ? "-" : "";
	const absolute = amount < 0n ? -amount : amount;
	const major = absolute / 100n;
	const minor = (absolute % 100n).toString().padStart(2, "0");

	return `${sign}${major.toString()}.${minor}`;
}

function toStatDate(isoDate: string): string {
	return isoDate.slice(0, 10);
}

function assertNonEmptyString(value: unknown, code: string): asserts value is string {
	assertDomainRule(
		typeof value === "string" && value.length > 0,
		code,
		"Analytics event payload is missing a required identifier.",
	);
}

function buildScopes(snapshot: OrderAnalyticsSnapshot): AnalyticsScope[] {
	return [
		{
			scopeType: "global",
			scopeKey: "global",
		},
		{
			scopeType: "vertical",
			scopeKey: snapshot.verticalId,
			verticalId: snapshot.verticalId,
		},
		{
			scopeType: "brand",
			scopeKey: snapshot.brandId,
			brandId: snapshot.brandId,
		},
		{
			scopeType: "site",
			scopeKey: snapshot.siteId,
			siteId: snapshot.siteId,
			verticalId: snapshot.verticalId,
			brandId: snapshot.brandId,
		},
	];
}

function groupItemsByProductAndSku(
	items: OrderAnalyticsItem[],
): Array<{
	productId: string;
	skuId: string;
	quantity: number;
	totalAmount: string;
}> {
	const groups = new Map<
		string,
		{
			productId: string;
			skuId: string;
			quantity: number;
			totalMinorAmount: bigint;
		}
	>();

	for (const item of items) {
		const key = `${item.productId}:${item.skuId}`;
		const existing = groups.get(key);

		if (existing) {
			existing.quantity += item.quantity;
			existing.totalMinorAmount += parseMoneyToMinorUnits(item.totalAmount);
			continue;
		}

		groups.set(key, {
			productId: item.productId,
			skuId: item.skuId,
			quantity: item.quantity,
			totalMinorAmount: parseMoneyToMinorUnits(item.totalAmount),
		});
	}

	return [...groups.values()].map((group) => ({
		productId: group.productId,
		skuId: group.skuId,
		quantity: group.quantity,
		totalAmount: formatMinorUnits(group.totalMinorAmount),
	}));
}

export type OrderPaidAnalyticsProjection = {
	analyticsEvent: AnalyticsEventRecord;
	dailySales: DailySalesDelta[];
	channelPerformance: ChannelPerformanceDelta[];
	productPerformance: ProductPerformanceDelta[];
	customerLtv: CustomerLtvDelta[];
};

@Injectable()
export class AnalyticsProjectionService {
	planOrderPaidProjection(input: {
		event: AnalyticsDomainEvent;
		order: OrderAnalyticsSnapshot;
	}): OrderPaidAnalyticsProjection {
		assertDomainRule(
			input.event.eventType === "OrderPaid",
			"ANALYTICS_UNSUPPORTED_EVENT",
			"Only OrderPaid events can be projected by this workflow.",
		);

		const payloadOrderId = input.event.payload.orderId;
		const payloadPaymentOrderId = input.event.payload.paymentOrderId;

		assertNonEmptyString(payloadOrderId, "ANALYTICS_ORDER_ID_REQUIRED");
		assertNonEmptyString(
			payloadPaymentOrderId,
			"ANALYTICS_PAYMENT_ORDER_ID_REQUIRED",
		);
		assertDomainRule(
			payloadOrderId === input.order.orderId,
			"ANALYTICS_ORDER_EVENT_MISMATCH",
			"OrderPaid payload order id must match the order snapshot.",
		);

		const statDate = toStatDate(input.order.paidAt);
		const scopes = buildScopes(input.order);
		const productGroups = groupItemsByProductAndSku(input.order.items);
		const customerIdentityType = input.order.userId ? "user" : "guest";
		const customerIdentityKey = input.order.userId ?? input.order.guestToken;

		assertNonEmptyString(
			customerIdentityKey,
			"ANALYTICS_CUSTOMER_IDENTITY_REQUIRED",
		);

		return {
			analyticsEvent: {
				siteId: input.order.siteId,
				verticalId: input.order.verticalId,
				brandId: input.order.brandId,
				eventType: "OrderPaid",
				subjectType: "order",
				subjectId: input.order.orderId,
				...(input.order.userId ? { userId: input.order.userId } : {}),
				...(input.order.guestToken
					? { guestToken: input.order.guestToken }
					: {}),
				orderId: input.order.orderId,
				channelCode: input.order.channelCode,
				currency: input.order.currency,
				amount: input.order.totalAmount,
				properties: {
					orderNo: input.order.orderNo,
					paymentOrderId: payloadPaymentOrderId,
					sourceEventId: input.event.id,
				},
				idempotencyKey: `domain-event:${input.event.id}:order-paid`,
				occurredAt: input.order.paidAt,
			},
			dailySales: scopes.map((scope) => ({
				...scope,
				statDate,
				currency: input.order.currency,
				gmvAmount: input.order.totalAmount,
				netSalesAmount: input.order.totalAmount,
				orderCount: 1,
				paidOrderCount: 1,
			})),
			channelPerformance: scopes.map((scope) => ({
				...scope,
				statDate,
				channelCode: input.order.channelCode,
				currency: input.order.currency,
				orderCount: 1,
				gmvAmount: input.order.totalAmount,
				netSalesAmount: input.order.totalAmount,
			})),
			productPerformance: scopes.flatMap((scope) =>
				productGroups.map((group) => ({
					...scope,
					statDate,
					productId: group.productId,
					skuId: group.skuId,
					currency: input.order.currency,
					unitsSold: group.quantity,
					orderCount: 1,
					gmvAmount: group.totalAmount,
					netSalesAmount: group.totalAmount,
				})),
			),
			customerLtv: scopes.map((scope) => ({
				...scope,
				customerIdentityType,
				customerIdentityKey,
				...(input.order.userId ? { userId: input.order.userId } : {}),
				...(input.order.guestToken
					? { guestToken: input.order.guestToken }
					: {}),
				currency: input.order.currency,
				orderedAt: input.order.paidAt,
				orderCount: 1,
				grossSalesAmount: input.order.totalAmount,
				netSalesAmount: input.order.totalAmount,
			})),
		};
	}
}
