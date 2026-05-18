import type {
	AdminScopeType,
	AdminSite,
	AdminSiteManagementData,
} from "@/lib/admin-sites";

export type AdminOrderListPayment = {
	paymentOrderId: string;
	paymentNo: string;
	status: string;
	channelCode: string;
};

export type AdminOrderListItem = {
	orderId: string;
	orderNo: string;
	siteId: string;
	verticalId: string;
	brandId: string;
	userId?: string;
	guestToken?: string;
	orderStatus: string;
	paymentStatus: string;
	fulfillmentStatus: string;
	aftersalesStatus: string;
	currency: string;
	totalAmount: string;
	itemCount: number;
	statusLogCount: number;
	createdAt: string;
	updatedAt: string;
	paidAt?: string;
	cancelledAt?: string;
	latestPaymentOrder?: AdminOrderListPayment;
};

export type AdminOrderItem = {
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

export type AdminOrderPaymentOrder = AdminOrderListPayment & {
	siteId: string;
	verticalId: string;
	brandId: string;
	amount: string;
	currency: string;
	providerPaymentId?: string;
	idempotencyKey: string;
	createdAt: string;
	updatedAt: string;
	succeededAt?: string;
	failedAt?: string;
};

export type AdminOrderPaymentTransaction = {
	paymentTransactionId: string;
	paymentOrderId: string;
	channelCode: string;
	providerTransactionId: string;
	transactionType: string;
	status: string;
	amount: string;
	currency: string;
	rawPayload: Record<string, unknown>;
	createdAt: string;
};

export type AdminOrderInventoryLock = {
	inventoryLockId: string;
	orderItemId: string;
	skuId: string;
	warehouseId: string;
	quantity: number;
	status: string;
	idempotencyKey: string;
	expiresAt: string;
	releasedAt?: string;
	deductedAt?: string;
	createdAt: string;
};

export type AdminOrderInventoryTransaction = {
	inventoryTransactionId: string;
	skuId: string;
	warehouseId: string;
	type: string;
	quantity: number;
	beforeAvailable: number;
	afterAvailable: number;
	beforeLocked: number;
	afterLocked: number;
	beforePhysical: number;
	afterPhysical: number;
	idempotencyKey: string;
	createdAt: string;
};

export type AdminOrderFulfillmentOrder = {
	fulfillmentOrderId: string;
	fulfillmentNo: string;
	warehouseId?: string;
	status: string;
	itemCount: number;
	createdAt: string;
	updatedAt: string;
};

export type AdminOrderShipment = {
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
	trackingEvents: Array<{
		trackingStatus: string;
		description?: string;
		location?: string;
		occurredAt: string;
	}>;
};

export type AdminOrderPaymentRefund = {
	refundId: string;
	refundNo: string;
	afterSalesRequestId?: string;
	paymentOrderId: string;
	status: string;
	amount: string;
	currency: string;
	providerRefundId?: string;
	createdAt: string;
	updatedAt: string;
	succeededAt?: string;
	failedAt?: string;
};

export type AdminOrderAfterSalesRequest = {
	afterSalesRequestId: string;
	requestNo: string;
	type: string;
	status: string;
	reason: string;
	requestedAmount?: string;
	approvedAmount?: string;
	createdAt: string;
	updatedAt: string;
};

export type AdminOrderStatusLog = {
	statusLogId: string;
	statusType: string;
	fromStatus?: string;
	toStatus: string;
	reason?: string;
	operatorType: string;
	operatorId?: string;
	metadata: Record<string, unknown>;
	createdAt: string;
};

export type AdminOrderDetail = {
	orderId: string;
	orderNo: string;
	siteId: string;
	verticalId: string;
	brandId: string;
	userId?: string;
	guestToken?: string;
	orderStatus: string;
	paymentStatus: string;
	fulfillmentStatus: string;
	aftersalesStatus: string;
	currency: string;
	subtotalAmount: string;
	discountAmount: string;
	shippingAmount: string;
	taxAmount: string;
	totalAmount: string;
	createdAt: string;
	updatedAt: string;
	paidAt?: string;
	shippingAddressSnapshot: Record<string, unknown>;
	priceSnapshot: Record<string, unknown>;
	cartOrigin: {
		userId?: string;
		guestToken?: string;
		idempotencyKey: string;
	};
	items: AdminOrderItem[];
	paymentOrders: AdminOrderPaymentOrder[];
	paymentTransactions: AdminOrderPaymentTransaction[];
	inventoryLocks: AdminOrderInventoryLock[];
	inventoryTransactions: AdminOrderInventoryTransaction[];
	fulfillmentOrders: AdminOrderFulfillmentOrder[];
	fulfillmentItems: Array<{
		fulfillmentItemId: string;
		fulfillmentOrderId: string;
		orderItemId: string;
		skuId: string;
		quantity: number;
		createdAt: string;
	}>;
	shipments: AdminOrderShipment[];
	paymentRefunds: AdminOrderPaymentRefund[];
	afterSalesRequests: AdminOrderAfterSalesRequest[];
	afterSalesItems: Array<{
		afterSalesItemId: string;
		afterSalesRequestId: string;
		orderItemId: string;
		quantity: number;
		requestedAmount?: string;
		approvedAmount?: string;
		returnQualityStatus?: string;
		createdAt: string;
	}>;
	statusLogs: AdminOrderStatusLog[];
};

type AdminOrderListResponse = {
	orders: AdminOrderListItem[];
};

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

export function normalizeOrderScopeType(
	value: string | string[] | undefined,
): AdminScopeType {
	const raw = Array.isArray(value) ? value[0] : value;

	if (
		raw === "global" ||
		raw === "vertical" ||
		raw === "brand" ||
		raw === "site"
	) {
		return raw;
	}

	return "global";
}

export function selectedScopeIdForSite(
	scopeType: AdminScopeType,
	site: AdminSite,
): string | undefined {
	if (scopeType === "site") {
		return site.siteId;
	}

	if (scopeType === "vertical") {
		return site.verticalId;
	}

	if (scopeType === "brand") {
		return site.brandId;
	}

	return undefined;
}

export function buildAdminOrdersPath(input: {
	scopeType: AdminScopeType;
	scopeId?: string;
	limit?: number;
}) {
	const params = new URLSearchParams();

	params.set("scopeType", input.scopeType);

	if (input.scopeId) {
		params.set("scopeId", input.scopeId);
	}

	if (input.limit) {
		params.set("limit", String(input.limit));
	}

	return `/orders?${params.toString()}`;
}

export function getSiteForOrder(
	data: AdminSiteManagementData,
	order: Pick<AdminOrderListItem, "siteId">,
): AdminSite | undefined {
	return data.sites.find((site) => site.siteId === order.siteId);
}

export function orderStatusClassName(status: string) {
	if (
		["paid", "succeeded", "fulfilled", "delivered", "completed", "deducted"].includes(
			status,
		)
	) {
		return "border-[#bbdfcc] bg-[#eef8f1] text-[#1d7053]";
	}

	if (
		["failed", "chargeback", "cancelled", "closed", "expired", "dead_letter"].includes(
			status,
		)
	) {
		return "border-[#e8c8c1] bg-[#fff1ee] text-[#a43b24]";
	}

	if (
		["processing", "pending", "pending_payment", "locked", "reviewing"].includes(
			status,
		)
	) {
		return "border-[#e5dac0] bg-[#fff8e6] text-[#8a5a13]";
	}

	return "border-[#d9e1dc] bg-[#f5f7f8] text-[#425149]";
}

export function formatDateTime(value: string | undefined) {
	return value ? value.slice(0, 16).replace("T", " ") : "-";
}

export function shortId(value: string | undefined) {
	return value ? value.slice(0, 8) : "-";
}

export function formatCurrency(value: string | number, currency: string) {
	const amount = typeof value === "number" ? value : Number(value);

	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
	}).format(Number.isFinite(amount) ? amount : 0);
}

