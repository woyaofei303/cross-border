import type { SiteDimensions } from "../../common/site/site-context.js";

export type CartBuyer = {
	userId?: string;
	guestToken?: string;
};

export type CartBuyerScope = CartBuyer &
	SiteDimensions & {
		allowLegacyNullScope?: boolean;
	};

export type CartRecord = SiteDimensions & {
	cartId: string;
	userId?: string;
	guestToken?: string;
	currency: string;
	countryCode?: string;
	status: "active" | "converted" | "abandoned" | "closed";
};

export type CartSkuSnapshot = SiteDimensions & {
	skuId: string;
	skuCode: string;
	productId: string;
	productTitle: string;
	skuTitle?: string;
	imageUrl?: string;
	unitPrice: string;
	currency: string;
};

export type CartItem = SiteDimensions & {
	cartItemId: string;
	skuId: string;
	skuCode: string;
	productId: string;
	productTitle: string;
	skuTitle?: string;
	imageUrl?: string;
	quantity: number;
	displayUnitPrice: string;
	displayCurrency: string;
	selected: boolean;
};

export type CartSummary = SiteDimensions & {
	cartId?: string;
	siteCode: string;
	currency: string;
	status: "active";
	items: CartItem[];
	quantity: number;
	subtotalAmount: string;
	totalAmount: string;
};

export type AddCartItemInput = CartBuyer & {
	skuId: string;
	quantity: number;
	currency: string;
	countryCode?: string;
};

export type UpdateCartItemInput = CartBuyer & {
	skuId: string;
	quantity: number;
	currency?: string;
};

export type RemoveCartItemInput = CartBuyer & {
	skuId: string;
};
