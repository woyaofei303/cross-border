import {
	Controller,
	Get,
	NotFoundException,
	Query,
	Req,
} from "@nestjs/common";
import {
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiQuery,
	ApiTags,
} from "@nestjs/swagger";
import {
	getResolvedSiteFromRequest,
	type SiteAwareRequest,
} from "../../../common/site/site-context.js";
import { ProductCatalogService } from "../product.service.js";
import { ProductCatalogResponseDto } from "./product.dto.js";

@ApiTags("products")
@Controller("products")
export class ProductController {
	constructor(private readonly productCatalog: ProductCatalogService) {}

	@Get()
	@ApiOperation({
		summary: "List current-site storefront products",
		description:
			"Uses the resolved request domain site context. The frontend must not pass a trusted site_id.",
	})
	@ApiQuery({ name: "currency", required: false })
	@ApiQuery({ name: "category", required: false })
	@ApiOkResponse({ type: ProductCatalogResponseDto })
	@ApiNotFoundResponse({ description: "No active site is configured for domain." })
	async listProducts(
		@Req() request: SiteAwareRequest,
		@Query("currency") currency: string | undefined,
		@Query("category") category: string | undefined,
	): Promise<ProductCatalogResponseDto> {
		const site = getResolvedSiteFromRequest(request);

		if (!site) {
			throw new NotFoundException({
				code: "SITE_NOT_FOUND",
				message: "No active site is configured for this request domain.",
			});
		}

		return this.productCatalog.listCatalogForSite(site, {
			currency,
			category,
		});
	}
}