export function getFulfillmentActionState(
	order: Pick<
		AdminOrderDetail,
		| "orderStatus"
		| "paymentStatus"
		| "fulfillmentStatus"
		| "inventoryLocks"
		| "inventoryTransactions"
		| "fulfillmentOrders"
		| "shipments"
	>,
) {
	const firstFulfillment = order.fulfillmentOrders[0];
	const firstShippableFulfillment = order.fulfillmentOrders.find((fulfillment) =>
		["pending", "picking", "packed"].includes(fulfillment.status),
	);
	const firstDeliverableShipment = order.shipments.find(
		(shipment) => shipment.status === "shipped",
	);
	const defaultWarehouseId =
		firstFulfillment?.warehouseId ??
		order.inventoryLocks[0]?.warehouseId ??
		order.inventoryTransactions[0]?.warehouseId;

	return {
		defaultWarehouseId,
		canCreateFulfillment:
			(order.paymentStatus === "paid" ||
				order.paymentStatus === "partially_refunded") &&
			(order.orderStatus === "paid" || order.orderStatus === "confirmed") &&
			(order.fulfillmentStatus === "unfulfilled" ||
				order.fulfillmentStatus === "pending") &&
			order.fulfillmentOrders.length === 0,
		shippableFulfillmentOrderId:
			firstShippableFulfillment?.fulfillmentOrderId,
		deliverableShipmentId: firstDeliverableShipment?.shipmentId,
	};
}

export async function loadAdminOrders(input: {
	scopeType: AdminScopeType;
	scopeId?: string;
	limit?: number;
}): Promise<AdminOrderListItem[]> {
	if (!API_BASE_URL) {
		return [];
	}

	const params = new URLSearchParams();
	params.set("scopeType", input.scopeType);

	if (input.scopeId) {
		params.set("scopeId", input.scopeId);
	}

	if (input.limit) {
		params.set("limit", String(input.limit));
	}

	const response = await fetch(
		new URL(`/api/admin/orders?${params.toString()}`, API_BASE_URL),
		{ cache: "no-store" },
	);

	if (!response.ok) {
		throw new Error("Admin order list request failed.");
	}

	const payload = (await response.json()) as AdminOrderListResponse;

	return payload.orders;
}

export async function loadAdminOrderDetail(
	orderId: string,
): Promise<AdminOrderDetail | null> {
	if (!API_BASE_URL) {
		return null;
	}

	const response = await fetch(new URL(`/api/admin/orders/${orderId}`, API_BASE_URL), {
		cache: "no-store",
	});

	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		throw new Error("Admin order detail request failed.");
	}

	return (await response.json()) as AdminOrderDetail;
}
