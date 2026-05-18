import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	IsIn,
	IsInt,
	IsOptional,
	IsUUID,
	Matches,
	Max,
	Min,
} from "class-validator";
import type { AnalyticsScopeType } from "../analytics.types.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const ANALYTICS_SCOPE_TYPES = ["global", "vertical", "brand", "site"] as const;

export class AnalyticsStatsQueryDto {
	@ApiPropertyOptional({ enum: ANALYTICS_SCOPE_TYPES })
	@IsOptional()
	@IsIn(ANALYTICS_SCOPE_TYPES)
	scopeType?: AnalyticsScopeType;

	@ApiPropertyOptional({
		description: "Required when scopeType is vertical, brand, or site.",
	})
	@IsOptional()
	@IsUUID()
	scopeId?: string;

	@ApiPropertyOptional({ example: "2026-05-01", pattern: DATE_PATTERN.source })
	@IsOptional()
	@Matches(DATE_PATTERN)
	from?: string;

	@ApiPropertyOptional({ example: "2026-05-16", pattern: DATE_PATTERN.source })
	@IsOptional()
	@Matches(DATE_PATTERN)
	to?: string;

	@ApiPropertyOptional({ example: "USD", pattern: CURRENCY_PATTERN.source })
	@IsOptional()
	@Matches(CURRENCY_PATTERN)
	currency?: string;

	@ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(200)
	limit?: number;
}

export class DailySalesStatsResponseItemDto {
	@ApiProperty()
	statDate!: string;

	@ApiProperty({ enum: ANALYTICS_SCOPE_TYPES })
	scopeType!: AnalyticsScopeType;

	@ApiProperty()
	scopeKey!: string;

	@ApiPropertyOptional({ format: "uuid" })
	siteId?: string;

	@ApiPropertyOptional({ format: "uuid" })
	verticalId?: string;

	@ApiPropertyOptional({ format: "uuid" })
	brandId?: string;

	@ApiProperty()
	currency!: string;

	@ApiProperty()
	gmvAmount!: string;

	@ApiProperty()
	netSalesAmount!: string;

	@ApiProperty()
	refundAmount!: string;

	@ApiProperty()
	chargebackAmount!: string;

	@ApiProperty()
	orderCount!: number;

	@ApiProperty()
	paidOrderCount!: number;

	@ApiProperty()
	refundedOrderCount!: number;

	@ApiProperty()
	chargebackCount!: number;
}

export class DailySalesStatsResponseDto {
	@ApiProperty({ type: [DailySalesStatsResponseItemDto] })
	items!: DailySalesStatsResponseItemDto[];
}

export class ChannelPerformanceStatsResponseItemDto {
	@ApiProperty()
	statDate!: string;

	@ApiProperty({ enum: ANALYTICS_SCOPE_TYPES })
	scopeType!: AnalyticsScopeType;

	@ApiProperty()
	scopeKey!: string;

	@ApiPropertyOptional({ format: "uuid" })
	siteId?: string;

	@ApiPropertyOptional({ format: "uuid" })
	verticalId?: string;

	@ApiPropertyOptional({ format: "uuid" })
	brandId?: string;

	@ApiProperty()
	channelCode!: string;

	@ApiProperty()
	currency!: string;

	@ApiProperty()
	orderCount!: number;

	@ApiProperty()
	gmvAmount!: string;

	@ApiProperty()
	netSalesAmount!: string;

	@ApiProperty()
	refundAmount!: string;

	@ApiProperty()
	chargebackAmount!: string;

	@ApiProperty()
	adSpendAmount!: string;
}

export class ChannelPerformanceStatsResponseDto {
	@ApiProperty({ type: [ChannelPerformanceStatsResponseItemDto] })
	items!: ChannelPerformanceStatsResponseItemDto[];
}

export class ProductPerformanceStatsResponseItemDto {
	@ApiProperty()
	statDate!: string;

