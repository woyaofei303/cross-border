import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class AdminInventoryListQueryDto {
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

export class AdminInventoryBalanceListItemDto {
	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;

	@ApiProperty({ format: "uuid" })
	skuId!: string;

	@ApiProperty()
	skuCode!: string;

	@ApiPropertyOptional()
	skuTitle?: string;

	@ApiProperty({ format: "uuid" })
	productId!: string;

	@ApiProperty()
	productTitle!: string;

	@ApiProperty({ format: "uuid" })
	warehouseId!: string;

	@ApiProperty()
	warehouseCode!: string;

	@ApiProperty()
	warehouseName!: string;

	@ApiProperty()
	availableQty!: number;

	@ApiProperty()
	lockedQty!: number;

	@ApiProperty()
	physicalQty!: number;

	@ApiProperty()
	inboundQty!: number;

	@ApiProperty()
	safetyQty!: number;

	@ApiProperty()
	updatedAt!: string;
}

export class AdminInventoryLockListItemDto {
	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;

	@ApiProperty({ format: "uuid" })
	inventoryLockId!: string;

	@ApiProperty({ format: "uuid" })
	orderId!: string;

	@ApiPropertyOptional()
	orderNo?: string;

	@ApiProperty({ format: "uuid" })
	orderItemId!: string;

	@ApiProperty({ format: "uuid" })
	skuId!: string;

	@ApiPropertyOptional()
	skuCode?: string;

	@ApiProperty({ format: "uuid" })
	warehouseId!: string;

	@ApiPropertyOptional()
	warehouseCode?: string;

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

export class AdminInventoryTransactionListItemDto {
	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;

	@ApiProperty({ format: "uuid" })
	inventoryTransactionId!: string;

	@ApiProperty({ format: "uuid" })
	skuId!: string;

	@ApiPropertyOptional()
	skuCode?: string;

	@ApiProperty({ format: "uuid" })
	warehouseId!: string;

	@ApiPropertyOptional()
	warehouseCode?: string;

	@ApiPropertyOptional({ format: "uuid" })
	orderId?: string;

	@ApiPropertyOptional()
	orderNo?: string;

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

export class AdminInventoryBalanceListResponseDto {
	@ApiProperty({ type: () => [AdminInventoryBalanceListItemDto] })
	inventoryBalances!: AdminInventoryBalanceListItemDto[];
}

export class AdminInventoryLockListResponseDto {
	@ApiProperty({ type: () => [AdminInventoryLockListItemDto] })
	inventoryLocks!: AdminInventoryLockListItemDto[];
}

export class AdminInventoryTransactionListResponseDto {
	@ApiProperty({ type: () => [AdminInventoryTransactionListItemDto] })
	inventoryTransactions!: AdminInventoryTransactionListItemDto[];
}
