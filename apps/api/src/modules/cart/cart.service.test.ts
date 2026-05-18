import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { defaultSiteContext } from "../../common/site/site-context.js";
import type { PgCartRepository } from "./repositories/pg-cart.repository.js";
import { CartService } from "./cart.service.js";
import type {
	CartBuyerScope,
	CartItem,
	CartRecord,
	CartSkuSnapshot,
} from "./cart.types.js";

class MemoryCartRepository {
	cart: CartRecord | null = null;
	items: CartItem[] = [];
	lastBuyerScope: CartBuyerScope | null = null;
	sku: CartSkuSnapshot | null = {
		siteId: defaultSiteContext.siteId,
		verticalId: defaultSiteContext.verticalId,
		brandId: defaultSiteContext.brandId,
		skuId: "00000000-0000-4000-8000-00000000c001",
		skuCode: "SKU-1",
		productId: "00000000-0000-4000-8000-00000000a001",
		productTitle: "Site Product",
		unitPrice: "25.00",
		currency: "USD",
	};

	async findActiveCart(scope: CartBuyerScope): Promise<CartRecord | null> {
		this.lastBuyerScope = scope;
		return this.cart;
	}

	async createCart(input: {
		scope: CartBuyerScope;
		currency: string;
		countryCode?: string;
	}): Promise<CartRecord> {
		this.cart = {
			siteId: input.scope.siteId,
			verticalId: input.scope.verticalId,
			brandId: input.scope.brandId,
			cartId: "00000000-0000-4000-8000-00000000b001",
			...(input.scope.guestToken ? { guestToken: input.scope.guestToken } : {}),
			currency: input.currency,
			...(input.countryCode ? { countryCode: input.countryCode } : {}),
			status: "active",
		};

		return this.cart;
	}

	async findSkuForSite(): Promise<CartSkuSnapshot | null> {
		return this.sku;
	}

	async upsertItem(input: {
		cart: CartRecord;
		sku: CartSkuSnapshot;
		quantity: number;
	}): Promise<void> {
		this.items = [
			{
				siteId: input.cart.siteId,
				verticalId: input.cart.verticalId,
				brandId: input.cart.brandId,
				cartItemId: "00000000-0000-4000-8000-00000000d001",
				skuId: input.sku.skuId,
				skuCode: input.sku.skuCode,
				productId: input.sku.productId,
				productTitle: input.sku.productTitle,
				quantity: input.quantity,
				displayUnitPrice: input.sku.unitPrice,
				displayCurrency: input.sku.currency,
				selected: true,
			},
		];
	}

	async removeItem(): Promise<void> {
		this.items = [];
	}

	async updateItemQuantity(input: {
		skuId: string;
		quantity: number;
	}): Promise<void> {
		this.items = this.items.map((item) =>
			item.skuId === input.skuId
				? { ...item, quantity: input.quantity }
				: item,
		);
	}

	async listItems(): Promise<CartItem[]> {
		return this.items;
	}
}

function createService(repository = new MemoryCartRepository()) {
	return {
		repository,
		service: new CartService(repository as unknown as PgCartRepository),
	};
}

describe("CartService", () => {
	it("creates a current-site cart and adds scoped SKU items", async () => {
		const { repository, service } = createService();

		const cart = await service.addItem(defaultSiteContext, {
			guestToken: "guest-1",
			skuId: "00000000-0000-4000-8000-00000000c001",
			quantity: 2,
			currency: "USD",
		});

		expect(repository.lastBuyerScope).toMatchObject({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			allowLegacyNullScope: true,
			guestToken: "guest-1",
		});
		expect(cart).toMatchObject({
			siteId: defaultSiteContext.siteId,
			siteCode: "default-site",
			quantity: 2,
			subtotalAmount: "50.00",
			items: [{ skuCode: "SKU-1", siteId: defaultSiteContext.siteId }],
		});
	});

	it("returns an empty current-site cart when no active cart exists", async () => {
		const { service } = createService();

		await expect(
			service.getCart(defaultSiteContext, {
				guestToken: "guest-1",
				currency: "USD",
			}),
		).resolves.toMatchObject({
			siteId: defaultSiteContext.siteId,
			items: [],
			quantity: 0,
			totalAmount: "0.00",
		});
	});

	it("rejects adding a SKU that is not sellable for the current site", async () => {
		const repository = new MemoryCartRepository();
		repository.sku = null;
		const { service } = createService(repository);

		await expect(
			service.addItem(defaultSiteContext, {
				guestToken: "guest-1",
				skuId: "00000000-0000-4000-8000-00000000c001",
				quantity: 1,
				currency: "USD",
			}),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it("sets quantity for an existing current-site cart line", async () => {
		const { service } = createService();

		await service.addItem(defaultSiteContext, {
			guestToken: "guest-1",
			skuId: "00000000-0000-4000-8000-00000000c001",
			quantity: 1,
			currency: "USD",
		});

		await expect(
			service.updateItem(defaultSiteContext, {
				guestToken: "guest-1",
				skuId: "00000000-0000-4000-8000-00000000c001",
				quantity: 3,
				currency: "USD",
			}),
		).resolves.toMatchObject({
			quantity: 3,
			subtotalAmount: "75.00",
			items: [{ quantity: 3 }],
		});
	});
});
