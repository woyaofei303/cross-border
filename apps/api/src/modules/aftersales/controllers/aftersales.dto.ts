import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
	ArrayMinSize,
	IsArray,
	IsInt,
	IsIn,
	IsObject,
	IsOptional,
	IsString,
	IsUUID,
	Length,
	Matches,
	Max,
	MaxLength,
	Min,
	ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { afterSalesRequestTypes } from "@cross-border/shared";

const MONEY_PATTERN = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;

export class AfterSalesRequestItemDto {
	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	afterSalesItemId?: string;

	@ApiProperty({ format: "uuid" })
	@IsUUID()
	orderItemId!: string;

	@ApiProperty()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	quantity!: number;

	@ApiPropertyOptional({ example: "15.00", pattern: MONEY_PATTERN.source })
	@IsOptional()
	@Matches(MONEY_PATTERN)
	requestedAmount?: string;
}

export class CreateAfterSalesRequestDto {
	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	requestId?: string;

	@ApiPropertyOptional({ maxLength: 64 })
	@IsOptional()
	@IsString()
	@Length(1, 64)
	requestNo?: string;

	@ApiProperty({ format: "uuid" })
	@IsUUID()
	orderId!: string;

	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	userId?: string;

	@ApiPropertyOptional({ maxLength: 128 })
	@IsOptional()
	@IsString()
	@Length(1, 128)
	guestToken?: string;

	@ApiProperty({ enum: afterSalesRequestTypes })
	@IsIn(afterSalesRequestTypes)
	type!: (typeof afterSalesRequestTypes)[number];

	@ApiProperty({ maxLength: 1024 })
	@IsString()
	@Length(1, 1024)
	reason!: string;

	@ApiProperty({ example: "20.00", pattern: MONEY_PATTERN.source })
	@Matches(MONEY_PATTERN)
	requestedAmount!: string;

	@ApiProperty({ maxLength: 128 })
	@IsString()
	@Length(8, 128)
	idempotencyKey!: string;

	@ApiProperty({ type: [AfterSalesRequestItemDto] })
	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => AfterSalesRequestItemDto)
	items!: AfterSalesRequestItemDto[];
}

export class CreateAfterSalesRequestResponseDto {
	@ApiProperty({ format: "uuid" })
	requestId!: string;

	@ApiProperty()
	requestNo!: string;

	@ApiProperty({ format: "uuid" })
	orderId!: string;

	@ApiProperty()
	status!: string;

	@ApiProperty()
	reusedIdempotency!: boolean;

	@ApiProperty()
	eventsQueued!: number;
}

export class ApproveRefundRequestDto {
	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	refundId?: string;

	@ApiPropertyOptional({ maxLength: 64 })
	@IsOptional()
	@IsString()
	@Length(1, 64)
	refundNo?: string;

	@ApiProperty({ example: "20.00", pattern: MONEY_PATTERN.source })
	@Matches(MONEY_PATTERN)
	approvedAmount!: string;

	@ApiProperty({ maxLength: 128 })
	@IsString()
	@Length(8, 128)
	idempotencyKey!: string;
}

export class ApproveRefundResponseDto {
	@ApiProperty({ format: "uuid" })
	refundId!: string;

	@ApiProperty()
	refundNo!: string;

	@ApiProperty({ format: "uuid" })
	requestId!: string;

	@ApiProperty({ format: "uuid" })
	orderId!: string;

	@ApiProperty()
	status!: string;

	@ApiProperty()
	reusedIdempotency!: boolean;

	@ApiProperty()
	eventsQueued!: number;
}

export class MarkRefundSucceededRequestDto {
	@ApiProperty({ maxLength: 128 })
	@IsString()
	@Length(1, 128)
	providerRefundId!: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsObject()
	responsePayload?: Record<string, unknown>;
}

export class MarkRefundSucceededResponseDto {
	@ApiProperty()
	status!: "processed" | "already_succeeded" | "failed";

	@ApiPropertyOptional({ format: "uuid" })
	refundId?: string;

	@ApiPropertyOptional()
	providerRefundId?: string;

	@ApiPropertyOptional()
	errorMessage?: string;

	@ApiProperty()
	eventsQueued!: number;
}

export class AdminAfterSalesListQueryDto {
	@ApiPropertyOptional({
		enum: ["global", "vertical", "brand", "site"],
		default: "global",
	})
	@IsOptional()
	@IsString()
	scopeType?: "global" | "vertical" | "brand" | "site";

	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	scopeId?: string;

	@ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number;
}

export class RejectAfterSalesRequestDto {
	@ApiProperty({ maxLength: 1024 })
	@IsString()
	@Length(1, 1024)
	reason!: string;
}

export class RejectAfterSalesResponseDto {
	@ApiProperty({ format: "uuid" })
	requestId!: string;

	@ApiProperty()
	requestNo!: string;

	@ApiProperty({ format: "uuid" })
	orderId!: string;

	@ApiProperty()
	status!: string;

	@ApiProperty()
	eventsQueued!: number;
}

