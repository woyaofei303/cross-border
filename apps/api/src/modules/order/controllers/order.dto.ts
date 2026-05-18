import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	ArrayMinSize,
	IsArray,
	IsDateString,
	IsEmail,
	IsInt,
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

const MONEY_PATTERN = /^(0|[1-9]\d{0,15})(\.\d{1,2})?$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export class OrderShippingAddressRequestDto {
	@ApiProperty()
	@IsEmail()
	@MaxLength(320)
	email!: string;

	@ApiProperty({ maxLength: 160 })
	@IsString()
	@Length(1, 160)
	fullName!: string;

	@ApiPropertyOptional({ maxLength: 64 })
	@IsOptional()
	@IsString()
	@MaxLength(64)
	phone?: string;

	@ApiProperty({ maxLength: 240 })
	@IsString()
	@Length(1, 240)
	addressLine1!: string;

	@ApiPropertyOptional({ maxLength: 240 })
	@IsOptional()
	@IsString()
	@MaxLength(240)
	addressLine2?: string;

	@ApiProperty({ maxLength: 120 })
	@IsString()
	@Length(1, 120)
	city!: string;

	@ApiPropertyOptional({ maxLength: 120 })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	region?: string;

	@ApiProperty({ maxLength: 32 })
	@IsString()
	@Length(1, 32)
	postalCode!: string;

	@ApiProperty({ minLength: 2, maxLength: 8 })
	@IsString()
	@Length(2, 8)
	countryCode!: string;
}

export class CreateOrderItemRequestDto {
	@ApiPropertyOptional({
		description: "Client supplied UUID for idempotent retries; generated when omitted.",
	})
	@IsOptional()
	@IsUUID()
	orderItemId?: string;

	@ApiProperty({ format: "uuid" })
	@IsUUID()
	productId!: string;

	@ApiProperty({ format: "uuid" })
	@IsUUID()
	skuId!: string;

	@ApiProperty({ maxLength: 128 })
	@IsString()
	@Length(1, 128)
	skuCode!: string;

	@ApiProperty()
	@IsString()
	@Length(1, 500)
	productTitle!: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(500)
	skuTitle?: string;

	@ApiPropertyOptional({ maxLength: 2048 })
	@IsOptional()
	@IsString()
	@MaxLength(2048)
	imageUrl?: string;

	@ApiProperty({ example: "100.00", pattern: MONEY_PATTERN.source })
	@Matches(MONEY_PATTERN)
	unitPrice!: string;

	@ApiProperty({ minimum: 1, example: 1 })
	@IsInt()
	@Min(1)
	quantity!: number;

	@ApiProperty({ example: "0.00", pattern: MONEY_PATTERN.source })
	@Matches(MONEY_PATTERN)
	discountAmount!: string;

	@ApiProperty({ example: "100.00", pattern: MONEY_PATTERN.source })
	@Matches(MONEY_PATTERN)
	totalAmount!: string;

	@ApiPropertyOptional({
		description: "Immutable product, price, and promotion snapshot.",
		type: "object",
		additionalProperties: true,
	})
	@IsOptional()
	@IsObject()
	snapshot?: Record<string, unknown>;

	@ApiProperty({ format: "uuid" })
	@IsUUID()
	warehouseId!: string;

	@ApiPropertyOptional({
		description: "Inventory lock expiry ISO timestamp; defaults to 15 minutes.",
		format: "date-time",
	})
	@IsOptional()
	@IsDateString()
	lockExpiresAt?: string;
}

export class CreateOrderRequestDto {
	@ApiPropertyOptional({
		description: "Client supplied UUID for idempotent retries; generated when omitted.",
	})
	@IsOptional()
	@IsUUID()
	orderId?: string;

	@ApiPropertyOptional({ maxLength: 64 })
	@IsOptional()
	@IsString()
	@Length(1, 64)
	orderNo?: string;

	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	userId?: string;

	@ApiPropertyOptional({ maxLength: 128 })
	@IsOptional()
	@IsString()
	@Length(1, 128)
	guestToken?: string;

	@ApiProperty({ maxLength: 128 })
	@IsString()
	@Length(8, 128)
	idempotencyKey!: string;

	@ApiProperty({ example: "USD", pattern: CURRENCY_PATTERN.source })
	@Matches(CURRENCY_PATTERN)
	currency!: string;

	@ApiProperty({ example: "100.00", pattern: MONEY_PATTERN.source })
	@Matches(MONEY_PATTERN)
	subtotalAmount!: string;

	@ApiProperty({ example: "0.00", pattern: MONEY_PATTERN.source })
	@Matches(MONEY_PATTERN)
	discountAmount!: string;

	@ApiProperty({ example: "0.00", pattern: MONEY_PATTERN.source })
	@Matches(MONEY_PATTERN)
	shippingAmount!: string;

