import { describe, expect, it } from "vitest";
import {
	addCartLine,
	type CartLine,
	filterProducts,
	findProductByRouteId,
	formatMoney,
	getAttributeFilterOptions,
	getCartSummary,
	getDestinationMarket,
	getProductAvailability,
	getProductDetailPath,
	pruneCartLinesForCatalog,
	updateCartQuantity,
} from "@/lib/commerce";
import type { MarketOption, Product } from "@/lib/products";

const catalog: Product[] = [
	{
		id: "pack",
		name: "Travel pack",
		category: "Travel",
		description: "Carry-on friendly pack.",
		price: 128,
		rating: 4.9,
		reviews: 80,
		image: "https://example.com/pack.jpg",
		badge: "Best seller",
		origin: "Vietnam",
		shipsIn: "Ships today",
		attributeValues: [
			{
				attributeId: "attr-origin",
				code: "origin",
				name: "Origin",
				type: "text",
				value: "Vietnam",
			},
		],
	},
	{
		id: "lamp",
		name: "Desk lamp",
		category: "Workspace",
		description: "Universal plug desk lamp.",
		price: 72,
		rating: 4.6,
		reviews: 20,
		image: "https://example.com/lamp.jpg",
		badge: "Low stock",
		origin: "Denmark",
		shipsIn: "Ships in 48h",
		attributeValues: [
			{
				attributeId: "attr-origin",
				code: "origin",
				name: "Origin",
				type: "text",
				value: "Denmark",
			},
		],
	},
];

const marketCatalog: MarketOption[] = [
	{
		value: "US",
		label: "United States",
		duty: "DDP included",
		delivery: "3-6 business days",
	},
	{
		value: "EU",
		label: "European Union",
		duty: "VAT ready",
		delivery: "4-8 business days",
	},
];

describe("commerce rules", () => {
	it("filters products by selected category while All returns the full catalog", () => {
		expect(filterProducts("All", catalog).map((product) => product.id)).toEqual(
			["pack", "lamp"],
		);
		expect(
			filterProducts("Workspace", catalog).map((product) => product.id),
		).toEqual(["lamp"]);
	});

	it("builds storefront filters from vertical dynamic attributes", () => {
		const filters = getAttributeFilterOptions(catalog, [
			{
				id: "attr-origin",
				verticalId: "vertical-1",
				code: "origin",
				name: "Origin",
				type: "text",
				required: false,
				searchable: true,
				filterable: true,
				sortOrder: 10,
				status: "active",
				options: [],
			},
		]);

		expect(filters).toEqual([
			{
				code: "origin",
				name: "Origin",
				values: ["Denmark", "Vietnam"],
			},
		]);
		expect(
			filterProducts("All", catalog, { origin: "Denmark" }).map(
				(product) => product.id,
			),
		).toEqual(["lamp"]);
	});

	it("formats prices in the selected storefront currency", () => {
		expect(formatMoney(128, "USD")).toBe("$128");
		expect(formatMoney(128, "EUR")).toBe("118 €");
		expect(formatMoney(128, "GBP")).toBe("£101");
	});

	it("builds stable product detail paths and resolves encoded route params", () => {
		expect(getProductDetailPath("pack/special")).toBe("/products/pack%2Fspecial");
		expect(findProductByRouteId(catalog, "pack")).toMatchObject({
			name: "Travel pack",
		});
		expect(findProductByRouteId(catalog, "missing")).toBeNull();
	});

	it("summarizes stock availability from catalog inventory hints", () => {
		expect(getProductAvailability({ ...catalog[0], availableQty: 12 })).toEqual({
			status: "in_stock",
			label: "In stock",
			availableQty: 12,
		});
		expect(getProductAvailability({ ...catalog[0], availableQty: 3 })).toEqual({
			status: "low_stock",
			label: "Low stock: 3 left",
			availableQty: 3,
		});
		expect(
			getProductAvailability({ ...catalog[0], stockStatus: "out_of_stock" }),
		).toMatchObject({
			status: "out_of_stock",
			label: "Out of stock",
		});
	});

	it("adds new cart lines and increments existing cart lines", () => {
		const emptyCart: CartLine[] = [];
		const withPack = addCartLine(emptyCart, "pack");

		expect(withPack).toEqual([{ productId: "pack", quantity: 1 }]);
		expect(addCartLine(withPack, "pack")).toEqual([
			{ productId: "pack", quantity: 2 },
		]);
	});

	it("removes cart lines when quantity reaches zero", () => {
		const cart: CartLine[] = [{ productId: "pack", quantity: 1 }];

		expect(updateCartQuantity(cart, "pack", -1)).toEqual([]);
	});

	it("prunes cart lines that are not in the current site catalog", () => {
		const cart: CartLine[] = [
			{ productId: "pack", quantity: 1 },
			{ productId: "other-site-product", quantity: 1 },
		];

		expect(pruneCartLinesForCatalog(cart, catalog)).toEqual([
			{ productId: "pack", quantity: 1 },
		]);
	});

	it("quotes subtotal, shipping and total for a destination cart", () => {
		const cart: CartLine[] = [
			{ productId: "pack", quantity: 1 },
			{ productId: "lamp", quantity: 1 },
		];

		expect(getCartSummary(cart, catalog)).toMatchObject({
			quantity: 2,
			subtotal: 200,
			shipping: 0,
			total: 200,
		});
		expect(
			getCartSummary([{ productId: "pack", quantity: 1 }], catalog),
		).toMatchObject({
			quantity: 1,
			subtotal: 128,
			shipping: 14,
			total: 142,
		});
	});

	it("returns destination market promises with a stable fallback", () => {
		expect(getDestinationMarket("EU", marketCatalog)).toMatchObject({
			label: "European Union",
			duty: "VAT ready",
			delivery: "4-8 business days",
		});
		expect(getDestinationMarket("UNKNOWN", marketCatalog)).toMatchObject({
			label: "United States",
			duty: "DDP included",
			delivery: "3-6 business days",
		});
	});
});