	@ApiProperty({ enum: ANALYTICS_SCOPE_TYPES })
	scopeType!: AnalyticsScopeType;

	@ApiProperty()
	scopeKey!: string;

	@ApiPropertyOptional({ format: "uuid" })
	siteId?: string;

	@ApiPropertyOptional({ format: "uuid" })
	verticalId?: string;

	@ApiPropertyOptional({ format: "uuid" })
	brandId?: string;

	@ApiProperty({ format: "uuid" })
	productId!: string;

	@ApiProperty({ format: "uuid" })
	skuId!: string;

	@ApiProperty()
	currency!: string;

	@ApiProperty()
	unitsSold!: number;

	@ApiProperty()
	orderCount!: number;

	@ApiProperty()
	gmvAmount!: string;

	@ApiProperty()
	netSalesAmount!: string;

	@ApiProperty()
	refundAmount!: string;
}

export class ProductPerformanceStatsResponseDto {
	@ApiProperty({ type: [ProductPerformanceStatsResponseItemDto] })
	items!: ProductPerformanceStatsResponseItemDto[];
}

export class CustomerLtvStatsResponseItemDto {
	@ApiProperty({ enum: ANALYTICS_SCOPE_TYPES })
	scopeType!: AnalyticsScopeType;

	@ApiProperty()
	scopeKey!: string;

	@ApiPropertyOptional({ format: "uuid" })
	siteId?: string;

	@ApiPropertyOptional({ format: "uuid" })
	verticalId?: string;

	@ApiPropertyOptional({ format: "uuid" })
	brandId?: string;

	@ApiProperty({ enum: ["user", "guest"] })
	customerIdentityType!: "user" | "guest";

	@ApiProperty()
	customerIdentityKey!: string;

	@ApiPropertyOptional({ format: "uuid" })
	userId?: string;

	@ApiPropertyOptional()
	guestToken?: string;

	@ApiProperty()
	currency!: string;

	@ApiProperty()
	firstOrderAt!: string;

	@ApiProperty()
	lastOrderAt!: string;

	@ApiProperty()
	orderCount!: number;

	@ApiProperty()
	grossSalesAmount!: string;

	@ApiProperty()
	netSalesAmount!: string;

	@ApiProperty()
	refundAmount!: string;
}

export class CustomerLtvStatsResponseDto {
	@ApiProperty({ type: [CustomerLtvStatsResponseItemDto] })
	items!: CustomerLtvStatsResponseItemDto[];
}

export class ProjectAnalyticsEventRequestDto {
	@ApiProperty({ format: "uuid" })
	@IsUUID()
	eventId!: string;
}

export class ProjectAnalyticsEventResponseDto {
	@ApiProperty({ enum: ["processed", "already_processed", "ignored", "failed"] })
	status!: "processed" | "already_processed" | "ignored" | "failed";

	@ApiPropertyOptional()
	reason?: string;

	@ApiPropertyOptional()
	errorMessage?: string;
}

export class ProcessPendingAnalyticsEventsRequestDto {
	@ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(200)
	limit?: number;
}

export class ProcessPendingAnalyticsEventResultDto {
	@ApiProperty({ format: "uuid" })
	eventId!: string;

	@ApiProperty({ enum: ["processed", "already_processed", "ignored", "failed"] })
	status!: "processed" | "already_processed" | "ignored" | "failed";

	@ApiPropertyOptional()
	reason?: string;

	@ApiPropertyOptional()
	errorMessage?: string;
}

export class ProcessPendingAnalyticsEventsResponseDto {
	@ApiProperty()
	claimed!: number;

	@ApiProperty()
	processed!: number;

	@ApiProperty()
	alreadyProcessed!: number;

	@ApiProperty()
	ignored!: number;

	@ApiProperty()
	failed!: number;

	@ApiProperty({ type: [ProcessPendingAnalyticsEventResultDto] })
	results!: ProcessPendingAnalyticsEventResultDto[];
}