	@ApiProperty({ example: "0.00", pattern: MONEY_PATTERN.source })
	@Matches(MONEY_PATTERN)
	taxAmount!: string;

	@ApiProperty({ example: "100.00", pattern: MONEY_PATTERN.source })
	@Matches(MONEY_PATTERN)
	totalAmount!: string;

	@ApiProperty({ type: () => [CreateOrderItemRequestDto] })
	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => CreateOrderItemRequestDto)
	items!: CreateOrderItemRequestDto[];

	@ApiPropertyOptional({
		description:
			"Checkout shipping contact and address snapshot persisted on the order.",
		type: () => OrderShippingAddressRequestDto,
	})
	@IsOptional()
	@ValidateNested()
	@Type(() => OrderShippingAddressRequestDto)
	shippingAddress?: OrderShippingAddressRequestDto;
}

export class CreateOrderResponseDto {
	@ApiProperty({ format: "uuid" })
	orderId!: string;

	@ApiProperty()
	orderNo!: string;

	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty()
	reusedIdempotency!: boolean;

	@ApiProperty({ minimum: 0 })
	eventsQueued!: number;
}

export class OrderCheckoutResultQueryDto {
	@ApiPropertyOptional({ maxLength: 128 })
	@IsOptional()
	@IsString()
	@Length(1, 128)
	guestToken?: string;

	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	userId?: string;
}

export class OrderListQueryDto extends OrderCheckoutResultQueryDto {
	@ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(50)
	limit?: number;
}

export class OrderPaymentOrderResultDto {
	@ApiProperty({ format: "uuid" })
	paymentOrderId!: string;

	@ApiProperty()
	paymentNo!: string;

	@ApiProperty()
	status!: string;

	@ApiProperty()
	channelCode!: string;

	@ApiProperty()
	amount!: string;

	@ApiProperty()
	currency!: string;
}

export class OrderCheckoutResultResponseDto {
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
	subtotalAmount!: string;

	@ApiProperty()
	discountAmount!: string;

	@ApiProperty()
	shippingAmount!: string;

	@ApiProperty()
	taxAmount!: string;

	@ApiProperty()
	totalAmount!: string;

	@ApiProperty()
	createdAt!: string;

	@ApiProperty()
	updatedAt!: string;

	@ApiPropertyOptional()
	paidAt?: string;

	@ApiPropertyOptional({ type: () => OrderPaymentOrderResultDto })
	paymentOrder?: OrderPaymentOrderResultDto;
}

export class StorefrontOrderListPaymentDto {
	@ApiProperty({ format: "uuid" })
	paymentOrderId!: string;

	@ApiProperty()
	paymentNo!: string;

	@ApiProperty()
	status!: string;

	@ApiProperty()
	channelCode!: string;
}

export class StorefrontOrderListItemDto {
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

	@ApiProperty()
	itemCount!: number;

	@ApiPropertyOptional()
	firstItemTitle?: string;

	@ApiPropertyOptional()
	firstItemImageUrl?: string;

	@ApiProperty()
	createdAt!: string;

	@ApiProperty()
	updatedAt!: string;

	@ApiPropertyOptional()
	paidAt?: string;

	@ApiPropertyOptional({ type: () => StorefrontOrderListPaymentDto })
	latestPaymentOrder?: StorefrontOrderListPaymentDto;
}

export class StorefrontOrderListResponseDto {
	@ApiProperty({ type: () => [StorefrontOrderListItemDto] })
	orders!: StorefrontOrderListItemDto[];
}

export class StorefrontOrderItemDto {
	@ApiProperty({ format: "uuid" })
	orderItemId!: string;

	@ApiProperty({ format: "uuid" })
	productId!: string;

	@ApiProperty({ format: "uuid" })
	skuId!: string;

	@ApiProperty()
	skuCode!: string;

	@ApiProperty()
	productTitle!: string;

	@ApiPropertyOptional()
	skuTitle?: string;

	@ApiPropertyOptional()
	imageUrl?: string;

	@ApiProperty()
	unitPrice!: string;

	@ApiProperty()
	quantity!: number;

	@ApiProperty()
	discountAmount!: string;

	@ApiProperty()
	totalAmount!: string;

	@ApiProperty({ type: "object", additionalProperties: true })
	snapshot!: Record<string, unknown>;
}

export class StorefrontShipmentTrackingEventDto {
	@ApiProperty()
	trackingStatus!: string;

	@ApiPropertyOptional()
	description?: string;

	@ApiPropertyOptional()
	location?: string;

	@ApiProperty()
	occurredAt!: string;
}

export class StorefrontShipmentDto {
	@ApiProperty({ format: "uuid" })
	shipmentId!: string;

	@ApiProperty({ format: "uuid" })
	fulfillmentOrderId!: string;

