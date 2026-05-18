import { BadRequestException, Injectable } from "@nestjs/common";
import {
	defaultSiteContext,
	getSiteDimensions,
	type SiteContext,
} from "../../common/site/site-context.js";
import { PgCartRepository } from "./repositories/pg-cart.repository.js";
import type {
	AddCartItemInput,
	CartBuyer,
	CartBuyerScope,
	CartRecord,
	CartSummary,
	RemoveCartItemInput,
	UpdateCartItemInput,
} from "./cart.types.js";

function assertBuyer(input: CartBuyer): void {
	if (!input.userId && !input.guestToken) {
		throw new BadRequestException({
			code: "CART_BUYER_REQUIRED",
			message: "Cart requires a user id or guest token.",
		});
	}
}

function assertQuantity(quantity: number): void {
	if (!Number.isInteger(quantity) || quantity <= 0) {
		throw new BadRequestException({
			code: "CART_QUANTITY_INVALID",
			message: "Cart item quantity must be a positive integer.",
		});
	}
}

function toMoney(value: number): string {
	return value.toFixed(2);
}

function buildBuyerScope(site: SiteContext, buyer: CartBuyer): CartBuyerScope {
	return {
		...getSiteDimensions(site),
		allowLegacyNullScope: site.siteId === defaultSiteContext.siteId,
		...(buyer.userId ? { userId: buyer.userId } : {}),
		...(buyer.guestToken ? { guestToken: buyer.guestToken } : {}),
	};
}

function buildCartSummary(input: {
	site: SiteContext;
	currency: string;
	cart?: CartRecord | null;
	items: Awaited<ReturnType<PgCartRepository["listItems"]>>;
}): CartSummary {
	const quantity = input.items.reduce((total, item) => total + item.quantity, 0);
	const subtotal = input.items.reduce(
		(total, item) => total + Number(item.displayUnitPrice) * item.quantity,
		0,
	);

	return {
		...getSiteDimensions(input.site),
		...(input.cart ? { cartId: input.cart.cartId } : {}),
		siteCode: input.site.siteCode,
		currency: input.currency,
		status: "active",
		items: input.items,
		quantity,
		subtotalAmount: toMoney(subtotal),
		totalAmount: toMoney(subtotal),
	};
}

@Injectable()
export class CartService {
	constructor(private readonly carts: PgCartRepository) {}

	async getCart(
		site: SiteContext,
		input: CartBuyer & { currency?: string },
	): Promise<CartSummary> {
		assertBuyer(input);

		const scope = buildBuyerScope(site, input);
		const cart = await this.carts.findActiveCart(scope);
		const currency = input.currency ?? cart?.currency ?? site.defaultCurrency;
		const items = cart ? await this.carts.listItems(cart.cartId) : [];

		return buildCartSummary({ site, currency, cart, items });
	}

	async addItem(site: SiteContext, input: AddCartItemInput): Promise<CartSummary> {
		assertBuyer(input);
		assertQuantity(input.quantity);

		const sku = await this.carts.findSkuForSite({
			site,
			skuId: input.skuId,
			currency: input.currency,
		});

		if (!sku) {
			throw new BadRequestException({
				code: "CART_SKU_NOT_SELLABLE_FOR_SITE",
				message: "SKU is not sellable for the current site.",
			});
		}

		const scope = buildBuyerScope(site, input);
		const cart =
			(await this.carts.findActiveCart(scope)) ??
			(await this.carts.createCart({
				scope,
				currency: input.currency,
				...(input.countryCode ? { countryCode: input.countryCode } : {}),
			}));

		await this.carts.upsertItem({
			cart,
			sku,
			quantity: input.quantity,
		});

		const items = await this.carts.listItems(cart.cartId);

		return buildCartSummary({ site, currency: cart.currency, cart, items });
	}

	async updateItem(
		site: SiteContext,
		input: UpdateCartItemInput,
	): Promise<CartSummary> {
		assertBuyer(input);
		assertQuantity(input.quantity);

		const currency = input.currency ?? site.defaultCurrency;
		const sku = await this.carts.findSkuForSite({
			site,
			skuId: input.skuId,
			currency,
		});

		if (!sku) {
			throw new BadRequestException({
				code: "CART_SKU_NOT_SELLABLE_FOR_SITE",
				message: "SKU is not sellable for the current site.",
			});
		}

		const scope = buildBuyerScope(site, input);
		const cart = await this.carts.findActiveCart(scope);

		if (!cart) {
			return buildCartSummary({ site, currency, cart: null, items: [] });
		}

		await this.carts.updateItemQuantity({
			cart,
			skuId: input.skuId,
			quantity: input.quantity,
		});

		const items = await this.carts.listItems(cart.cartId);

		return buildCartSummary({ site, currency: cart.currency, cart, items });
	}

	async removeItem(
		site: SiteContext,
		input: RemoveCartItemInput & { currency?: string },
	): Promise<CartSummary> {
		assertBuyer(input);

		const scope = buildBuyerScope(site, input);
		const cart = await this.carts.findActiveCart(scope);
		const currency = input.currency ?? cart?.currency ?? site.defaultCurrency;

		if (!cart) {
			return buildCartSummary({ site, currency, cart: null, items: [] });
		}

		await this.carts.removeItem({ cart, skuId: input.skuId });

		const items = await this.carts.listItems(cart.cartId);

		return buildCartSummary({ site, currency: cart.currency, cart, items });
	}
}
