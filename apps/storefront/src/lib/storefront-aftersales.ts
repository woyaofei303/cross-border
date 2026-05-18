import type {
	StorefrontOrderDetail,
	StorefrontOrderItem,
} from "@/lib/storefront-orders";

export type StorefrontAfterSalesRequestType = "refund_only" | "return_refund";

export type StorefrontAfterSalesRequestItemInput = {
	orderItemId: string;
	quantity: number;
	requestedAmount?: string;
};

export type CreateStorefrontAfterSalesRequestPayload = {
	orderId: string;
	guestToken: string;
	type: StorefrontAfterSalesRequestType;
	reason: string;
	requestedAmount: string;
	idempotencyKey: string;
	items: StorefrontAfterSalesRequestItemInput[];
};

export type CreateStorefrontAfterSalesRequestResult = {
	requestId: string;
	requestNo: string;
	orderId: string;
	status: string;
	reusedIdempotency: boolean;
	eventsQueued: number;
};

const refundablePaymentStatuses = new Set(["paid", "partially_refunded"]);
const openAftersalesStatuses = new Set([
	"requested",
	"reviewing",
	"approved",
	"rejected",
	"returning",
	"refunding",
]);

export function isStorefrontAfterSalesEligible(
	order: StorefrontOrderDetail | null,
) {
	return (
		Boolean(order) &&
		refundablePaymentStatuses.has(order?.paymentStatus ?? "") &&
		!openAftersalesStatuses.has(order?.aftersalesStatus ?? "") &&
		(order?.items.length ?? 0) > 0
	);
}

export function getAfterSalesBlockedReason(order: StorefrontOrderDetail | null) {
	if (!order) {
		return "Order detail is still loading.";
	}

	if (!refundablePaymentStatuses.has(order.paymentStatus)) {
		return "After-sales requests are available after payment is confirmed.";
	}

	if (openAftersalesStatuses.has(order.aftersalesStatus)) {
		return "An after-sales request is already in progress for this order.";
	}

	if (order.items.length === 0) {
		return "This order does not have an item snapshot available for after-sales.";
	}

	return "";
}

export function getAfterSalesTypeLabel(type: StorefrontAfterSalesRequestType) {
	return type === "return_refund" ? "Return and refund" : "Refund only";
}

export function toAfterSalesAmount(value: number | string): string {
	const amount = typeof value === "number" ? value : Number(value);

	if (!Number.isFinite(amount) || amount < 0) {
		return "0.00";
	}

	return amount.toFixed(2);
}

export function getOrderItemRefundAmount(item: StorefrontOrderItem) {
	return toAfterSalesAmount(item.totalAmount);
}

export function buildAfterSalesRequestItems(input: {
	items: StorefrontOrderItem[];
	selectedItemIds: Set<string>;
	quantityByItemId: Record<string, number>;
}) {
	return input.items
		.filter((item) => input.selectedItemIds.has(item.orderItemId))
		.map((item) => {
			const requestedQuantity = input.quantityByItemId[item.orderItemId];
			const quantity =
				Number.isFinite(requestedQuantity) && requestedQuantity > 0
					? Math.min(Math.floor(requestedQuantity), item.quantity)
					: item.quantity;

			return {
				orderItemId: item.orderItemId,
				quantity,
				requestedAmount: getOrderItemRefundAmount(item),
			};
		});
}

async function parseAfterSalesResponse<T extends object>(
	response: Response,
): Promise<T> {
	const payload = (await response.json().catch(() => ({}))) as
		| T
		| { message?: string };

	if (!response.ok) {
		throw new Error(
			"message" in payload && payload.message
				? payload.message
				: "After-sales request failed.",
		);
	}

	return payload as T;
}

export async function createStorefrontAfterSalesRequest(
	payload: CreateStorefrontAfterSalesRequestPayload,
): Promise<CreateStorefrontAfterSalesRequestResult> {
	return parseAfterSalesResponse(
		await fetch("/api/after-sales/refund-requests", {
			method: "POST",
			headers: {
				"content-type": "application/json",
			},
			body: JSON.stringify(payload),
		}),
	);
}
