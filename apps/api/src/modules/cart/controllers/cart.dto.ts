import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	Length,
	Matches,
	Min,
} from "class-validator";

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

export class GetCartQueryDto {
	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	userId?: string;

	@ApiPropertyOptional({ maxLength: 128 })
	@IsOptional()
	@IsString()
	@Length(1, 128)
	guestToken?: string;

	@ApiPropertyOptional({ example: "USD", pattern: CURRENCY_PATTERN.source })
	@IsOptional()
	@Matches(CURRENCY_PATTERN)
	currency?: string;
}

export class AddCartItemRequestDto {
	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	userId?: string;

	@ApiPropertyOptional({ maxLength: 128 })
	@IsOptional()
	@IsString()
	@Length(1, 128)
	guestToken?: string;

	@ApiProperty({ format: "uuid" })
	@IsUUID()
	skuId!: string;

	@ApiProperty({ minimum: 1 })
	@IsInt()
	@Min(1)
	quantity!: number;

	@ApiProperty({ example: "USD", pattern: CURRENCY_PATTERN.source })
	@Matches(CURRENCY_PATTERN)
	currency!: string;

	@ApiPropertyOptional({ maxLength: 8 })
	@IsOptional()
	@IsString()
	@Length(2, 8)
	countryCode?: string;
}

export class UpdateCartItemRequestDto {
	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	userId?: string;

	@ApiPropertyOptional({ maxLength: 128 })
	@IsOptional()
	@IsString()
	@Length(1, 128)
	guestToken?: string;

	@ApiProperty({ minimum: 1 })
	@IsInt()
	@Min(1)
	quantity!: number;

	@ApiPropertyOptional({ example: "USD", pattern: CURRENCY_PATTERN.source })
	@IsOptional()
	@Matches(CURRENCY_PATTERN)
	currency?: string;
}

export class RemoveCartItemQueryDto {
	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	userId?: string;

	@ApiPropertyOptional({ maxLength: 128 })
	@IsOptional()
	@IsString()
	@Length(1, 128)
	guestToken?: string;

	@ApiPropertyOptional({ example: "USD", pattern: CURRENCY_PATTERN.source })
	@IsOptional()
	@Matches(CURRENCY_PATTERN)
	currency?: string;
}

export class CartItemResponseDto {
	@ApiProperty({ format: "uuid" })
	cartItemId!: string;

	@ApiProperty({ format: "uuid" })
	skuId!: string;

	@ApiProperty()
	skuCode!: string;

	@ApiProperty({ format: "uuid" })
	productId!: string;

	@ApiProperty()
	productTitle!: string;

	@ApiPropertyOptional()
	skuTitle?: string;

	@ApiPropertyOptional()
	imageUrl?: string;

	@ApiProperty({ minimum: 1 })
	quantity!: number;

	@ApiProperty()
	displayUnitPrice!: string;

	@ApiProperty()
	displayCurrency!: string;

	@ApiProperty()
	selected!: boolean;

	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;
}

export class CartResponseDto {
	@ApiPropertyOptional({ format: "uuid" })
	cartId?: string;

	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty()
	siteCode!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;

	@ApiProperty()
	currency!: string;

	@ApiProperty()
	status!: "active";

	@ApiProperty({ type: [CartItemResponseDto] })
	items!: CartItemResponseDto[];

	@ApiProperty({ minimum: 0 })
	quantity!: number;

	@ApiProperty()
	subtotalAmount!: string;

	@ApiProperty()
	totalAmount!: string;
}
