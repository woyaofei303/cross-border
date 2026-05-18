import type { SiteContext } from "../../common/site/site-context.js";
import type {
	CartBuyerScope,
	CartItem,
	CartRecord,
	CartSkuSnapshot,
} from "./cart.types.js";

export interface CartRepositoryPort {
	findActiveCart(scope: CartBuyerScope): Promise<CartRecord | null>;
	createCart(input: {
		scope: CartBuyerScope;
		currency: string;
		countryCode?: string;
	}): Promise<CartRecord>;
	findSkuForSite(input: {
		site: SiteContext;
		skuId: string;
		currency: string;
	}): Promise<CartSkuSnapshot | null>;
	upsertItem(input: {
		cart: CartRecord;
		sku: CartSkuSnapshot;
		quantity: number;
	}): Promise<void>;
	updateItemQuantity(input: {
		cart: CartRecord;
		skuId: string;
		quantity: number;
	}): Promise<void>;
	removeItem(input: { cart: CartRecord; skuId: string }): Promise<void>;
	listItems(cartId: string): Promise<CartItem[]>;
}