	@ApiProperty()
	fulfillmentNo!: string;

	@ApiProperty()
	fulfillmentStatus!: string;

	@ApiProperty()
	providerCode!: string;

	@ApiProperty()
	providerName!: string;

	@ApiProperty()
	trackingNo!: string;

	@ApiProperty()
	status!: string;

	@ApiPropertyOptional()
	shippedAt?: string;

	@ApiPropertyOptional()
	deliveredAt?: string;

	@ApiProperty({ type: () => [StorefrontShipmentTrackingEventDto] })
	trackingEvents!: StorefrontShipmentTrackingEventDto[];
}

export class StorefrontOrderDetailResponseDto extends OrderCheckoutResultResponseDto {
	@ApiProperty({ type: "object", additionalProperties: true })
	shippingAddressSnapshot!: Record<string, unknown>;

	@ApiProperty({ type: "object", additionalProperties: true })
	priceSnapshot!: Record<string, unknown>;

	@ApiProperty({ type: () => [StorefrontOrderItemDto] })
	items!: StorefrontOrderItemDto[];

	@ApiProperty({ type: () => [StorefrontShipmentDto] })
	shipments!: StorefrontShipmentDto[];
}

export class AdminOrderListQueryDto {
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

export class AdminOrderStatusSetDto {
	@ApiProperty()
	orderStatus!: string;

	@ApiProperty()
	paymentStatus!: string;

	@ApiProperty()
	fulfillmentStatus!: string;

	@ApiProperty()
	aftersalesStatus!: string;
}

export class AdminOrderListItemDto extends AdminOrderStatusSetDto {
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

	@ApiPropertyOptional({ format: "uuid" })
	userId?: string;

	@ApiPropertyOptional()
	guestToken?: string;

	@ApiProperty()
	currency!: string;

	@ApiProperty()
	totalAmount!: string;

	@ApiProperty()
	itemCount!: number;

	@ApiProperty()
	statusLogCount!: number;

	@ApiProperty()
	createdAt!: string;

	@ApiProperty()
	updatedAt!: string;

	@ApiPropertyOptional()
	paidAt?: string;

	@ApiPropertyOptional()
	cancelledAt?: string;

	@ApiPropertyOptional({ type: () => StorefrontOrderListPaymentDto })
	latestPaymentOrder?: StorefrontOrderListPaymentDto;
}

export class AdminOrderListResponseDto {
	@ApiProperty({ type: () => [AdminOrderListItemDto] })
	orders!: AdminOrderListItemDto[];
}

export class AdminOrderCartOriginDto {
	@ApiPropertyOptional({ format: "uuid" })
	userId?: string;

	@ApiPropertyOptional()
	guestToken?: string;

	@ApiProperty()
	idempotencyKey!: string;
}

export class AdminOrderPaymentOrderDto extends OrderPaymentOrderResultDto {
	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;

	@ApiPropertyOptional()
	providerPaymentId?: string;

	@ApiProperty()
	idempotencyKey!: string;

	@ApiProperty()
	createdAt!: string;

	@ApiProperty()
	updatedAt!: string;

	@ApiPropertyOptional()
	succeededAt?: string;

	@ApiPropertyOptional()
	failedAt?: string;
}

export class AdminOrderPaymentTransactionDto {
	@ApiProperty({ format: "uuid" })
	paymentTransactionId!: string;

	@ApiProperty({ format: "uuid" })
	paymentOrderId!: string;

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

	@ApiProperty({ type: "object", additionalProperties: true })
	rawPayload!: Record<string, unknown>;

	@ApiProperty()
	createdAt!: string;
}

export class AdminOrderInventoryLockDto {
	@ApiProperty({ format: "uuid" })
	inventoryLockId!: string;

	@ApiProperty({ format: "uuid" })
	orderItemId!: string;

	@ApiProperty()
	skuId!: string;

	@ApiProperty()
	warehouseId!: string;

	@ApiProperty()
	quantity!: number;

	@ApiProperty()
	status!: string;

	@ApiProperty()
	idempotencyKey!: string;

	@ApiProperty()
	expiresAt!: string;

	@ApiPropertyOptional()
	releasedAt?: string;

	@ApiPropertyOptional()
	deductedAt?: string;

	@ApiProperty()
	createdAt!: string;
}

export class AdminOrderInventoryTransactionDto {
	@ApiProperty({ format: "uuid" })
	inventoryTransactionId!: string;

	@ApiProperty()
	skuId!: string;

	@ApiProperty()
	warehouseId!: string;

	@ApiProperty()
	type!: string;

	@ApiProperty()
	quantity!: number;

	@ApiProperty()
	beforeAvailable!: number;

	@ApiProperty()
	afterAvailable!: number;

	@ApiProperty()
	beforeLocked!: number;

