import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	Length,
	Matches,
	Max,
	MaxLength,
	Min,
} from "class-validator";

const MONEY_PATTERN = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
const CHANNEL_CODE_PATTERN = /^[a-z0-9_-]{2,32}$/;

export class CreatePaymentOrderRequestDto {
	@ApiPropertyOptional({
		description: "Client supplied UUID for idempotent retries; generated when omitted.",
	})
	@IsOptional()
	@IsUUID()
	paymentOrderId?: string;

	@ApiPropertyOptional({ maxLength: 64 })
	@IsOptional()
	@IsString()
	@Length(1, 64)
	paymentNo?: string;

	@ApiProperty({ format: "uuid" })
	@IsUUID()
	orderId!: string;

	@ApiProperty({ example: "stripe", pattern: CHANNEL_CODE_PATTERN.source })
	@Matches(CHANNEL_CODE_PATTERN)
	channelCode!: string;

	@ApiProperty({ example: "100.00", pattern: MONEY_PATTERN.source })
	@Matches(MONEY_PATTERN)
	amount!: string;

	@ApiProperty({ example: "USD", pattern: CURRENCY_PATTERN.source })
	@Matches(CURRENCY_PATTERN)
	currency!: string;

	@ApiProperty({ maxLength: 128 })
	@IsString()
	@Length(8, 128)
	idempotencyKey!: string;
}

export class CreatePaymentOrderResponseDto {
	@ApiProperty({ format: "uuid" })
	paymentOrderId!: string;

	@ApiProperty()
	paymentNo!: string;

	@ApiProperty({ format: "uuid" })
	orderId!: string;

	@ApiProperty()
	status!: string;

	@ApiProperty()
	reusedIdempotency!: boolean;
}

export class PaymentWebhookRequestDto {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(128)
	id?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(128)
	type?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(128)
	providerEventId?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(128)
	eventType?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(128)
	providerObjectId?: string;

	[key: string]: unknown;
}

export class ReceivePaymentWebhookResponseDto {
	@ApiProperty({ format: "uuid" })
	webhookEventId!: string;

	@ApiProperty()
	inserted!: boolean;

	@ApiProperty({ enum: [true] })
	accepted!: true;
}

export class AdminPaymentListQueryDto {
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

export class AdminPaymentOrderListItemDto {
	@ApiProperty({ format: "uuid" })
	paymentOrderId!: string;

	@ApiProperty()
	paymentNo!: string;

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
	channelCode!: string;

	@ApiProperty()
	status!: string;

	@ApiProperty()
	amount!: string;

	@ApiProperty()
	currency!: string;

	@ApiPropertyOptional()
	providerPaymentId?: string;

	@ApiProperty()
	idempotencyKey!: string;

	@ApiProperty()
	transactionCount!: number;

	@ApiPropertyOptional()
	latestWebhookEventId?: string;

	@ApiPropertyOptional()
	latestWebhookStatus?: string;

	@ApiProperty()
	createdAt!: string;

	@ApiProperty()
	updatedAt!: string;

	@ApiPropertyOptional()
	succeededAt?: string;

	@ApiPropertyOptional()
	failedAt?: string;
}

export class AdminPaymentTransactionListItemDto {
	@ApiProperty({ format: "uuid" })
	paymentTransactionId!: string;

	@ApiProperty({ format: "uuid" })
	paymentOrderId!: string;

	@ApiProperty()
	paymentNo!: string;

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
	channelCode!: string;

	@ApiProperty()
	providerTransactionId!: string;

	@ApiProperty()
	transactionType!: string;

	@ApiProperty()
	status!: string;

	@ApiProperty()
	amount!: string;

	@ApiProperty()
	currency!: string;

	@ApiProperty()
	createdAt!: string;
}

export class AdminPaymentWebhookListItemDto {
	@ApiProperty({ format: "uuid" })
	webhookEventId!: string;

	@ApiPropertyOptional({ format: "uuid" })
	paymentOrderId?: string;

	@ApiPropertyOptional()
	paymentNo?: string;

	@ApiPropertyOptional({ format: "uuid" })
	orderId?: string;

	@ApiPropertyOptional()
	orderNo?: string;

	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;

	@ApiProperty()
	channelCode!: string;

	@ApiProperty()
	providerEventId!: string;

	@ApiProperty()
	eventType!: string;

	@ApiPropertyOptional()
	providerObjectId?: string;

	@ApiProperty()
	dedupeKey!: string;

	@ApiProperty()
	duplicateCount!: number;

	@ApiProperty()
	status!: string;

	@ApiPropertyOptional()
	errorMessage?: string;

	@ApiProperty()
	receivedAt!: string;

	@ApiPropertyOptional()
	processedAt?: string;
}

export class AdminPaymentOrderListResponseDto {
	@ApiProperty({ type: () => [AdminPaymentOrderListItemDto] })
	paymentOrders!: AdminPaymentOrderListItemDto[];
}

export class AdminPaymentTransactionListResponseDto {
	@ApiProperty({ type: () => [AdminPaymentTransactionListItemDto] })
	paymentTransactions!: AdminPaymentTransactionListItemDto[];
}

export class AdminPaymentWebhookListResponseDto {
	@ApiProperty({ type: () => [AdminPaymentWebhookListItemDto] })
	paymentWebhooks!: AdminPaymentWebhookListItemDto[];
}
