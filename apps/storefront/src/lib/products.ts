export type Currency = "USD" | "EUR" | "GBP";

export type Market = "US" | "EU" | "UK";

export type MarketOption = {
	value: Market;
	label: string;
	duty: string;
	delivery: string;
};

export type ProductAttributeType =
	| "text"
	| "number"
	| "boolean"
	| "select"
	| "multiselect"
	| "json";

export type ProductAttributeDefinition = {
	id: string;
	verticalId: string;
	code: string;
	name: string;
	type: ProductAttributeType;
	required: boolean;
	searchable: boolean;
	filterable: boolean;
	sortOrder: number;
	status: "active" | "inactive" | "archived";
	options: {
		id: string;
		label: string;
		value: string;
		sortOrder: number;
	}[];
};

export type ProductAttributeValue = {
	attributeId: string;
	code: string;
	name: string;
	type: ProductAttributeType;
	value: unknown;
};

export type ProductStockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type Product = {
	id: string;
	skuId?: string;
	skuCode?: string;
	warehouseId?: string;
	slug?: string;
	name: string;
	category: string;
	description: string;
	price: number;
	compareAt?: number;
	currency?: string;
	rating: number;
	reviews: number;
	image: string;
	badge: string;
	origin: string;
	shipsIn: string;
	siteId?: string;
	verticalId?: string;
	brandId?: string;
	availableQty?: number;
	stockStatus?: ProductStockStatus;
	attributeValues?: ProductAttributeValue[];
};

export const currencies: Currency[] = ["USD", "EUR", "GBP"];

export const markets: MarketOption[] = [
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
	{
		value: "UK",
		label: "United Kingdom",
		duty: "IOSS aligned",
		delivery: "4-7 business days",
	},
];

export const exchangeRates: Record<Currency, number> = {
	USD: 1,
	EUR: 0.92,
	GBP: 0.79,
};

export const products: Product[] = [
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
];

export const categories = [
	"All",
	...Array.from(new Set(products.map((product) => product.category))),
];