	@ApiProperty()
	afterLocked!: number;

	@ApiProperty()
	beforePhysical!: number;

	@ApiProperty()
	afterPhysical!: number;

	@ApiProperty()
	idempotencyKey!: string;

	@ApiProperty()
	createdAt!: string;
}

export class AdminOrderFulfillmentOrderDto {
	@ApiProperty({ format: "uuid" })
	fulfillmentOrderId!: string;

	@ApiProperty()
	fulfillmentNo!: string;

	@ApiPropertyOptional({ format: "uuid" })
	warehouseId?: string;

	@ApiProperty()
	status!: string;

	@ApiProperty()
	itemCount!: number;

	@ApiProperty()
	createdAt!: string;

	@ApiProperty()
	updatedAt!: string;
}

export class AdminOrderFulfillmentItemDto {
	@ApiProperty({ format: "uuid" })
	fulfillmentItemId!: string;

	@ApiProperty({ format: "uuid" })
	fulfillmentOrderId!: string;

	@ApiProperty({ format: "uuid" })
	orderItemId!: string;

	@ApiProperty()
	skuId!: string;

	@ApiProperty()
	quantity!: number;

	@ApiProperty()
	createdAt!: string;
}

export class AdminOrderPaymentRefundDto {
	@ApiProperty({ format: "uuid" })
	refundId!: string;

	@ApiProperty()
	refundNo!: string;

	@ApiPropertyOptional({ format: "uuid" })
	afterSalesRequestId?: string;

	@ApiProperty({ format: "uuid" })
	paymentOrderId!: string;

	@ApiProperty()
	status!: string;

	@ApiProperty()
	amount!: string;

	@ApiProperty()
	currency!: string;

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

export class AdminOrderAfterSalesRequestDto {
	@ApiProperty({ format: "uuid" })
	afterSalesRequestId!: string;

	@ApiProperty()
	requestNo!: string;

	@ApiPropertyOptional({ format: "uuid" })
	userId?: string;

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
	createdAt!: string;

	@ApiProperty()
	updatedAt!: string;
}

export class AdminOrderAfterSalesItemDto {
	@ApiProperty({ format: "uuid" })
	afterSalesItemId!: string;

	@ApiProperty({ format: "uuid" })
	afterSalesRequestId!: string;

	@ApiProperty({ format: "uuid" })
	orderItemId!: string;

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

export class AdminOrderStatusLogDto {
	@ApiProperty({ format: "uuid" })
	statusLogId!: string;

	@ApiProperty()
	statusType!: string;

	@ApiPropertyOptional()
	fromStatus?: string;

	@ApiProperty()
	toStatus!: string;

	@ApiPropertyOptional()
	reason?: string;

	@ApiProperty()
	operatorType!: string;

	@ApiPropertyOptional({ format: "uuid" })
	operatorId?: string;

	@ApiProperty({ type: "object", additionalProperties: true })
	metadata!: Record<string, unknown>;

	@ApiProperty()
	createdAt!: string;
}

export class AdminOrderDetailResponseDto extends StorefrontOrderDetailResponseDto {
	@ApiProperty({ type: () => AdminOrderCartOriginDto })
	cartOrigin!: AdminOrderCartOriginDto;

	@ApiProperty({ type: () => [AdminOrderPaymentOrderDto] })
	paymentOrders!: AdminOrderPaymentOrderDto[];

	@ApiProperty({ type: () => [AdminOrderPaymentTransactionDto] })
	paymentTransactions!: AdminOrderPaymentTransactionDto[];

	@ApiProperty({ type: () => [AdminOrderInventoryLockDto] })
	inventoryLocks!: AdminOrderInventoryLockDto[];

	@ApiProperty({ type: () => [AdminOrderInventoryTransactionDto] })
	inventoryTransactions!: AdminOrderInventoryTransactionDto[];

	@ApiProperty({ type: () => [AdminOrderFulfillmentOrderDto] })
	fulfillmentOrders!: AdminOrderFulfillmentOrderDto[];

	@ApiProperty({ type: () => [AdminOrderFulfillmentItemDto] })
	fulfillmentItems!: AdminOrderFulfillmentItemDto[];

	@ApiProperty({ type: () => [AdminOrderPaymentRefundDto] })
	paymentRefunds!: AdminOrderPaymentRefundDto[];

	@ApiProperty({ type: () => [AdminOrderAfterSalesRequestDto] })
	afterSalesRequests!: AdminOrderAfterSalesRequestDto[];

	@ApiProperty({ type: () => [AdminOrderAfterSalesItemDto] })
	afterSalesItems!: AdminOrderAfterSalesItemDto[];

	@ApiProperty({ type: () => [AdminOrderStatusLogDto] })
	statusLogs!: AdminOrderStatusLogDto[];
}
