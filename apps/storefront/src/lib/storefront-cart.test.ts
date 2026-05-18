import { afterEach, describe, expect, it } from "vitest";
import {
	getBrowserCartStorage,
	getCartItemLineTotal,
	getNextCartQuantity,
	getOrCreateGuestToken,
	storefrontGuestTokenStorageKey,
	type StorefrontCartItem,
} from "@/lib/storefront-cart";

function createStorage() {
	const values = new Map<string, string>();

	return {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => {
			values.set(key, value);
		},
	} as Storage;
}

const cartItem: StorefrontCartItem = {
	cartItemId: "cart-item-1",
	skuId: "sku-1",
	skuCode: "SKU-1",
	productId: "product-1",
	productTitle: "Demo product",
	quantity: 2,
	displayUnitPrice: "19.50",
	displayCurrency: "USD",
	selected: true,
	siteId: "site-1",
	verticalId: "vertical-1",
	brandId: "brand-1",
};

const originalDocumentDescriptor = Object.getOwnPropertyDescriptor(
	globalThis,
	"document",
);

describe("storefront cart helpers", () => {
	afterEach(() => {
		if (originalDocumentDescriptor) {
			Object.defineProperty(globalThis, "document", originalDocumentDescriptor);
			return;
		}

		Reflect.deleteProperty(globalThis, "document");
	});

	it("reuses an existing guest token from storage", () => {
		const storage = createStorage();
		storage.setItem(storefrontGuestTokenStorageKey, "guest-existing");

		expect(getOrCreateGuestToken(storage)).toBe("guest-existing");
	});

	it("creates and stores a guest token when none exists", () => {
		const storage = createStorage();
		const token = getOrCreateGuestToken(storage);

		expect(token).toMatch(/^guest_/);
		expect(storage.getItem(storefrontGuestTokenStorageKey)).toBe(token);
	});

	it("does not require browser storage to create a guest token", () => {
		expect(getOrCreateGuestToken(null)).toMatch(/^guest_/);
		expect(getBrowserCartStorage()).toBeNull();
	});

	it("creates a guest token when cookie access is blocked", () => {
		Object.defineProperty(globalThis, "document", {
			configurable: true,
			value: {
				get cookie() {
					throw new Error("cookie blocked");
				},
				set cookie(_value: string) {
					throw new Error("cookie blocked");
				},
			},
		});

		expect(getOrCreateGuestToken(null)).toMatch(/^guest_/);
	});

	it("calculates line totals and keeps quantity from going below zero", () => {
		expect(getCartItemLineTotal(cartItem)).toBe(39);
		expect(getNextCartQuantity(1, -1)).toBe(0);
		expect(getNextCartQuantity(1, 2)).toBe(3);
	});
});
