import { describe, expect, it } from "vitest";
import {
	buildCheckoutOrderPayload,
	getCheckoutItemTotal,
	toCheckoutAmount,
	type CheckoutShippingAddress,
} from "@/lib/storefront-checkout";
import type { StorefrontCart } from "@/lib/storefront-cart";

const shippingAddress: CheckoutShippingAddress = {
	email: "buyer@example.com",
	fullName: "Buyer Example",
	addressLine1: "100 Market Street",
	city: "San Francisco",
	region: "CA",
	postalCode: "94105",
	countryCode: "US",
};

const cart: StorefrontCart = {
	cartId: "cart-1",
	siteId: "site-1",
	siteCode: "default-site",
	verticalId: "vertical-1",
	brandId: "brand-1",
	currency: "USD",
	status: "active",
	quantity: 2,
	subtotalAmount: "100.00",
	totalAmount: "100.00",
	items: [
		{
			cartItemId: "cart-item-1",
			skuId: "sku-1",
			skuCode: "SKU-1",
			productId: "product-1",
			productTitle: "Product",
			quantity: 2,
			displayUnitPrice: "50.00",
			displayCurrency: "USD",
			selected: true,
			siteId: "site-1",
			verticalId: "vertical-1",
			brandId: "brand-1",
		},
	],
};

describe("storefront checkout helpers", () => {
	it("normalizes checkout money strings", () => {
		expect(toCheckoutAmount(12)).toBe("12.00");
		expect(toCheckoutAmount("12.5")).toBe("12.50");
		expect(toCheckoutAmount("bad")).toBe("0.00");
		expect(getCheckoutItemTotal(cart.items[0])).toBe("100.00");
	});

	it("builds a site-scoped order payload from cart snapshot", () => {
		const payload = buildCheckoutOrderPayload({
			cart,
			guestToken: "guest-1",
			currency: "USD",
			shippingAddress,
			warehouseBySkuId: new Map([["sku-1", "warehouse-1"]]),
			idempotencyKey: "checkout-order-1",
		});

		expect(payload).toMatchObject({
			guestToken: "guest-1",
			idempotencyKey: "checkout-order-1",
			currency: "USD",
			totalAmount: "100.00",
			shippingAddress: {
				email: "buyer@example.com",
				countryCode: "US",
			},
		});
		expect(payload.items[0]).toMatchObject({
			skuId: "sku-1",
			warehouseId: "warehouse-1",
			totalAmount: "100.00",
			snapshot: {
				siteId: "site-1",
				verticalId: "vertical-1",
				brandId: "brand-1",
			},
		});
	});

	it("fails fast when a cart SKU has no checkout warehouse", () => {
		expect(() =>
			buildCheckoutOrderPayload({
				cart,
				guestToken: "guest-1",
				currency: "USD",
				shippingAddress,
				warehouseBySkuId: new Map(),
				idempotencyKey: "checkout-order-1",
			}),
		).toThrow(/No checkout warehouse/);
	});
});
