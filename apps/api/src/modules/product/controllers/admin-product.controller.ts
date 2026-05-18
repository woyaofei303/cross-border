import {
	BadRequestException,
	Body,
	Controller,
	Get,
	NotFoundException,
	Param,
	Post,
	Query,
	Req,
} from "@nestjs/common";
import {
	ApiBadRequestResponse,
	ApiCreatedResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from "@nestjs/swagger";
import type {
	AdminAccessAwareRequest,
	AdminScope,
	AdminScopeType,
} from "../../../common/admin/admin-access.js";
import { AdminAccessService } from "../../admin-access/admin-access.service.js";
import { AdminAuditService } from "../../admin-audit/admin-audit.service.js";
import {
	CreateAdminProductAttributeOptionUseCase,
	CreateAdminProductAttributeUseCase,
	GetAdminProductDetailUseCase,
	ListAdminCategoriesUseCase,
	ListAdminProductsUseCase,
	UpdateAdminCategoryUseCase,
	UpdateAdminProductAttributeUseCase,
	UpdateAdminProductSkuUseCase,
	UpdateAdminProductStatusUseCase,
} from "../product.use-cases.js";
import {
	AdminCatalogListQueryDto,
	AdminProductCategoryDto,
	AdminProductCategoryListResponseDto,
	AdminProductDetailDto,
	AdminProductListResponseDto,
	CreateAdminProductAttributeDto,
	CreateAdminProductAttributeOptionDto,
	ProductAttributeDefinitionDto,
	UpdateAdminCategoryDto,
	UpdateAdminProductAttributeDto,
	UpdateAdminProductStatusDto,
	UpdateAdminSkuDto,
} from "./product.dto.js";

function selectedScopeFromQuery(
	query: AdminCatalogListQueryDto,
): AdminScope | undefined {
	if (!query.scopeType || query.scopeType === "global") {
		return query.scopeType === "global" ? { scopeType: "global" } : undefined;
	}

	if (!query.scopeId) {
		throw new BadRequestException({
			code: "ADMIN_SCOPE_ID_REQUIRED",
			message: "scopeId is required when scopeType is vertical, brand, or site.",
		});
	}

	return {
		scopeType: query.scopeType as Exclude<AdminScopeType, "global">,
		scopeId: query.scopeId,
	};
}

function limitFromQuery(limit: number | undefined): number | undefined {
	if (limit === undefined) {
		return undefined;
	}

	return Number(limit);
}

@ApiTags("admin-products")
@Controller("admin")
export class AdminProductController {
	constructor(
		private readonly adminAccess: AdminAccessService,
		private readonly adminAudit: AdminAuditService,
		private readonly listAdminProducts: ListAdminProductsUseCase,
		private readonly getAdminProductDetail: GetAdminProductDetailUseCase,
		private readonly listAdminCategories: ListAdminCategoriesUseCase,
		private readonly updateAdminProductStatus: UpdateAdminProductStatusUseCase,
		private readonly updateAdminProductSku: UpdateAdminProductSkuUseCase,
		private readonly updateAdminCategory: UpdateAdminCategoryUseCase,
		private readonly createAdminProductAttribute: CreateAdminProductAttributeUseCase,
		private readonly updateAdminProductAttribute: UpdateAdminProductAttributeUseCase,
		private readonly createAdminProductAttributeOption: CreateAdminProductAttributeOptionUseCase,
	) {}

	@Get("products")
	@ApiOperation({
		summary: "List products visible to the current admin data scope",
		description:
			"Returns scoped product catalog rows for the unified admin. Scope filters are applied on the server.",
	})
	@ApiOkResponse({ type: AdminProductListResponseDto })
	@ApiBadRequestResponse({ description: "Invalid selected scope." })
	async listProducts(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AdminCatalogListQueryDto,
	): Promise<AdminProductListResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const selectedScope = selectedScopeFromQuery(query);
		const limit = limitFromQuery(query.limit);
		const products = await this.listAdminProducts.execute({
			adminAccess: access,
			...(selectedScope ? { selectedScope } : {}),
			...(limit !== undefined ? { limit } : {}),
			...(query.status ? { status: query.status } : {}),
		});

		return { products };
	}

	@Get("products/:productId")
	@ApiOperation({
		summary: "Get product detail visible to the current admin data scope",
	})
	@ApiOkResponse({ type: AdminProductDetailDto })
	async getProductDetail(
		@Req() request: AdminAccessAwareRequest,
		@Param("productId") productId: string,
	): Promise<AdminProductDetailDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const detail = await this.getAdminProductDetail.execute({
			adminAccess: access,
			productId,
		});

		if (!detail) {
			throw new NotFoundException({
				code: "PRODUCT_NOT_FOUND",
				message: "Product was not found for this admin scope.",
			});
		}

		return detail;
	}

	@Get("categories")
	@ApiOperation({
		summary: "List product categories visible to the current admin data scope",
	})
	@ApiOkResponse({ type: AdminProductCategoryListResponseDto })
	async listCategories(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AdminCatalogListQueryDto,
	): Promise<AdminProductCategoryListResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const selectedScope = selectedScopeFromQuery(query);
		const limit = limitFromQuery(query.limit);
		const categories = await this.listAdminCategories.execute({
			adminAccess: access,
			...(selectedScope ? { selectedScope } : {}),
			...(limit !== undefined ? { limit } : {}),
		});

		return { categories };
	}

	@Post("products/:productId/status")
	@ApiOperation({
		summary: "Update product selling status with audit trail",
	})
	@ApiOkResponse({ type: AdminProductDetailDto })
	async updateProductStatus(
		@Req() request: AdminAccessAwareRequest,
		@Param("productId") productId: string,
		@Body() body: UpdateAdminProductStatusDto,
	) {
		const access = await this.adminAccess.resolveForRequest(request);
		const result = await this.updateAdminProductStatus.execute({
			adminAccess: access,
			productId,
			status: body.status,
		});

		if (!result) {
			throw new NotFoundException({
				code: "PRODUCT_NOT_FOUND",
				message: "Product was not found for this admin scope.",
			});
		}

		await this.adminAudit.record({
			request,
			access,
			action: "product.update_status",
			resourceType: "product",
			resourceId: productId,
			siteId: result.siteId,
			verticalId: result.verticalId,
			brandId: result.brandId,
			afterSnapshot: result,
		});

		return result;
	}

	@Post("skus/:skuId/update")
	@ApiOperation({
		summary: "Update SKU basics, status, and display price",
	})
	@ApiOkResponse({ type: Object })
	async updateSku(
		@Req() request: AdminAccessAwareRequest,
		@Param("skuId") skuId: string,
		@Body() body: UpdateAdminSkuDto,
	) {
		const access = await this.adminAccess.resolveForRequest(request);
		const result = await this.updateAdminProductSku.execute({
			adminAccess: access,
			skuId,
			...(body.title !== undefined ? { title: body.title } : {}),
			...(body.status ? { status: body.status } : {}),
			...(body.currency ? { currency: body.currency } : {}),
			...(body.listPrice !== undefined ? { listPrice: body.listPrice } : {}),
			...(body.salePrice !== undefined ? { salePrice: body.salePrice } : {}),
		});

		if (!result) {
			throw new NotFoundException({
				code: "SKU_NOT_FOUND",
				message: "SKU was not found for this admin scope.",
			});
		}

		await this.adminAudit.record({
			request,
			access,
			action: "product_sku.update",
			resourceType: "product_sku",
			resourceId: skuId,
			siteId: result.siteId,
			verticalId: result.verticalId,
			brandId: result.brandId,
			afterSnapshot: result,
		});

		return result;
	}

	@Post("categories/:categoryId/update")
	@ApiOperation({
		summary: "Update category metadata and active status",
	})
	@ApiOkResponse({ type: AdminProductCategoryDto })
	async updateCategory(
		@Req() request: AdminAccessAwareRequest,
		@Param("categoryId") categoryId: string,
		@Body() body: UpdateAdminCategoryDto,
	) {
		const access = await this.adminAccess.resolveForRequest(request);
		const result = await this.updateAdminCategory.execute({
			adminAccess: access,
			categoryId,
			...(body.name !== undefined ? { name: body.name } : {}),
			...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
			...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
		});

		if (!result) {
			throw new NotFoundException({
				code: "CATEGORY_NOT_FOUND",
				message: "Category was not found for this admin scope.",
			});
		}

		await this.adminAudit.record({
			request,
			access,
			action: "product_category.update",
			resourceType: "product_category",
			resourceId: categoryId,
			siteId: result.siteId,
			verticalId: result.verticalId,
			brandId: result.brandId,
			afterSnapshot: result,
		});

		return result;
	}

	@Post("product-attributes")
	@ApiOperation({
		summary: "Create or upsert a vertical product attribute",
	})
	@ApiCreatedResponse({ type: ProductAttributeDefinitionDto })
	async createAttribute(
		@Req() request: AdminAccessAwareRequest,
		@Body() body: CreateAdminProductAttributeDto,
	): Promise<ProductAttributeDefinitionDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const attribute = await this.createAdminProductAttribute.execute({
			adminAccess: access,
			verticalId: body.verticalId,
			code: body.code,
			name: body.name,
			type: body.type,
			required: body.required ?? false,
			searchable: body.searchable ?? false,
			filterable: body.filterable ?? false,
			sortOrder: body.sortOrder ?? 0,
			status: body.status ?? "active",
		});

		if (!attribute) {
			throw new NotFoundException({
				code: "VERTICAL_NOT_FOUND",
				message: "Vertical was not found for this admin scope.",
			});
		}

		await this.adminAudit.record({
			request,
			access,
			action: "product_attribute.create",
			resourceType: "product_attribute",
			resourceId: attribute.id,
			verticalId: attribute.verticalId,
			afterSnapshot: attribute,
		});

		return attribute;
	}

	@Post("product-attributes/:attributeId/update")
	@ApiOperation({
		summary: "Update a vertical product attribute",
	})
	@ApiOkResponse({ type: ProductAttributeDefinitionDto })
	async updateAttribute(
		@Req() request: AdminAccessAwareRequest,
		@Param("attributeId") attributeId: string,
		@Body() body: UpdateAdminProductAttributeDto,
	): Promise<ProductAttributeDefinitionDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const attribute = await this.updateAdminProductAttribute.execute({
			adminAccess: access,
			attributeId,
			...(body.name !== undefined ? { name: body.name } : {}),
			...(body.required !== undefined ? { required: body.required } : {}),
			...(body.searchable !== undefined ? { searchable: body.searchable } : {}),
			...(body.filterable !== undefined ? { filterable: body.filterable } : {}),
			...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
			...(body.status ? { status: body.status } : {}),
		});

		if (!attribute) {
			throw new NotFoundException({
				code: "ATTRIBUTE_NOT_FOUND",
				message: "Attribute was not found for this admin scope.",
			});
		}

		await this.adminAudit.record({
			request,
			access,
			action: "product_attribute.update",
			resourceType: "product_attribute",
			resourceId: attributeId,
			verticalId: attribute.verticalId,
			afterSnapshot: attribute,
		});

		return attribute;
	}

	@Post("product-attributes/:attributeId/options")
	@ApiOperation({
		summary: "Create or upsert a vertical product attribute option",
	})
	@ApiCreatedResponse({ type: ProductAttributeDefinitionDto })
	async createAttributeOption(
		@Req() request: AdminAccessAwareRequest,
		@Param("attributeId") attributeId: string,
		@Body() body: CreateAdminProductAttributeOptionDto,
	): Promise<ProductAttributeDefinitionDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const attribute = await this.createAdminProductAttributeOption.execute({
			adminAccess: access,
			attributeId,
			label: body.label,
			value: body.value,
			sortOrder: body.sortOrder ?? 0,
		});

		if (!attribute) {
			throw new NotFoundException({
				code: "ATTRIBUTE_NOT_FOUND",
				message: "Attribute was not found for this admin scope.",
			});
		}

		await this.adminAudit.record({
			request,
			access,
			action: "product_attribute_option.create",
			resourceType: "product_attribute",
			resourceId: attributeId,
			verticalId: attribute.verticalId,
			afterSnapshot: attribute,
		});

		return attribute;
	}
}
