import { Controller, Get, NotFoundException, Query, Req } from "@nestjs/common";
import {
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiQuery,
	ApiTags,
} from "@nestjs/swagger";
import type { AdminAccessAwareRequest } from "../../../common/admin/admin-access.js";
import {
	getResolvedSiteFromRequest,
	type SiteAwareRequest,
} from "../../../common/site/site-context.js";
import { AdminAccessService } from "../../admin-access/admin-access.service.js";
import { ProductCatalogService } from "../product.service.js";
import {
	AdminProductAttributesQueryDto,
	ProductAttributeDefinitionsResponseDto,
} from "./product.dto.js";

function resolveSiteOrThrow(request: SiteAwareRequest) {
	const site = getResolvedSiteFromRequest(request);

	if (!site) {
		throw new NotFoundException({
			code: "SITE_NOT_FOUND",
			message: "No active site is configured for this request domain.",
		});
	}

	return site;
}

@ApiTags("product-attributes")
@Controller("products/attributes")
export class ProductAttributeController {
	constructor(private readonly productCatalog: ProductCatalogService) {}

	@Get()
	@ApiOperation({
		summary: "List current-site vertical product attributes",
		description:
			"Uses the resolved request domain site context. The storefront must not pass a trusted vertical_id.",
	})
	@ApiOkResponse({ type: ProductAttributeDefinitionsResponseDto })
	@ApiNotFoundResponse({ description: "No active site is configured for domain." })
	async listCurrentSiteAttributes(
		@Req() request: SiteAwareRequest,
	): Promise<ProductAttributeDefinitionsResponseDto> {
		const site = resolveSiteOrThrow(request);

		return {
			attributes: await this.productCatalog.listAttributesForSite(site),
		};
	}
}

@ApiTags("admin-product-attributes")
@Controller("admin/product-attributes")
export class AdminProductAttributeController {
	constructor(
		private readonly productCatalog: ProductCatalogService,
		private readonly adminAccess: AdminAccessService,
	) {}

	@Get()
	@ApiOperation({
		summary: "List vertical product attributes for unified admin",
		description:
			"Returns dynamic product attributes filtered by the admin RBAC data scope.",
	})
	@ApiQuery({ name: "verticalId", required: false })
	@ApiOkResponse({ type: ProductAttributeDefinitionsResponseDto })
	async listAdminAttributes(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AdminProductAttributesQueryDto,
	): Promise<ProductAttributeDefinitionsResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);

		return {
			attributes: await this.productCatalog.listAttributesForAdmin(access, query),
		};
	}
}
