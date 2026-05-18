import type { Currency } from "@/lib/products";

export type StorefrontOrderListPayment = {
	paymentOrderId: string;
	paymentNo: string;
	status: string;
	channelCode: string;
};

export type StorefrontOrderListItem = {
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
	totalAmount: string;
	itemCount: number;
	firstItemTitle?: string;
	firstItemImageUrl?: string;
	createdAt: string;
	updatedAt: string;
	paidAt?: string;
	latestPaymentOrder?: StorefrontOrderListPayment;
};

export type StorefrontOrderItem = {
	orderItemId: string;
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
	snapshot: Record<string, unknown>;
};

export type StorefrontShipmentTrackingEvent = {
	trackingStatus: string;
	description?: string;
	location?: string;
	occurredAt: string;
};

export type StorefrontShipment = {
	shipmentId: string;
	fulfillmentOrderId: string;
	fulfillmentNo: string;
	fulfillmentStatus: string;
	providerCode: string;
	providerName: string;
	trackingNo: string;
	status: string;
	shippedAt?: string;
	deliveredAt?: string;
	trackingEvents: StorefrontShipmentTrackingEvent[];
};

export type StorefrontOrderDetail = StorefrontOrderListItem & {
	subtotalAmount: string;
	discountAmount: string;
	shippingAmount: string;
	taxAmount: string;
	totalAmount: string;
	shippingAddressSnapshot: Record<string, unknown>;
	priceSnapshot: Record<string, unknown>;
	paymentOrder?: {
		paymentOrderId: string;
		paymentNo: string;
		status: string;
		channelCode: string;
		amount: string;
		currency: Currency;
	};
	items: StorefrontOrderItem[];
	shipments: StorefrontShipment[];
};

export type StorefrontOrderListResponse = {
	orders: StorefrontOrderListItem[];
};

export type OrderStatusTone = "success" | "warning" | "danger" | "neutral";

const statusLabels: Record<string, string> = {
	pending_payment: "Pending payment",
	payment_processing: "Payment processing",
	paid: "Paid",
	confirmed: "Confirmed",
	partially_fulfilled: "Partially fulfilled",
	fulfilled: "Fulfilled",
	completed: "Completed",
	cancelled: "Cancelled",
	closed: "Closed",
	unpaid: "Unpaid",
	processing: "Processing",
	failed: "Failed",
	partially_refunded: "Partially refunded",
	refunded: "Refunded",
	chargeback: "Chargeback",
	unfulfilled: "Unfulfilled",
	pending: "Pending",
	shipped: "Shipped",
	partially_shipped: "Partially shipped",
	delivered: "Delivered",
	none: "None",
	requested: "Requested",
	reviewing: "Reviewing",
	approved: "Approved",
	rejected: "Rejected",
	returning: "Returning",
	received: "Received",
	refunding: "Refunding",
};

const successStatuses = new Set(["paid", "confirmed", "fulfilled", "completed", "shipped", "delivered", "approved", "received"]);
const warningStatuses = new Set([
	"pending_payment",
	"payment_processing",
	"processing",
	"pending",
	"partially_fulfilled",
	"partially_shipped",
	"requested",
	"reviewing",
	"returning",
	"refunding",
]);
const dangerStatuses = new Set([
	"failed",
	"cancelled",
	"closed",
	"chargeback",
	"rejected",
]);

export function getOrderStatusLabel(status: string) {
	return statusLabels[status] ?? status;
}

export function getOrderStatusTone(status: string): OrderStatusTone {
	if (successStatuses.has(status)) {
		return "success";
	}

	if (warningStatuses.has(status)) {
		return "warning";
	}

	if (dangerStatuses.has(status)) {
		return "danger";
	}

	return "neutral";
}

export function getOrderStatusClassName(status: string) {
	const tone = getOrderStatusTone(status);

	if (tone === "success") {
		return "border-[#bbdfcc] bg-[#eef8f1] text-[#1d7053]";
	}

	if (tone === "warning") {
		return "border-[#e5dac0] bg-[#fff8e6] text-[#8a5a13]";
	}

	if (tone === "danger") {
		return "border-[#e8c8c1] bg-[#fff1ee] text-[#a43b24]";
	}

	return "border-[#d9e1dc] bg-[#f5f7f8] text-[#425149]";
}

export function formatOrderDate(value: string) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(value));
}

async function parseOrderResponse<T extends object>(
	response: Response,
): Promise<T> {
	const payload = (await response.json().catch(() => ({}))) as
		| T
		| { message?: string };

	if (!response.ok) {
		throw new Error(
			"message" in payload && payload.message
				? payload.message
				: "Order operation failed.",
		);
	}

	return payload as T;
}

export async function fetchStorefrontOrders(input: {
	guestToken: string;
	userId?: string;
	limit?: number;
}): Promise<StorefrontOrderListResponse> {
	const searchParams = new URLSearchParams({
		guestToken: input.guestToken,
	});

	if (input.userId) {
		searchParams.set("userId", input.userId);
	}

	if (input.limit) {
		searchParams.set("limit", String(input.limit));
	}

	return parseOrderResponse(
		await fetch(`/api/orders?${searchParams.toString()}`, {
			cache: "no-store",
		}),
	);
}

export async function fetchStorefrontOrderDetail(input: {
	orderId: string;
	guestToken: string;
	userId?: string;
}): Promise<StorefrontOrderDetail> {
	const searchParams = new URLSearchParams({
		guestToken: input.guestToken,
	});

	if (input.userId) {
		searchParams.set("userId", input.userId);
	}

	return parseOrderResponse(
		await fetch(
			`/api/orders/${encodeURIComponent(input.orderId)}?${searchParams.toString()}`,
			{ cache: "no-store" },
		),
	);
}
