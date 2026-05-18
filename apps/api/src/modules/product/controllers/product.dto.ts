import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
	IsBoolean,
	IsIn,
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	Max,
	Min,
} from "class-validator";

export class ProductAttributeOptionDto {
	@ApiProperty()
	id!: string;

	@ApiProperty()
	label!: string;

	@ApiProperty()
	value!: string;

	@ApiProperty()
	sortOrder!: number;
}

export class ProductAttributeDefinitionDto {
	@ApiProperty()
	id!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty()
	code!: string;

	@ApiProperty()
	name!: string;

	@ApiProperty({
		enum: ["text", "number", "boolean", "select", "multiselect", "json"],
	})
	type!: "text" | "number" | "boolean" | "select" | "multiselect" | "json";

	@ApiProperty()
	required!: boolean;

	@ApiProperty()
	searchable!: boolean;

	@ApiProperty()
	filterable!: boolean;

	@ApiProperty()
	sortOrder!: number;

	@ApiProperty({ enum: ["active", "inactive", "archived"] })
	status!: "active" | "inactive" | "archived";

	@ApiProperty({ type: [ProductAttributeOptionDto] })
	options!: ProductAttributeOptionDto[];
}

export class ProductAttributeValueDto {
	@ApiProperty()
	attributeId!: string;

	@ApiProperty()
	code!: string;

	@ApiProperty()
	name!: string;

	@ApiProperty({
		enum: ["text", "number", "boolean", "select", "multiselect", "json"],
	})
	type!: "text" | "number" | "boolean" | "select" | "multiselect" | "json";

	@ApiProperty()
	value!: unknown;
}

export class ProductCatalogItemDto {
	@ApiProperty()
	id!: string;

	@ApiProperty()
	skuId!: string;

	@ApiProperty()
	skuCode!: string;

	@ApiPropertyOptional({ format: "uuid" })
	warehouseId?: string;

	@ApiProperty()
	slug!: string;

	@ApiProperty()
	name!: string;

	@ApiProperty()
	category!: string;

	@ApiProperty()
	description!: string;

	@ApiProperty()
	price!: number;

	@ApiPropertyOptional()
	compareAt?: number;

	@ApiProperty()
	currency!: string;

	@ApiProperty()
	rating!: number;

	@ApiProperty()
	reviews!: number;

	@ApiProperty()
	image!: string;

	@ApiProperty()
	badge!: string;

	@ApiProperty()
	origin!: string;

	@ApiProperty()
	shipsIn!: string;

	@ApiProperty()
	availableQty!: number;

	@ApiProperty()
	stockStatus!: "in_stock" | "low_stock" | "out_of_stock";

	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;

	@ApiProperty({ type: [ProductAttributeValueDto] })
	attributeValues!: ProductAttributeValueDto[];
}

export class ProductCatalogResponseDto {
	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty()
	siteCode!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty()
	verticalCode!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;

	@ApiProperty()
	brandCode!: string;

	@ApiProperty()
	currency!: string;

	@ApiProperty({ type: [String] })
	categories!: string[];

	@ApiProperty({ type: [ProductAttributeDefinitionDto] })
	attributeDefinitions!: ProductAttributeDefinitionDto[];

	@ApiProperty({ type: [ProductCatalogItemDto] })
	products!: ProductCatalogItemDto[];
}

export class ProductAttributeDefinitionsResponseDto {
	@ApiProperty({ type: [ProductAttributeDefinitionDto] })
	attributes!: ProductAttributeDefinitionDto[];
}

export class AdminProductAttributesQueryDto {
	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	verticalId?: string;
}

export class AdminCatalogListQueryDto {
	@ApiPropertyOptional({ enum: ["global", "vertical", "brand", "site"] })
	@IsOptional()
	@IsString()
	@IsIn(["global", "vertical", "brand", "site"])
	scopeType?: "global" | "vertical" | "brand" | "site";

	@ApiPropertyOptional({ format: "uuid" })
	@IsOptional()
	@IsUUID()
	scopeId?: string;

