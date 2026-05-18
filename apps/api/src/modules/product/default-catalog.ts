import type { SiteContext } from "../../common/site/site-context.js";
import type {
	ProductAttributeDefinition,
	ProductCatalog,
	ProductCatalogItem,
} from "./product.types.js";

const defaultProducts = [
	{
		id: "terra-pack",
		skuId: "terra-pack-default",
		skuCode: "TERRA-PACK-DEFAULT",
		slug: "terra-commuter-pack",
		name: "Terra commuter pack",
		category: "Travel",
		description:
			"Water-resistant 24L carry pack with laptop vault and quick-access passport pocket.",
		price: 128,
		compareAt: 168,
		currency: "USD",
		rating: 4.9,
		reviews: 824,
		image:
			"https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1200&q=85",
		badge: "Best seller",
		origin: "Vietnam",
		shipsIn: "Ships in 24h",
		availableQty: 28,
		stockStatus: "in_stock",
	},
	{
		id: "aero-cups",
		skuId: "aero-cups-default",
		skuCode: "AERO-CUPS-DEFAULT",
		slug: "aero-ceramic-cup-set",
		name: "Aero ceramic cup set",
		category: "Home",
		description:
			"Stackable, lead-free ceramic cups packed in drop-tested export cartons.",
		price: 46,
		currency: "USD",
		rating: 4.8,
		reviews: 312,
		image:
			"https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1200&q=85",
		badge: "New arrival",
		origin: "Portugal",
		shipsIn: "Ships in 48h",
		availableQty: 16,
		stockStatus: "in_stock",
	},
	{
		id: "luma-watch",
		skuId: "luma-watch-default",
		skuCode: "LUMA-WATCH-DEFAULT",
		slug: "luma-fitness-watch",
		name: "Luma fitness watch",
		category: "Electronics",
		description:
			"Multisport watch with 10-day battery life, global warranty, and localized manuals.",
		price: 214,
		compareAt: 249,
		currency: "USD",
		rating: 4.7,
		reviews: 1260,
		image:
			"https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=1200&q=85",
		badge: "Duty paid",
		origin: "Singapore",
		shipsIn: "Ships today",
		availableQty: 12,
		stockStatus: "in_stock",
	},
	{
		id: "solar-shades",
		skuId: "solar-shades-default",
		skuCode: "SOLAR-SHADES-DEFAULT",
		slug: "solar-polarized-shades",
		name: "Solar polarized shades",
		category: "Accessories",
		description:
			"Lightweight polarized sunglasses with recycled acetate frames and hard travel case.",
		price: 86,
		currency: "USD",
		rating: 4.8,
		reviews: 543,
		image:
			"https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1200&q=85",
		badge: "Summer edit",
		origin: "Italy",
		shipsIn: "Ships in 24h",
		availableQty: 9,
		stockStatus: "in_stock",
	},
	{
		id: "pulse-headphones",
		skuId: "pulse-headphones-default",
		skuCode: "PULSE-HEADPHONES-DEFAULT",
		slug: "pulse-noise-cancel-headphones",
		name: "Pulse noise-cancel headphones",
		category: "Audio",
		description:
			"Foldable wireless headphones with adaptive ANC and multilingual quick start cards.",
		price: 179,
		currency: "USD",
		rating: 4.9,
		reviews: 980,
		image:
			"https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=85",
		badge: "Global warranty",
		origin: "South Korea",
		shipsIn: "Ships today",
		availableQty: 7,
		stockStatus: "in_stock",
	},
	{
		id: "nordic-lamp",
		skuId: "nordic-lamp-default",
		skuCode: "NORDIC-LAMP-DEFAULT",
		slug: "nordic-desk-lamp",
		name: "Nordic desk lamp",
		category: "Workspace",
		description:
			"Dimmable aluminum task lamp with universal plug adapters for major destinations.",
		price: 72,
		compareAt: 96,
		currency: "USD",
		rating: 4.6,
		reviews: 204,
		image:
			"https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1200&q=85",
		badge: "Low stock",
		origin: "Denmark",
		shipsIn: "Ships in 48h",
		availableQty: 3,
		stockStatus: "low_stock",
	},
] satisfies Omit<
	ProductCatalogItem,
	"siteId" | "verticalId" | "brandId" | "attributeValues"
>[];

function getCategories(products: ProductCatalogItem[]) {
	return [
		"All",
		...Array.from(new Set(products.map((product) => product.category))),
	];
}

export function createDefaultProductCatalog(
	site: SiteContext,
	currency = site.defaultCurrency,
): ProductCatalog {
	const products = defaultProducts.map((product) => ({
		...product,
		currency,
		siteId: site.siteId,
		verticalId: site.verticalId,
		brandId: site.brandId,
		attributeValues: [],
	}));

	return {
		siteId: site.siteId,
		siteCode: site.siteCode,
		verticalId: site.verticalId,
		verticalCode: site.verticalCode,
		brandId: site.brandId,
		brandCode: site.brandCode,
		currency,
		categories: getCategories(products),
		attributeDefinitions: createDefaultProductAttributeDefinitions(site),
		products,
	};
}

export function createDefaultProductAttributeDefinitions(
	site: SiteContext,
): ProductAttributeDefinition[] {
	return [
		{
			id: `${site.verticalId}:origin`,
			verticalId: site.verticalId,
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
		{
			id: `${site.verticalId}:badge`,
			verticalId: site.verticalId,
			code: "badge",
			name: "Merchandising Badge",
			type: "text",
			required: false,
			searchable: false,
			filterable: true,
			sortOrder: 20,
			status: "active",
			options: [],
		},
		{
			id: `${site.verticalId}:ships_in`,
			verticalId: site.verticalId,
			code: "ships_in",
			name: "Dispatch Promise",
			type: "text",
			required: false,
			searchable: false,
			filterable: true,
			sortOrder: 30,
			status: "active",
			options: [],
		},
	];
}
