import type { Currency } from "@/lib/products";
import type { StorefrontCart, StorefrontCartItem } from "@/lib/storefront-cart";

export const storefrontCheckoutDraftStorageKey =
	"cross-border-store:checkout-draft";

export type CheckoutShippingAddress = {
	email: string;
	fullName: string;
	phone?: string;
	addressLine1: string;
	addressLine2?: string;
	city: string;
	region?: string;
	postalCode: string;
	countryCode: string;
};

export type CheckoutWarehouseOption = {
	skuId: string;
	warehouseId: string;
};

export type StorefrontCheckoutDraft = {
	siteId: string;
	cartId?: string;
	orderIdempotencyKey: string;
	paymentIdempotencyKey: string;
	createdAt: string;
};

export type CreateCheckoutOrderPayload = {
	userId?: string;
	guestToken: string;
	idempotencyKey: string;
	currency: Currency;
	subtotalAmount: string;
	discountAmount: string;
	shippingAmount: string;
	taxAmount: string;
	totalAmount: string;
	shippingAddress: CheckoutShippingAddress;
	items: Array<{
		productId: string;
		skuId: string;
		skuCode: string;
		productTitle: string;
		skuTitle?: string;
		imageUrl?: string;
		unitPrice: string;
		quantity: number;
		discountAmount: string;
		totalAmount: string;
		warehouseId: string;
		snapshot: Record<string, unknown>;
	}>;
};

export type CreateCheckoutOrderResult = {
	orderId: string;
	orderNo: string;
	siteId: string;
	reusedIdempotency: boolean;
	eventsQueued: number;
};

export type CreateCheckoutPaymentResult = {
	paymentOrderId: string;
	paymentNo: string;
	orderId: string;
	status: string;
	reusedIdempotency: boolean;
};

export type CheckoutResult = {
	orderId: string;
	orderNo: string;
	siteId: string;
	verticalId: string;
	brandId: string;
	orderStatus: string;
	paymentStatus: string;
	fulfillmentStatus: string;
	aftersalesStatus: string;
	currency: Currency;
	subtotalAmount: string;
	discountAmount: string;
	shippingAmount: string;
	taxAmount: string;
	totalAmount: string;
	createdAt: string;
	updatedAt: string;
	paidAt?: string;
	paymentOrder?: {
		paymentOrderId: string;
		paymentNo: string;
		status: string;
		channelCode: string;
		amount: string;
		currency: Currency;
	};
};

function getClientRandomId() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createCheckoutDraft(cart: StorefrontCart): StorefrontCheckoutDraft {
	const suffix = getClientRandomId();

	return {
		siteId: cart.siteId,
		...(cart.cartId ? { cartId: cart.cartId } : {}),
		orderIdempotencyKey: `checkout-order-${suffix}`,
		paymentIdempotencyKey: `checkout-payment-${suffix}`,
		createdAt: new Date().toISOString(),
	};
}

export function getOrCreateCheckoutDraft(
	storage: Storage | null | undefined,
	cart: StorefrontCart,
): StorefrontCheckoutDraft {
	const existingValue = storage?.getItem(storefrontCheckoutDraftStorageKey);

	if (existingValue) {
		try {
			const draft = JSON.parse(existingValue) as StorefrontCheckoutDraft;
			const sameCart = cart.cartId ? draft.cartId === cart.cartId : true;

			if (draft.siteId === cart.siteId && sameCart) {
				return draft;
			}
		} catch {
			storage?.removeItem(storefrontCheckoutDraftStorageKey);
		}
	}

	const draft = createCheckoutDraft(cart);
	storage?.setItem(storefrontCheckoutDraftStorageKey, JSON.stringify(draft));

	return draft;
}

export function clearCheckoutDraft(storage: Storage | null | undefined) {
	storage?.removeItem(storefrontCheckoutDraftStorageKey);
}

export function toCheckoutAmount(value: number | string): string {
	const amount = typeof value === "number" ? value : Number(value);

	if (!Number.isFinite(amount) || amount < 0) {
		return "0.00";
	}

	return amount.toFixed(2);
}

