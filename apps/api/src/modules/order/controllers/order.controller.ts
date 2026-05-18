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
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from "@nestjs/swagger";
import {
	createDefaultLockExpiry,
	createPublicNumber,
	createUuid,
} from "../../../common/ids/public-ids.js";
import {
	getResolvedSiteFromRequest,
	getSiteDimensions,
	type SiteAwareRequest,
} from "../../../common/site/site-context.js";
import {
	CreateOrderUseCase,
	GetStorefrontOrderDetailUseCase,
	GetOrderCheckoutResultUseCase,
	ListStorefrontOrdersUseCase,
} from "../order.use-cases.js";
import {
	CreateOrderRequestDto,
	CreateOrderResponseDto,
	OrderCheckoutResultQueryDto,
	OrderCheckoutResultResponseDto,
	OrderListQueryDto,
	StorefrontOrderDetailResponseDto,
	StorefrontOrderListResponseDto,
} from "./order.dto.js";

@ApiTags("orders")
@Controller("orders")
export class OrderController {
	constructor(
		private readonly createOrderUseCase: CreateOrderUseCase,
		private readonly getOrderCheckoutResultUseCase: GetOrderCheckoutResultUseCase,
		private readonly listStorefrontOrdersUseCase: ListStorefrontOrdersUseCase,
		private readonly getStorefrontOrderDetailUseCase: GetStorefrontOrderDetailUseCase,
	) {}

	@Post()
	@ApiOperation({
		summary: "Create an order and lock inventory",
		description:
			"Creates an immutable order snapshot, writes status logs, locks inventory, and queues domain events in the outbox.",
	})
	@ApiCreatedResponse({ type: CreateOrderResponseDto })
	@ApiBadRequestResponse({
		description: "Invalid request shape or domain rule violation.",
	})
	async createOrder(
		@Req() request: SiteAwareRequest,
		@Body() body: CreateOrderRequestDto,
	): Promise<CreateOrderResponseDto> {
		const site = getResolvedSiteFromRequest(request);

		if (!site) {
			throw new NotFoundException({
				code: "SITE_NOT_FOUND",
				message: "No active site is configured for this request domain.",
			});
		}

		const orderId = body.orderId ?? createUuid();
		const orderNo = body.orderNo ?? createPublicNumber("order");
		const dimensions = getSiteDimensions(site);
		const result = await this.createOrderUseCase.execute({
			orderId,
			orderNo,
			...dimensions,
			...(body.userId ? { userId: body.userId } : {}),
			...(body.guestToken ? { guestToken: body.guestToken } : {}),
			idempotencyKey: body.idempotencyKey,
			currency: body.currency,
			subtotalAmount: body.subtotalAmount,
			discountAmount: body.discountAmount,
			shippingAmount: body.shippingAmount,
			taxAmount: body.taxAmount,
			totalAmount: body.totalAmount,
			items: body.items.map((item) => ({
				orderItemId: item.orderItemId ?? createUuid(),
				productId: item.productId,
				skuId: item.skuId,
				skuCode: item.skuCode,
				productTitle: item.productTitle,
				...(item.skuTitle ? { skuTitle: item.skuTitle } : {}),
				...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
				unitPrice: item.unitPrice,
				quantity: item.quantity,
				discountAmount: item.discountAmount,
				totalAmount: item.totalAmount,
				snapshot: item.snapshot ?? {},
				warehouseId: item.warehouseId,
				lockExpiresAt: item.lockExpiresAt ?? createDefaultLockExpiry(),
			})),
			...(body.shippingAddress
				? {
						shippingAddressSnapshot: {
							...body.shippingAddress,
						},
					}
				: {}),
			priceSnapshot: {
				currency: body.currency,
				subtotalAmount: body.subtotalAmount,
				discountAmount: body.discountAmount,
				shippingAmount: body.shippingAmount,
				taxAmount: body.taxAmount,
				totalAmount: body.totalAmount,
			},
		});

		return {
			orderId: result.order.orderId,
			orderNo: result.order.orderNo,
			siteId: dimensions.siteId,
			reusedIdempotency: result.reusedIdempotency,
			eventsQueued: result.events.length,
		};
	}

