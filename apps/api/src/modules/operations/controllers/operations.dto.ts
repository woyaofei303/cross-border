import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class OperationsDashboardQueryDto {
	@ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number;
}

export class ProcessCommercePipelineRequestDto {
	@ApiPropertyOptional({ minimum: 1, maximum: 200, default: 50 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(200)
	limit?: number;
}

export class CommercePipelineResultItemDto {
	@ApiProperty()
	id!: string;

	@ApiProperty()
	status!: string;

	@ApiPropertyOptional()
	reason?: string;

	@ApiPropertyOptional()
	errorMessage?: string;
}

export class CommercePipelineBatchResultDto {
	@ApiProperty()
	claimed!: number;

	@ApiProperty()
	processed!: number;

	@ApiProperty()
	skipped!: number;

	@ApiProperty()
	alreadyProcessed!: number;

	@ApiProperty()
	failed!: number;

	@ApiProperty({ type: [CommercePipelineResultItemDto] })
	results!: CommercePipelineResultItemDto[];
}

export class CommercePipelineAnalyticsBatchResultDto {
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

	@ApiProperty({ type: [CommercePipelineResultItemDto] })
	results!: CommercePipelineResultItemDto[];
}

export class ProcessCommercePipelineResponseDto {
	@ApiProperty({ type: CommercePipelineBatchResultDto })
	paymentWebhooks!: CommercePipelineBatchResultDto;

	@ApiProperty({ type: CommercePipelineBatchResultDto })
	paymentSucceededEvents!: CommercePipelineBatchResultDto;

	@ApiProperty({ type: CommercePipelineAnalyticsBatchResultDto })
	analyticsEvents!: CommercePipelineAnalyticsBatchResultDto;
}

export class OperationsOrderRiskRowDto {
	@ApiProperty()
	id!: string;

	@ApiProperty()
	orderNo!: string;

	@ApiPropertyOptional()
	siteId?: string;

	@ApiPropertyOptional()
	verticalId?: string;

	@ApiPropertyOptional()
	brandId?: string;

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

	@ApiPropertyOptional()
	paymentNo?: string;

	@ApiPropertyOptional()
	paymentOrderStatus?: string;

	@ApiPropertyOptional()
	paymentChannelCode?: string;

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
}

export class OperationsPaymentWebhookRowDto {
	@ApiProperty()
	id!: string;

	@ApiPropertyOptional()
	paymentOrderId?: string;

	@ApiPropertyOptional()
	siteId?: string;

	@ApiPropertyOptional()
	verticalId?: string;

	@ApiPropertyOptional()
	brandId?: string;

	@ApiProperty()
	channelCode!: string;

	@ApiProperty()
	providerEventId!: string;

	@ApiProperty()
	eventType!: string;

	@ApiPropertyOptional()
	providerObjectId?: string;

	@ApiProperty()
	status!: string;

	@ApiPropertyOptional()
	errorMessage?: string;

	@ApiProperty()
	receivedAt!: string;

	@ApiPropertyOptional()
	processedAt?: string;
}

export class OperationsInventoryLockRowDto {
	@ApiProperty()
	id!: string;

	@ApiProperty()
	orderId!: string;

	@ApiProperty()
	orderItemId!: string;

	@ApiPropertyOptional()
	siteId?: string;

	@ApiPropertyOptional()
	verticalId?: string;

	@ApiPropertyOptional()
	brandId?: string;

	@ApiProperty()
	skuId!: string;

	@ApiProperty()
	warehouseId!: string;

	@ApiProperty()
	quantity!: number;

	@ApiProperty()
	status!: string;

	@ApiProperty()
	expiresAt!: string;

	@ApiPropertyOptional()
	releasedAt?: string;

	@ApiPropertyOptional()
	deductedAt?: string;

	@ApiProperty()
	createdAt!: string;
}

export class OperationsInventoryTransactionRowDto {
	@ApiProperty()
	id!: string;

	@ApiPropertyOptional()
	siteId?: string;

	@ApiPropertyOptional()
	verticalId?: string;

	@ApiPropertyOptional()
	brandId?: string;

	@ApiProperty()
	skuId!: string;

	@ApiProperty()
	warehouseId!: string;

	@ApiPropertyOptional()
	orderId?: string;

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

export class OperationsAfterSalesRequestRowDto {
	@ApiProperty()
	id!: string;

	@ApiProperty()
	requestNo!: string;

	@ApiProperty()
	orderId!: string;

	@ApiPropertyOptional()
	orderNo?: string;

	@ApiPropertyOptional()
	siteId?: string;

	@ApiPropertyOptional()
	verticalId?: string;

	@ApiPropertyOptional()
	brandId?: string;

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

export class OperationsPaymentRefundRowDto {
	@ApiProperty()
	id!: string;

	@ApiProperty()
	refundNo!: string;

	@ApiPropertyOptional()
	requestId?: string;

	@ApiPropertyOptional()
	requestNo?: string;

	@ApiProperty()
	paymentOrderId!: string;

	@ApiProperty()
	orderId!: string;

	@ApiPropertyOptional()
	siteId?: string;

	@ApiPropertyOptional()
	verticalId?: string;

	@ApiPropertyOptional()
	brandId?: string;

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

export class OperationsAuditLogRowDto {
	@ApiProperty({ enum: ["audit", "admin_operation"] })
	source!: "audit" | "admin_operation";

	@ApiProperty()
	id!: string;

	@ApiPropertyOptional()
	siteId?: string;

	@ApiPropertyOptional()
	verticalId?: string;

	@ApiPropertyOptional()
	brandId?: string;

	@ApiProperty({ enum: ["user", "admin", "system"] })
	actorType!: "user" | "admin" | "system";

	@ApiPropertyOptional()
	actorId?: string;

	@ApiProperty()
	action!: string;

	@ApiProperty()
	resourceType!: string;

	@ApiPropertyOptional()
	resourceId?: string;

	@ApiPropertyOptional()
	ipAddress?: string;

	@ApiPropertyOptional()
	requestId?: string;

	@ApiProperty()
	createdAt!: string;
}

export class OperationsRiskDashboardResponseDto {
	@ApiProperty({ type: [OperationsOrderRiskRowDto] })
	orders!: OperationsOrderRiskRowDto[];

	@ApiProperty({ type: [OperationsPaymentWebhookRowDto] })
	paymentWebhooks!: OperationsPaymentWebhookRowDto[];

	@ApiProperty({ type: [OperationsInventoryLockRowDto] })
	inventoryLocks!: OperationsInventoryLockRowDto[];

	@ApiProperty({ type: [OperationsInventoryTransactionRowDto] })
	inventoryTransactions!: OperationsInventoryTransactionRowDto[];

	@ApiProperty({ type: [OperationsAfterSalesRequestRowDto] })
	afterSalesRequests!: OperationsAfterSalesRequestRowDto[];

	@ApiProperty({ type: [OperationsPaymentRefundRowDto] })
	paymentRefunds!: OperationsPaymentRefundRowDto[];

	@ApiProperty({ type: [OperationsAuditLogRowDto] })
	auditLogs!: OperationsAuditLogRowDto[];
}
