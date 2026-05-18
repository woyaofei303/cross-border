import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, IsUUID, Length } from "class-validator";

export class CreateFulfillmentRequestDto {
	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	fulfillmentOrderId?: string;

	@ApiPropertyOptional({ maxLength: 64 })
	@IsOptional()
	@IsString()
	@Length(1, 64)
	fulfillmentNo?: string;

	@ApiProperty({ format: "uuid" })
	@IsUUID()
	orderId!: string;

	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	warehouseId?: string;
}

export class CreateFulfillmentResponseDto {
	@ApiProperty({ format: "uuid" })
	fulfillmentOrderId!: string;

	@ApiProperty()
	fulfillmentNo!: string;

	@ApiProperty({ format: "uuid" })
	orderId!: string;

	@ApiProperty()
	orderNo!: string;

	@ApiProperty()
	status!: string;

	@ApiProperty()
	itemCount!: number;

	@ApiProperty()
	reusedIdempotency!: boolean;
}

export class ShipFulfillmentRequestDto {
	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	shipmentId?: string;

	@ApiProperty({ maxLength: 64 })
	@IsString()
	@Length(2, 64)
	providerCode!: string;

	@ApiProperty({ maxLength: 128 })
	@IsString()
	@Length(2, 128)
	providerName!: string;

	@ApiProperty({ maxLength: 128 })
	@IsString()
	@Length(2, 128)
	trackingNo!: string;
}

export class ShipFulfillmentResponseDto {
	@ApiProperty({ format: "uuid" })
	shipmentId!: string;

	@ApiProperty({ format: "uuid" })
	fulfillmentOrderId!: string;

	@ApiProperty()
	providerCode!: string;

	@ApiProperty()
	trackingNo!: string;

	@ApiProperty()
	status!: string;

	@ApiProperty()
	reusedIdempotency!: boolean;
}

export class DeliverShipmentRequestDto {
	@ApiPropertyOptional({ format: "date-time" })
	@IsOptional()
	@IsDateString()
	deliveredAt?: string;

	@ApiPropertyOptional({ maxLength: 512 })
	@IsOptional()
	@IsString()
	@Length(1, 512)
	description?: string;

	@ApiPropertyOptional({ maxLength: 255 })
	@IsOptional()
	@IsString()
	@Length(1, 255)
	location?: string;
}

export class DeliverShipmentResponseDto {
	@ApiProperty({ enum: ["processed", "already_delivered"] })
	status!: "processed" | "already_delivered";

	@ApiProperty({ format: "uuid" })
	shipmentId!: string;

	@ApiProperty()
	shipmentStatus!: string;
}