export function getCheckoutItemTotal(item: StorefrontCartItem): string {
	return toCheckoutAmount(Number(item.displayUnitPrice) * item.quantity);
}

export function buildCheckoutOrderPayload(input: {
	cart: StorefrontCart;
	guestToken: string;
	userId?: string;
	currency: Currency;
	shippingAddress: CheckoutShippingAddress;
	warehouseBySkuId: Map<string, string>;
	idempotencyKey: string;
}): CreateCheckoutOrderPayload {
	return {
		guestToken: input.guestToken,
		...(input.userId ? { userId: input.userId } : {}),
		idempotencyKey: input.idempotencyKey,
		currency: input.currency,
		subtotalAmount: toCheckoutAmount(input.cart.subtotalAmount),
		discountAmount: "0.00",
		shippingAmount: "0.00",
		taxAmount: "0.00",
		totalAmount: toCheckoutAmount(input.cart.totalAmount),
		shippingAddress: input.shippingAddress,
		items: input.cart.items.map((item) => {
			const warehouseId = input.warehouseBySkuId.get(item.skuId);

			if (!warehouseId) {
				throw new Error(
					`No checkout warehouse is available for SKU ${item.skuCode}.`,
				);
			}

			return {
				productId: item.productId,
				skuId: item.skuId,
				skuCode: item.skuCode,
				productTitle: item.productTitle,
				...(item.skuTitle ? { skuTitle: item.skuTitle } : {}),
				...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
				unitPrice: toCheckoutAmount(item.displayUnitPrice),
				quantity: item.quantity,
				discountAmount: "0.00",
				totalAmount: getCheckoutItemTotal(item),
				warehouseId,
				snapshot: {
					productId: item.productId,
					skuId: item.skuId,
					skuCode: item.skuCode,
					productTitle: item.productTitle,
					displayUnitPrice: item.displayUnitPrice,
					displayCurrency: item.displayCurrency,
					quantity: item.quantity,
					siteId: item.siteId,
					verticalId: item.verticalId,
					brandId: item.brandId,
				},
			};
		}),
	};
}

async function parseCheckoutResponse<T extends object>(
	response: Response,
): Promise<T> {
	const payload = (await response.json().catch(() => ({}))) as
		| T
		| { message?: string };

	if (!response.ok) {
		throw new Error(
			"message" in payload && payload.message
				? payload.message
				: "Checkout operation failed.",
		);
	}

	return payload as T;
}

export async function createCheckoutOrder(
	payload: CreateCheckoutOrderPayload,
): Promise<CreateCheckoutOrderResult> {
	return parseCheckoutResponse(
		await fetch("/api/checkout/orders", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify(payload),
		}),
	);
}

export async function createCheckoutPayment(input: {
	orderId: string;
	amount: string;
	currency: Currency;
	idempotencyKey: string;
	channelCode?: string;
}): Promise<CreateCheckoutPaymentResult> {
	return parseCheckoutResponse(
		await fetch("/api/checkout/payments", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({
				orderId: input.orderId,
				channelCode: input.channelCode ?? "stripe",
				amount: input.amount,
				currency: input.currency,
				idempotencyKey: input.idempotencyKey,
			}),
		}),
	);
}

export async function receiveDemoPaymentWebhook(input: {
	paymentOrderId: string;
	eventSeed: string;
}) {
	return parseCheckoutResponse<{
		webhookEventId: string;
		inserted: boolean;
		accepted: true;
	}>(
		await fetch("/api/checkout/payment-webhook", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify(input),
		}),
	);
}

export async function processDemoCommercePipeline() {
	return parseCheckoutResponse<Record<string, unknown>>(
		await fetch("/api/checkout/process-pipeline", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify({ limit: 20 }),
		}),
	);
}

export async function fetchCheckoutResult(input: {
	orderId: string;
	guestToken: string;
}): Promise<CheckoutResult> {
	const searchParams = new URLSearchParams({
		guestToken: input.guestToken,
	});

	return parseCheckoutResponse(
		await fetch(
			`/api/checkout/result/${encodeURIComponent(input.orderId)}?${searchParams.toString()}`,
			{ cache: "no-store" },
		),
	);
}
