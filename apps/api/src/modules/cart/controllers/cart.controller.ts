import {
	Body,
	Controller,
	Delete,
	Get,
	NotFoundException,
	Param,
	Patch,
	Post,
	Query,
	Req,
} from "@nestjs/common";
import {
	ApiBadRequestResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from "@nestjs/swagger";
import {
	getResolvedSiteFromRequest,
	type SiteAwareRequest,
} from "../../../common/site/site-context.js";
import { CartService } from "../cart.service.js";
import {
	AddCartItemRequestDto,
	CartResponseDto,
	GetCartQueryDto,
	RemoveCartItemQueryDto,
	UpdateCartItemRequestDto,
} from "./cart.dto.js";

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

@ApiTags("cart")
@Controller("cart")
export class CartController {
	constructor(private readonly carts: CartService) {}

	@Get()
	@ApiOperation({
		summary: "Get current-site cart",
		description:
			"Uses request site context. The storefront must not pass trusted site_id.",
	})
	@ApiOkResponse({ type: CartResponseDto })
	@ApiNotFoundResponse({ description: "No active site is configured for domain." })
	@ApiBadRequestResponse({ description: "Missing buyer scope." })
	async getCart(
		@Req() request: SiteAwareRequest,
		@Query() query: GetCartQueryDto,
	): Promise<CartResponseDto> {
		const site = resolveSiteOrThrow(request);

		return this.carts.getCart(site, query);
	}

	@Post("items")
	@ApiOperation({
		summary: "Add a SKU to the current-site cart",
		description:
			"SKU eligibility is checked against the resolved site context before insertion.",
	})
	@ApiOkResponse({ type: CartResponseDto })
	@ApiNotFoundResponse({ description: "No active site is configured for domain." })
	@ApiBadRequestResponse({ description: "Invalid buyer, quantity, or SKU scope." })
	async addItem(
		@Req() request: SiteAwareRequest,
		@Body() body: AddCartItemRequestDto,
	): Promise<CartResponseDto> {
		const site = resolveSiteOrThrow(request);

		return this.carts.addItem(site, body);
	}

	@Patch("items/:skuId")
	@ApiOperation({
		summary: "Set a current-site cart item quantity",
		description:
			"Quantity changes keep the cart scoped to the resolved request site.",
	})
	@ApiOkResponse({ type: CartResponseDto })
	@ApiNotFoundResponse({ description: "No active site is configured for domain." })
	@ApiBadRequestResponse({ description: "Invalid buyer, quantity, or SKU scope." })
	async updateItem(
		@Req() request: SiteAwareRequest,
		@Param("skuId") skuId: string,
		@Body() body: UpdateCartItemRequestDto,
	): Promise<CartResponseDto> {
		const site = resolveSiteOrThrow(request);

		return this.carts.updateItem(site, {
			...body,
			skuId,
		});
	}

	@Delete("items/:skuId")
	@ApiOperation({
		summary: "Remove a SKU from the current-site cart",
	})
	@ApiOkResponse({ type: CartResponseDto })
	@ApiNotFoundResponse({ description: "No active site is configured for domain." })
	async removeItem(
		@Req() request: SiteAwareRequest,
		@Param("skuId") skuId: string,
		@Query() query: RemoveCartItemQueryDto,
	): Promise<CartResponseDto> {
		const site = resolveSiteOrThrow(request);

		return this.carts.removeItem(site, {
			...query,
			skuId,
		});
	}
}
