import {
	type Currency,
	markets as defaultMarkets,
	products as defaultProducts,
	exchangeRates,
	type MarketOption,
	type ProductAttributeDefinition,
	type Product,
	type ProductStockStatus,
} from "@/lib/products";

export type CartLine = {
	productId: string;
	quantity: number;
};

export type CartItem = CartLine & {
	product: Product;
};

export type CartSummary = {
	items: CartItem[];
	quantity: number;
	subtotal: number;
	shipping: number;
	total: number;
};

export type ProductAttributeFilters = Record<string, string>;

export type ProductAttributeFilterOption = {
	code: string;
	name: string;
	values: string[];
};

export type ProductAvailability = {
	status: ProductStockStatus | "unknown";
	label: string;
	availableQty?: number;
};

const currencyLocales: Record<Currency, string> = {
	USD: "en-US",
	EUR: "de-DE",
	GBP: "en-GB",
};

export function formatMoney(value: number, currency: Currency) {
	return new Intl.NumberFormat(currencyLocales[currency], {
		style: "currency",
		currency,
		maximumFractionDigits: 0,
	}).format(value * exchangeRates[currency]);
}

export function filterProducts(
	category: string,
	productCatalog: Product[] = defaultProducts,
	attributeFilters: ProductAttributeFilters = {},
) {
	const categoryFiltered =
		category === "All"
			? productCatalog
			: productCatalog.filter((product) => product.category === category);

	const activeFilters = Object.entries(attributeFilters).filter(
		([, value]) => value,
	);

	if (activeFilters.length === 0) {
		return categoryFiltered;
	}

	return categoryFiltered.filter((product) =>
		activeFilters.every(([code, value]) =>
			getProductAttributeValues(product, code).includes(value),
		),
	);
}

function normalizeAttributeValue(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value.flatMap(normalizeAttributeValue);
	}

	if (typeof value === "string" && value.trim()) {
		return [value];
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return [String(value)];
	}

	return [];
}

function getProductAttributeValues(product: Product, code: string): string[] {
	const dynamicValues =
		product.attributeValues
			?.filter((attribute) => attribute.code === code)
			.flatMap((attribute) => normalizeAttributeValue(attribute.value)) ?? [];

	return [...new Set(dynamicValues)];
}

export function getAttributeFilterOptions(
	productCatalog: Product[] = defaultProducts,
	attributeDefinitions: ProductAttributeDefinition[] = [],
): ProductAttributeFilterOption[] {
	return attributeDefinitions
		.filter((attribute) => attribute.filterable && attribute.status === "active")
		.map((attribute) => {
			const values = productCatalog.flatMap((product) =>
				getProductAttributeValues(product, attribute.code),
			);

			return {
				code: attribute.code,
				name: attribute.name,
				values: [...new Set(values)].sort((left, right) =>
					left.localeCompare(right),
				),
			};
		})
		.filter((option) => option.values.length > 0);
}

export function getDestinationMarket(
	market: string,
	marketCatalog: MarketOption[] = defaultMarkets,
): MarketOption {
	const fallbackMarket = marketCatalog[0] ?? defaultMarkets[0];

	return marketCatalog.find((item) => item.value === market) ?? fallbackMarket;
}

export function getProductDetailPath(product: Product | string) {
	const productId = typeof product === "string" ? product : product.id;

	return `/products/${encodeURIComponent(productId)}`;
}

export function normalizeProductRouteId(routeId: string) {
	try {
		return decodeURIComponent(routeId);
	} catch {
		return routeId;
	}
}

export function findProductByRouteId(
	productCatalog: Product[] = defaultProducts,
	routeId: string,
) {
	const productId = normalizeProductRouteId(routeId);

	return productCatalog.find((product) => product.id === productId) ?? null;
}

export function getProductAvailability(product: Product): ProductAvailability {
	if (product.stockStatus) {
		return {
			status: product.stockStatus,
			label: formatStockStatus(product.stockStatus, product.availableQty),
			...(typeof product.availableQty === "number"
				? { availableQty: product.availableQty }
				: {}),
		};
	}

	if (typeof product.availableQty !== "number") {
		return {
			status: "unknown",
			label: "Availability confirmed at checkout",
		};
	}

	if (product.availableQty <= 0) {
		return {
			status: "out_of_stock",
			label: "Out of stock",
			availableQty: product.availableQty,
		};
	}

	if (product.availableQty <= 5) {
		return {
			status: "low_stock",
			label: `Low stock: ${product.availableQty} left`,
			availableQty: product.availableQty,
		};
	}

	return {
		status: "in_stock",
		label: "In stock",
		availableQty: product.availableQty,
	};
}

function formatStockStatus(
	status: ProductStockStatus,
	availableQty: number | undefined,
) {
	if (status === "out_of_stock") {
		return "Out of stock";
	}

	if (status === "low_stock") {
		return typeof availableQty === "number" && availableQty > 0
			? `Low stock: ${availableQty} left`
			: "Low stock";
	}

	return "In stock";
}

export function addCartLine(lines: CartLine[], productId: string): CartLine[] {
	const existing = lines.find((line) => line.productId === productId);

	if (!existing) {
		return [...lines, { productId, quantity: 1 }];
	}

	return lines.map((line) =>
		line.productId === productId
			? { ...line, quantity: line.quantity + 1 }
			: line,
	);
}

export function updateCartQuantity(
	lines: CartLine[],
	productId: string,
	delta: number,
): CartLine[] {
	return lines
		.map((line) =>
			line.productId === productId
				? { ...line, quantity: Math.max(0, line.quantity + delta) }
				: line,
		)
		.filter((line) => line.quantity > 0);
}

export function pruneCartLinesForCatalog(
	lines: CartLine[],
	productCatalog: Product[] = defaultProducts,
): CartLine[] {
	const productIds = new Set(productCatalog.map((product) => product.id));

	return lines.filter((line) => productIds.has(line.productId));
}

export function getCartItems(
	lines: CartLine[],
	productCatalog: Product[] = defaultProducts,
): CartItem[] {
	return lines
		.map((line) => {
			const product = productCatalog.find((item) => item.id === line.productId);

			return product ? { ...line, product } : null;
		})
		.filter((line): line is CartItem => Boolean(line));
}

export function getCartSummary(
	lines: CartLine[],
	productCatalog: Product[] = defaultProducts,
	shippingThreshold = 180,
	shippingFee = 14,
): CartSummary {
	const items = getCartItems(lines, productCatalog);
	const quantity = items.reduce((total, item) => total + item.quantity, 0);
	const subtotal = items.reduce(
		(total, item) => total + item.product.price * item.quantity,
		0,
	);
	const shipping =
		subtotal > shippingThreshold || subtotal === 0 ? 0 : shippingFee;

	return {
		items,
		quantity,
		subtotal,
		shipping,
		total: subtotal + shipping,
	};
}