	@ApiPropertyOptional({ minimum: 1, maximum: 100 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number;

	@ApiPropertyOptional({ enum: ["draft", "active", "inactive", "archived"] })
	@IsOptional()
	@IsString()
	@IsIn(["draft", "active", "inactive", "archived"])
	status?: "draft" | "active" | "inactive" | "archived";
}

export class AdminProductListItemDto {
	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;

	@ApiProperty({ format: "uuid" })
	productId!: string;

	@ApiProperty()
	spuCode!: string;

	@ApiProperty()
	slug!: string;

	@ApiProperty()
	title!: string;

	@ApiProperty({ enum: ["draft", "active", "inactive", "archived"] })
	status!: "draft" | "active" | "inactive" | "archived";

	@ApiPropertyOptional({ format: "uuid" })
	categoryId?: string;

	@ApiPropertyOptional()
	categoryName?: string;

	@ApiProperty()
	skuCount!: number;

	@ApiProperty()
	activeSkuCount!: number;

	@ApiProperty()
	availableQty!: number;

	@ApiPropertyOptional()
	minPrice?: string;

	@ApiPropertyOptional()
	currency?: string;

	@ApiProperty()
	updatedAt!: string;

	@ApiPropertyOptional()
	publishedAt?: string;
}

export class AdminProductListResponseDto {
	@ApiProperty({ type: [AdminProductListItemDto] })
	products!: AdminProductListItemDto[];
}

export class AdminSkuPriceDto {
	@ApiProperty({ format: "uuid" })
	priceId!: string;

	@ApiProperty()
	currency!: string;

	@ApiPropertyOptional()
	regionCode?: string;

	@ApiProperty()
	listPrice!: string;

	@ApiPropertyOptional()
	salePrice?: string;
}

export class AdminProductSkuDto {
	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;

	@ApiProperty({ format: "uuid" })
	skuId!: string;

	@ApiProperty({ format: "uuid" })
	productId!: string;

	@ApiProperty()
	skuCode!: string;

	@ApiPropertyOptional()
	title?: string;

	@ApiProperty({ enum: ["active", "inactive", "archived"] })
	status!: "active" | "inactive" | "archived";

	@ApiProperty()
	attributes!: Record<string, unknown>;

	@ApiProperty()
	availableQty!: number;

	@ApiProperty()
	lockedQty!: number;

	@ApiProperty()
	physicalQty!: number;

	@ApiProperty({ type: [AdminSkuPriceDto] })
	prices!: AdminSkuPriceDto[];

	@ApiProperty()
	updatedAt!: string;
}

export class AdminProductMediaDto {
	@ApiProperty({ format: "uuid" })
	mediaId!: string;

	@ApiPropertyOptional({ format: "uuid" })
	skuId?: string;

	@ApiProperty({ enum: ["image", "video"] })
	mediaType!: "image" | "video";

	@ApiProperty()
	url!: string;

	@ApiPropertyOptional()
	altText?: string;

	@ApiProperty()
	sortOrder!: number;
}

export class AdminProductDetailDto extends AdminProductListItemDto {
	@ApiPropertyOptional()
	description?: string;

	@ApiPropertyOptional()
	seoTitle?: string;

	@ApiPropertyOptional()
	seoDescription?: string;

	@ApiProperty({ type: [String] })
	tags!: string[];

	@ApiProperty({ type: [AdminProductSkuDto] })
	skus!: AdminProductSkuDto[];

	@ApiProperty({ type: [AdminProductMediaDto] })
	media!: AdminProductMediaDto[];

	@ApiProperty({ type: [ProductAttributeValueDto] })
	attributeValues!: ProductAttributeValueDto[];

	@ApiProperty()
	createdAt!: string;
}

export class AdminProductCategoryDto {
	@ApiProperty({ format: "uuid" })
	siteId!: string;

	@ApiProperty({ format: "uuid" })
	verticalId!: string;

	@ApiProperty({ format: "uuid" })
	brandId!: string;

	@ApiProperty({ format: "uuid" })
	categoryId!: string;

	@ApiPropertyOptional({ format: "uuid" })
	parentId?: string;

	@ApiProperty()
	slug!: string;

	@ApiProperty()
	name!: string;

	@ApiProperty()
	sortOrder!: number;

	@ApiProperty()
	isActive!: boolean;

	@ApiProperty()
	productCount!: number;

	@ApiProperty()
	createdAt!: string;

	@ApiProperty()
	updatedAt!: string;
}

export class AdminProductCategoryListResponseDto {
	@ApiProperty({ type: [AdminProductCategoryDto] })
	categories!: AdminProductCategoryDto[];
}

export class UpdateAdminProductStatusDto {
	@ApiProperty({ enum: ["draft", "active", "inactive", "archived"] })
	@IsString()
	@IsIn(["draft", "active", "inactive", "archived"])
	status!: "draft" | "active" | "inactive" | "archived";
}

export class UpdateAdminSkuDto {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	title?: string;

	@ApiPropertyOptional({ enum: ["active", "inactive", "archived"] })
	@IsOptional()
	@IsString()
	@IsIn(["active", "inactive", "archived"])
	status?: "active" | "inactive" | "archived";

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	currency?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	listPrice?: string;

	@ApiPropertyOptional({ nullable: true })
	@IsOptional()
	salePrice?: string | null;
}

export class UpdateAdminCategoryDto {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	name?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	sortOrder?: number;

	@ApiPropertyOptional()
	@IsOptional()
	@IsBoolean()
	isActive?: boolean;
}

export class CreateAdminProductAttributeDto {
	@ApiProperty({ format: "uuid" })
	@IsUUID()
	verticalId!: string;

	@ApiProperty()
	@IsString()
	code!: string;

	@ApiProperty()
	@IsString()
	name!: string;

	@ApiProperty({
		enum: ["text", "number", "boolean", "select", "multiselect", "json"],
	})
	@IsString()
	@IsIn(["text", "number", "boolean", "select", "multiselect", "json"])
	type!: "text" | "number" | "boolean" | "select" | "multiselect" | "json";

	@ApiPropertyOptional()
	@IsOptional()
	@IsBoolean()
	required?: boolean;

	@ApiPropertyOptional()
	@IsOptional()
	@IsBoolean()
	searchable?: boolean;

	@ApiPropertyOptional()
	@IsOptional()
	@IsBoolean()
	filterable?: boolean;

	@ApiPropertyOptional()
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	sortOrder?: number;

	@ApiPropertyOptional({ enum: ["active", "inactive", "archived"] })
	@IsOptional()
	@IsString()
	@IsIn(["active", "inactive", "archived"])
	status?: "active" | "inactive" | "archived";
}

export class UpdateAdminProductAttributeDto {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	name?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsBoolean()
	required?: boolean;

	@ApiPropertyOptional()
	@IsOptional()
	@IsBoolean()
	searchable?: boolean;

	@ApiPropertyOptional()
	@IsOptional()
	@IsBoolean()
	filterable?: boolean;

	@ApiPropertyOptional()
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	sortOrder?: number;

	@ApiPropertyOptional({ enum: ["active", "inactive", "archived"] })
	@IsOptional()
	@IsString()
	@IsIn(["active", "inactive", "archived"])
	status?: "active" | "inactive" | "archived";
}

export class CreateAdminProductAttributeOptionDto {
	@ApiProperty()
	@IsString()
	label!: string;

	@ApiProperty()
	@IsString()
	value!: string;

	@ApiPropertyOptional()
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	sortOrder?: number;
}