	@Get()
	@ApiOperation({
		summary: "List storefront orders for the current site and buyer",
		description:
			"Returns current-site orders owned by the supplied user or guest scope. Site is resolved from the request domain.",
	})
	@ApiOkResponse({ type: StorefrontOrderListResponseDto })
	@ApiBadRequestResponse({ description: "Missing buyer scope." })
	@ApiNotFoundResponse({ description: "Request domain has no active site." })
	async listStorefrontOrders(
		@Req() request: SiteAwareRequest,
		@Query() query: OrderListQueryDto,
	): Promise<StorefrontOrderListResponseDto> {
		const site = getResolvedSiteFromRequest(request);

		if (!site) {
			throw new NotFoundException({
				code: "SITE_NOT_FOUND",
				message: "No active site is configured for this request domain.",
			});
		}

		if (!query.userId && !query.guestToken) {
			throw new BadRequestException({
				code: "ORDER_BUYER_SCOPE_REQUIRED",
				message: "Order list requires userId or guestToken.",
			});
		}

		const dimensions = getSiteDimensions(site);
		const orders = await this.listStorefrontOrdersUseCase.execute({
			...dimensions,
			...(query.userId ? { userId: query.userId } : {}),
			...(query.guestToken ? { guestToken: query.guestToken } : {}),
			...(query.limit ? { limit: query.limit } : {}),
		});

		return { orders };
	}

	@Get(":orderId/checkout-result")
	@ApiOperation({
		summary: "Get checkout payment result from backend truth",
		description:
			"Returns current-site order, payment, fulfillment, aftersales, and latest payment order status for the owning shopper.",
	})
	@ApiOkResponse({ type: OrderCheckoutResultResponseDto })
	@ApiBadRequestResponse({ description: "Missing buyer scope." })
	@ApiNotFoundResponse({ description: "Order not found for site and buyer." })
	async getCheckoutResult(
		@Req() request: SiteAwareRequest,
		@Param("orderId") orderId: string,
		@Query() query: OrderCheckoutResultQueryDto,
	): Promise<OrderCheckoutResultResponseDto> {
		const site = getResolvedSiteFromRequest(request);

		if (!site) {
			throw new NotFoundException({
				code: "SITE_NOT_FOUND",
				message: "No active site is configured for this request domain.",
			});
		}

		if (!query.userId && !query.guestToken) {
			throw new BadRequestException({
				code: "ORDER_BUYER_SCOPE_REQUIRED",
				message: "Checkout result requires userId or guestToken.",
			});
		}

		const dimensions = getSiteDimensions(site);
		const result = await this.getOrderCheckoutResultUseCase.execute({
			orderId,
			...dimensions,
			...(query.userId ? { userId: query.userId } : {}),
			...(query.guestToken ? { guestToken: query.guestToken } : {}),
		});

		if (!result) {
			throw new NotFoundException({
				code: "ORDER_NOT_FOUND",
				message: "Order was not found for this site and buyer.",
			});
		}

		return result;
	}

	@Get(":orderId")
	@ApiOperation({
		summary: "Get storefront order detail for the current site and buyer",
		description:
			"Returns order status dimensions, item snapshots, latest payment order, and shipment tracking when available.",
	})
	@ApiOkResponse({ type: StorefrontOrderDetailResponseDto })
	@ApiBadRequestResponse({ description: "Missing buyer scope." })
	@ApiNotFoundResponse({ description: "Order not found for site and buyer." })
	async getStorefrontOrderDetail(
		@Req() request: SiteAwareRequest,
		@Param("orderId") orderId: string,
		@Query() query: OrderCheckoutResultQueryDto,
	): Promise<StorefrontOrderDetailResponseDto> {
		const site = getResolvedSiteFromRequest(request);

		if (!site) {
			throw new NotFoundException({
				code: "SITE_NOT_FOUND",
				message: "No active site is configured for this request domain.",
			});
		}

		if (!query.userId && !query.guestToken) {
			throw new BadRequestException({
				code: "ORDER_BUYER_SCOPE_REQUIRED",
				message: "Order detail requires userId or guestToken.",
			});
		}

		const dimensions = getSiteDimensions(site);
		const result = await this.getStorefrontOrderDetailUseCase.execute({
			orderId,
			...dimensions,
			...(query.userId ? { userId: query.userId } : {}),
			...(query.guestToken ? { guestToken: query.guestToken } : {}),
		});

		if (!result) {
			throw new NotFoundException({
				code: "ORDER_NOT_FOUND",
				message: "Order was not found for this site and buyer.",
			});
		}

		return result;
	}
}
