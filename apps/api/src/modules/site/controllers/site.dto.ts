import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SiteConfigResponseDto {
	@ApiProperty()
	theme!: string;

	@ApiPropertyOptional()
	logoUrl?: string;

	@ApiPropertyOptional()
	primaryColor?: string;

	@ApiProperty({ type: [String] })
	enabledLanguages!: string[];

	@ApiProperty({ type: [String] })
	enabledCurrencies!: string[];

	@ApiProperty({ type: [String] })
	paymentChannels!: string[];

	@ApiProperty({ type: [String] })
	shippingCountries!: string[];

	@ApiPropertyOptional()
	seoTitle?: string;

	@ApiPropertyOptional()
	seoDescription?: string;

	@ApiProperty({ type: [String] })
	seoKeywords!: string[];
}

export class CurrentSiteResponseDto {
	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty()
	siteCode!: string;

	@ApiProperty()
	siteName!: string;

	@ApiProperty()
	domain!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty()
	verticalCode!: string;

	@ApiProperty()
	verticalName!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;

	@ApiProperty()
	brandCode!: string;

	@ApiProperty()
	brandName!: string;

	@ApiProperty()
	defaultLanguage!: string;

	@ApiProperty()
	defaultCurrency!: string;

	@ApiProperty({ enum: ["database", "default"] })
	resolvedFrom!: "database" | "default";

	@ApiProperty({ type: SiteConfigResponseDto })
	config!: SiteConfigResponseDto;
}

export class AdminSiteResponseDto {
	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty()
	siteCode!: string;

	@ApiProperty()
	siteName!: string;

	@ApiProperty()
	domain!: string;

	@ApiProperty()
	defaultDomain!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty()
	verticalCode!: string;

	@ApiProperty()
	verticalName!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;

	@ApiProperty()
	brandCode!: string;

	@ApiProperty()
	brandName!: string;

	@ApiProperty()
	defaultLanguage!: string;

	@ApiProperty()
	defaultCurrency!: string;

	@ApiProperty({ enum: ["active", "inactive", "archived"] })
	status!: "active" | "inactive" | "archived";

	@ApiPropertyOptional()
	createdAt?: string;

	@ApiPropertyOptional()
	updatedAt?: string;

	@ApiProperty({ type: SiteConfigResponseDto })
	config!: SiteConfigResponseDto;
}

export class AdminSitesResponseDto {
	@ApiProperty({ type: [AdminSiteResponseDto] })
	sites!: AdminSiteResponseDto[];
}

export class AdminVerticalResponseDto {
	@ApiProperty({ format: "uuid" })
	id!: string;

	@ApiProperty()
	code!: string;

	@ApiProperty()
	name!: string;

	@ApiPropertyOptional()
	description?: string;

	@ApiProperty({ enum: ["active", "inactive", "archived"] })
	status!: "active" | "inactive" | "archived";
}

export class AdminVerticalsResponseDto {
	@ApiProperty({ type: [AdminVerticalResponseDto] })
	verticals!: AdminVerticalResponseDto[];
}

export class AdminBrandResponseDto {
	@ApiProperty({ format: "uuid" })
	id!: string;

	@ApiProperty()
	code!: string;

	@ApiProperty()
	name!: string;

	@ApiPropertyOptional()
	logoUrl?: string;

	@ApiProperty({ enum: ["active", "inactive", "archived"] })
	status!: "active" | "inactive" | "archived";
}

export class AdminBrandsResponseDto {
	@ApiProperty({ type: [AdminBrandResponseDto] })
	brands!: AdminBrandResponseDto[];
}

export class AdminScopeResponseDto {
	@ApiProperty({ enum: ["global", "vertical", "brand", "site"] })
	scopeType!: "global" | "vertical" | "brand" | "site";

	@ApiPropertyOptional({ format: "uuid" })
	scopeId?: string;
}

export class AdminAccessContextResponseDto {
	@ApiProperty({ enum: ["database", "fallback", "database_unavailable"] })
	source!: "database" | "fallback" | "database_unavailable";

	@ApiPropertyOptional({ format: "uuid" })
	adminUserId?: string;

	@ApiProperty({ type: [AdminScopeResponseDto] })
	scopes!: AdminScopeResponseDto[];
}
