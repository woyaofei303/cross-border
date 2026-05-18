import type { Currency } from "@/lib/products";

export const storefrontGuestTokenStorageKey = "cross-border-store:guest-token";
const storefrontGuestTokenCookieName = "cross_border_guest_token";

export type StorefrontCartItem = {
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
	siteId: string;
	verticalId: string;
	brandId: string;
};

export type StorefrontCart = {
	cartId?: string;
	siteId: string;
	siteCode: string;
	verticalId: string;
	brandId: string;
	currency: string;
	status: "active";
	items: StorefrontCartItem[];
	quantity: number;
	subtotalAmount: string;
	totalAmount: string;
};

type CartRequestInput = {
	guestToken: string;
	currency: Currency;
};

type AddCartItemInput = CartRequestInput & {
	skuId: string;
	quantity: number;
};

type UpdateCartItemInput = AddCartItemInput;

type RemoveCartItemInput = CartRequestInput & {
	skuId: string;
};

function getClientCryptoRandomId() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getBrowserCartStorage(): Storage | null {
	if (typeof window === "undefined") {
		return null;
	}

	try {
		return window.localStorage ?? null;
	} catch {
		return null;
	}
}

function readGuestTokenCookie() {
	if (typeof document === "undefined") {
		return null;
	}

	let cookieValue = "";

	try {
		cookieValue = document.cookie;
	} catch {
		return null;
	}

	const cookie = cookieValue
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${storefrontGuestTokenCookieName}=`));

	return cookie ? decodeURIComponent(cookie.split("=").slice(1).join("=")) : null;
}

function writeGuestTokenCookie(token: string) {
	if (typeof document === "undefined") {
		return;
	}

	try {
		document.cookie = `${storefrontGuestTokenCookieName}=${encodeURIComponent(
			token,
		)}; path=/; max-age=31536000; samesite=lax`;
	} catch {
		// Storage can be unavailable in embedded or privacy-restricted browsers.
	}
}

export function getOrCreateGuestToken(storage: Storage | null | undefined) {
	const existing = storage?.getItem(storefrontGuestTokenStorageKey);

	if (existing) {
		return existing;
	}

	const cookieToken = readGuestTokenCookie();

	if (cookieToken) {
		storage?.setItem(storefrontGuestTokenStorageKey, cookieToken);
		return cookieToken;
	}

	const token = `guest_${getClientCryptoRandomId()}`;

	storage?.setItem(storefrontGuestTokenStorageKey, token);
	writeGuestTokenCookie(token);

	return token;
}

export function getCartItemLineTotal(item: StorefrontCartItem) {
	const unitPrice = Number(item.displayUnitPrice);

	return Number.isFinite(unitPrice) ? unitPrice * item.quantity : 0;
}

export function getNextCartQuantity(currentQuantity: number, delta: number) {
	return Math.max(0, currentQuantity + delta);
}

async function parseCartResponse(response: Response): Promise<StorefrontCart> {
	const payload = (await response.json().catch(() => ({}))) as
		| StorefrontCart
		| { message?: string };

	if (!response.ok) {
		throw new Error(
			"message" in payload && payload.message
				? payload.message
				: "Cart operation failed.",
		);
	}

	return payload as StorefrontCart;
}

export async function fetchCurrentCart({
	guestToken,
	currency,
}: CartRequestInput) {
	const searchParams = new URLSearchParams({
		guestToken,
		currency,
	});

	return parseCartResponse(
		await fetch(`/api/cart?${searchParams.toString()}`, {
			cache: "no-store",
		}),
	);
}

export async function addCartItem({
	guestToken,
	currency,
	skuId,
	quantity,
}: AddCartItemInput) {
	return parseCartResponse(
		await fetch("/api/cart/items", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				guestToken,
				currency,
				skuId,
				quantity,
			}),
		}),
	);
}

export async function updateCartItemQuantity({
	guestToken,
	currency,
	skuId,
	quantity,
}: UpdateCartItemInput) {
	return parseCartResponse(
		await fetch(`/api/cart/items/${encodeURIComponent(skuId)}`, {
			method: "PATCH",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				guestToken,
				currency,
				quantity,
			}),
		}),
	);
}

export async function removeCartItem({
	guestToken,
	currency,
	skuId,
}: RemoveCartItemInput) {
	const searchParams = new URLSearchParams({
		guestToken,
		currency,
	});

	return parseCartResponse(
		await fetch(
			`/api/cart/items/${encodeURIComponent(skuId)}?${searchParams.toString()}`,
			{
				method: "DELETE",
			},
		),
	);
}