export class AdminAfterSalesRequestListItemDto {
	@ApiProperty({ format: "uuid" })
	afterSalesRequestId!: string;

	@ApiProperty()
	requestNo!: string;

	@ApiProperty({ format: "uuid" })
	orderId!: string;

	@ApiProperty()
	orderNo!: string;

	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;

	@ApiProperty()
	type!: string;

	@ApiProperty()
	status!: string;

	@ApiProperty()
	reason!: string;

	@ApiPropertyOptional()
	requestedAmount?: string;

	@ApiPropertyOptional()
	approvedAmount?: string;

	@ApiProperty()
	currency!: string;

	@ApiProperty()
	orderStatus!: string;

	@ApiProperty()
	paymentStatus!: string;

	@ApiProperty()
	fulfillmentStatus!: string;

	@ApiProperty()
	orderAftersalesStatus!: string;

	@ApiProperty()
	totalAmount!: string;

	@ApiPropertyOptional({ format: "uuid" })
	userId?: string;

	@ApiPropertyOptional()
	guestToken?: string;

	@ApiProperty()
	itemCount!: number;

	@ApiProperty()
	refundCount!: number;

	@ApiPropertyOptional({ format: "uuid" })
	latestRefundId?: string;

	@ApiPropertyOptional()
	latestRefundStatus?: string;

	@ApiProperty()
	createdAt!: string;

	@ApiProperty()
	updatedAt!: string;
}

export class AdminAfterSalesListResponseDto {
	@ApiProperty({ type: () => [AdminAfterSalesRequestListItemDto] })
	afterSalesRequests!: AdminAfterSalesRequestListItemDto[];
}

export class AdminAfterSalesItemDto {
	@ApiProperty({ format: "uuid" })
	afterSalesItemId!: string;

	@ApiProperty({ format: "uuid" })
	afterSalesRequestId!: string;

	@ApiProperty({ format: "uuid" })
	orderItemId!: string;

	@ApiPropertyOptional()
	productTitle?: string;

	@ApiPropertyOptional()
	skuCode?: string;

	@ApiPropertyOptional()
	skuTitle?: string;

	@ApiProperty()
	quantity!: number;

	@ApiPropertyOptional()
	requestedAmount?: string;

	@ApiPropertyOptional()
	approvedAmount?: string;

	@ApiPropertyOptional()
	returnQualityStatus?: string;

	@ApiProperty()
	createdAt!: string;
}

export class AdminAfterSalesLogDto {
	@ApiProperty({ format: "uuid" })
	afterSalesLogId!: string;

	@ApiProperty({ format: "uuid" })
	afterSalesRequestId!: string;

	@ApiProperty()
	action!: string;

	@ApiPropertyOptional()
	fromStatus?: string;

	@ApiPropertyOptional()
	toStatus?: string;

	@ApiProperty()
	operatorType!: string;

	@ApiPropertyOptional({ format: "uuid" })
	operatorId?: string;

	@ApiPropertyOptional()
	note?: string;

	@ApiProperty()
	createdAt!: string;
}

export class AdminAfterSalesRefundDto {
	@ApiProperty({ format: "uuid" })
	refundId!: string;

	@ApiProperty()
	refundNo!: string;

	@ApiProperty({ format: "uuid" })
	paymentOrderId!: string;

	@ApiProperty({ format: "uuid" })
	orderId!: string;

	@ApiPropertyOptional({ format: "uuid" })
	requestId?: string;

	@ApiProperty()
	status!: string;

	@ApiProperty()
	amount!: string;

	@ApiProperty()
	currency!: string;

	@ApiProperty()
	idempotencyKey!: string;

	@ApiPropertyOptional()
	providerRefundId?: string;

	@ApiProperty()
	createdAt!: string;

	@ApiProperty()
	updatedAt!: string;

	@ApiPropertyOptional()
	succeededAt?: string;

	@ApiPropertyOptional()
	failedAt?: string;
}

export class AdminAfterSalesOrderContextDto {
	@ApiProperty({ format: "uuid" })
	orderId!: string;

	@ApiProperty()
	orderNo!: string;

	@ApiProperty()
	orderStatus!: string;

	@ApiProperty()
	paymentStatus!: string;

	@ApiProperty()
	fulfillmentStatus!: string;

	@ApiProperty()
	aftersalesStatus!: string;

	@ApiProperty()
	currency!: string;

	@ApiProperty()
	totalAmount!: string;
}

export class AdminAfterSalesRequestDetailDto extends AdminAfterSalesRequestListItemDto {
	@ApiProperty({ type: () => AdminAfterSalesOrderContextDto })
	order!: AdminAfterSalesOrderContextDto;

	@ApiProperty({ type: () => [AdminAfterSalesItemDto] })
	items!: AdminAfterSalesItemDto[];

	@ApiProperty({ type: () => [AdminAfterSalesLogDto] })
	logs!: AdminAfterSalesLogDto[];

	@ApiProperty({ type: () => [AdminAfterSalesRefundDto] })
	refunds!: AdminAfterSalesRefundDto[];
}
