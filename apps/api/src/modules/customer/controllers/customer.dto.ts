import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	IsEmail,
	IsIn,
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	Length,
	Max,
	MaxLength,
	Min,
	ValidateNested,
} from "class-validator";
import type {
	GlobalUserSummary,
	SiteCustomerAddress,
	SiteCustomerProfile,
	SiteCustomerStatus,
	SiteCustomerSummary,
} from "../customer.types.js";

export class SiteCustomerAddressDto implements SiteCustomerAddress {
	@ApiProperty({ format: "uuid" })
	addressId!: string;

	@ApiProperty({ format: "uuid" })
	siteCustomerId!: string;

	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;

	@ApiPropertyOptional()
	label?: string;

	@ApiProperty()
	email!: string;

	@ApiProperty()
	fullName!: string;

	@ApiPropertyOptional()
	phone?: string;

	@ApiProperty()
	countryCode!: string;

	@ApiPropertyOptional()
	region?: string;

	@ApiProperty()
	city!: string;

	@ApiProperty()
	postalCode!: string;

	@ApiProperty()
	addressLine1!: string;

	@ApiPropertyOptional()
	addressLine2?: string;

	@ApiProperty()
	isDefault!: boolean;

	@ApiProperty()
	createdAt!: string;

	@ApiProperty()
	updatedAt!: string;
}

export class GlobalUserSummaryDto implements GlobalUserSummary {
	@ApiProperty({ format: "uuid" })
	userId!: string;

	@ApiPropertyOptional()
	email?: string;

	@ApiPropertyOptional()
	phone?: string;

	@ApiProperty()
	status!: SiteCustomerStatus;

	@ApiProperty()
	userType!: "guest" | "registered";

	@ApiProperty()
	riskLevel!: "normal" | "watch" | "high" | "blocked";

	@ApiProperty()
	createdAt!: string;

	@ApiProperty()
	updatedAt!: string;
}

export class SiteCustomerSummaryDto implements SiteCustomerSummary {
	@ApiProperty({ format: "uuid" })
	siteCustomerId!: string;

	@ApiPropertyOptional({ format: "uuid" })
	globalUserId?: string;

	@ApiPropertyOptional()
	guestToken?: string;

	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;

	@ApiPropertyOptional()
	email?: string;

	@ApiPropertyOptional()
	phone?: string;

	@ApiPropertyOptional()
	nickname?: string;

	@ApiProperty()
	membershipLevel!: string;

	@ApiProperty()
	points!: number;

	@ApiProperty()
	status!: SiteCustomerStatus;

	@ApiProperty()
	createdAt!: string;

	@ApiProperty()
	updatedAt!: string;
}

export class SiteCustomerProfileDto implements SiteCustomerProfile {
	@ApiPropertyOptional({ type: () => GlobalUserSummaryDto })
	globalUser?: GlobalUserSummaryDto;

	@ApiProperty({ type: () => SiteCustomerSummaryDto })
	siteCustomer!: SiteCustomerSummaryDto;

	@ApiProperty({ type: () => [SiteCustomerAddressDto] })
	addresses!: SiteCustomerAddressDto[];

	@ApiPropertyOptional({ type: () => SiteCustomerAddressDto })
	defaultAddress?: SiteCustomerAddressDto;
}

export class SiteCustomerAddressInputDto {
	@ApiPropertyOptional({ maxLength: 64 })
	@IsOptional()
	@IsString()
	@MaxLength(64)
	label?: string;

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

	@ApiProperty({ minLength: 2, maxLength: 8 })
	@IsString()
	@Length(2, 8)
	countryCode!: string;

	@ApiPropertyOptional({ maxLength: 120 })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	region?: string;

	@ApiProperty({ maxLength: 120 })
	@IsString()
	@Length(1, 120)
	city!: string;

	@ApiProperty({ maxLength: 32 })
	@IsString()
	@Length(1, 32)
	postalCode!: string;

	@ApiProperty({ maxLength: 240 })
	@IsString()
	@Length(1, 240)
	addressLine1!: string;

	@ApiPropertyOptional({ maxLength: 240 })
	@IsOptional()
	@IsString()
	@MaxLength(240)
	addressLine2?: string;
}

export class UpsertSiteCustomerDto {
	@ApiPropertyOptional({ maxLength: 128 })
	@IsOptional()
	@IsString()
	@Length(1, 128)
	guestToken?: string;

	@ApiProperty()
	@IsEmail()
	@MaxLength(320)
	email!: string;

	@ApiPropertyOptional({ maxLength: 64 })
	@IsOptional()
	@IsString()
	@MaxLength(64)
	phone?: string;

	@ApiPropertyOptional({ maxLength: 128 })
	@IsOptional()
	@IsString()
	@MaxLength(128)
	nickname?: string;

	@ApiPropertyOptional({ type: () => SiteCustomerAddressInputDto })
	@IsOptional()
	@ValidateNested()
	@Type(() => SiteCustomerAddressInputDto)
	defaultAddress?: SiteCustomerAddressInputDto;
}

export class UpsertSiteCustomerAddressDto extends SiteCustomerAddressInputDto {}

export class AdminCustomerListQueryDto {
	@ApiPropertyOptional({ enum: ["global", "vertical", "brand", "site"] })
	@IsOptional()
	@IsIn(["global", "vertical", "brand", "site"])
	scopeType?: "global" | "vertical" | "brand" | "site";

	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	scopeId?: string;

	@ApiPropertyOptional({ minimum: 1, maximum: 100, default: 100 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number;
}

export class AdminCustomerListItemDto extends SiteCustomerSummaryDto {
	@ApiPropertyOptional({ type: () => GlobalUserSummaryDto })
	globalUser?: GlobalUserSummaryDto;

	@ApiPropertyOptional({ type: () => SiteCustomerAddressDto })
	defaultAddress?: SiteCustomerAddressDto;

	@ApiProperty()
	orderCount!: number;

	@ApiProperty()
	lifetimeSpend!: string;

	@ApiPropertyOptional()
	currency?: string;
}

export class AdminCustomerListResponseDto {
	@ApiProperty({ type: () => [AdminCustomerListItemDto] })
	customers!: AdminCustomerListItemDto[];
}
