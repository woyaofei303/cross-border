import type { AdminScopeType, AdminSite } from "@/lib/admin-sites";

export type AdminAfterSalesRequestListItem = {
	afterSalesRequestId: string;
	requestNo: string;
	orderId: string;
	orderNo: string;
	siteId: string;
	verticalId: string;
	brandId: string;
	type: string;
	status: string;
	reason: string;
	requestedAmount?: string;
	approvedAmount?: string;
	currency: string;
	orderStatus: string;
	paymentStatus: string;
	fulfillmentStatus: string;
	orderAftersalesStatus: string;
	totalAmount: string;
	userId?: string;
	guestToken?: string;
	itemCount: number;
	refundCount: number;
	latestRefundId?: string;
	latestRefundStatus?: string;
	createdAt: string;
	updatedAt: string;
};

export type AdminAfterSalesItem = {
	afterSalesItemId: string;
	afterSalesRequestId: string;
	orderItemId: string;
	productTitle?: string;
	skuCode?: string;
	skuTitle?: string;
	quantity: number;
	requestedAmount?: string;
	approvedAmount?: string;
	returnQualityStatus?: string;
	createdAt: string;
};

export type AdminAfterSalesLog = {
	afterSalesLogId: string;
	afterSalesRequestId: string;
	action: string;
	fromStatus?: string;
	toStatus?: string;
	operatorType: string;
	operatorId?: string;
	note?: string;
	createdAt: string;
};

export type AdminAfterSalesRefund = {
	refundId: string;
	refundNo: string;
	requestId?: string;
	paymentOrderId: string;
	orderId: string;
	siteId: string;
	verticalId: string;
	brandId: string;
	status: string;
	amount: string;
	currency: string;
	idempotencyKey: string;
	providerRefundId?: string;
	createdAt: string;
	updatedAt: string;
	succeededAt?: string;
	failedAt?: string;
};

export type AdminAfterSalesRequestDetail = AdminAfterSalesRequestListItem & {
	order: {
		orderId: string;
		orderNo: string;
		siteId: string;
		verticalId: string;
		brandId: string;
		orderStatus: string;
		paymentStatus: string;
		fulfillmentStatus: string;
		aftersalesStatus: string;
		currency: string;
		totalAmount: string;
		userId?: string;
		guestToken?: string;
	};
	items: AdminAfterSalesItem[];
	logs: AdminAfterSalesLog[];
	refunds: AdminAfterSalesRefund[];
};

type AdminAfterSalesRequestsResponse = {
	afterSalesRequests: AdminAfterSalesRequestListItem[];
};

const API_BASE_URL =
	process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

export function normalizeAfterSalesScopeType(
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

export function selectedAfterSalesScopeIdForSite(
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

export function buildAdminAfterSalesPath(input: {
	scopeType: AdminScopeType;
	scopeId?: string;
	siteId?: string;
	limit?: number;
}) {
	const params = new URLSearchParams();

	params.set("scopeType", input.scopeType);

	if (input.scopeId) {
		params.set("scopeId", input.scopeId);
	}

	if (input.siteId) {
		params.set("siteId", input.siteId);
	}

	if (input.limit) {
		params.set("limit", String(input.limit));
	}

	return `/after-sales?${params.toString()}`;
}

function buildAdminAfterSalesApiPath(input: {
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

	return `/api/admin/after-sales/requests?${params.toString()}`;
}

async function fetchJson<T>(pathname: string): Promise<T> {
	if (!API_BASE_URL) {
		throw new Error("Admin API base URL is not configured.");
	}

	const response = await fetch(new URL(pathname, API_BASE_URL), {
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`Admin after-sales API request failed: ${pathname}`);
	}

	return (await response.json()) as T;
}

export async function loadAdminAfterSalesRequests(input: {
	scopeType: AdminScopeType;
	scopeId?: string;
	limit?: number;
}): Promise<AdminAfterSalesRequestListItem[]> {
	if (!API_BASE_URL) {
		return [];
	}

	const payload = await fetchJson<AdminAfterSalesRequestsResponse>(
		buildAdminAfterSalesApiPath(input),
	);

	return payload.afterSalesRequests;
}

export async function loadAdminAfterSalesRequestDetail(
	requestId: string,
): Promise<AdminAfterSalesRequestDetail | null> {
	if (!API_BASE_URL) {
		return null;
	}

	const response = await fetch(
		new URL(`/api/admin/after-sales/requests/${requestId}`, API_BASE_URL),
		{ cache: "no-store" },
	);

	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		throw new Error("Admin after-sales detail request failed.");
	}

	return (await response.json()) as AdminAfterSalesRequestDetail;
}

export function getSiteForAfterSales(
	sites: AdminSite[],
	request: { siteId: string },
): AdminSite | undefined {
	return sites.find((site) => site.siteId === request.siteId);
}

export function afterSalesStatusClassName(status: string) {
	if (["completed", "succeeded", "approved", "refunded"].includes(status)) {
		return "border-[#bbdfcc] bg-[#eef8f1] text-[#1d7053]";
	}

	if (["rejected", "failed", "cancelled", "closed", "chargeback"].includes(status)) {
		return "border-[#e8c8c1] bg-[#fff1ee] text-[#a43b24]";
	}

	if (
		["requested", "reviewing", "refunding", "processing", "returning"].includes(
			status,
		)
	) {
		return "border-[#e5dac0] bg-[#fff8e6] text-[#8a5a13]";
	}

	return "border-[#d9e1dc] bg-[#f5f7f8] text-[#425149]";
}

export function getAfterSalesActionState(
	request: Pick<
		AdminAfterSalesRequestDetail,
		"status" | "requestedAmount" | "approvedAmount" | "refunds"
	>,
) {
	const approvable = request.status === "requested" || request.status === "reviewing";
	const latestRefund = request.refunds[0];
	const completableRefund = request.refunds.find((refund) =>
		["requested", "processing"].includes(refund.status),
	);

	return {
		canApprove: approvable,
		canReject: approvable,
		defaultApprovedAmount:
			request.approvedAmount ?? request.requestedAmount ?? latestRefund?.amount ?? "0.00",
		refundIdToMarkSucceeded: completableRefund?.refundId,
	};
}

export function formatDateTime(value: string | undefined) {
	return value ? value.slice(0, 16).replace("T", " ") : "-";
}

export function shortId(value: string | undefined) {
	return value ? value.slice(0, 8) : "-";
}

export function formatCurrency(value: string | number | undefined, currency: string) {
	const amount = typeof value === "number" ? value : Number(value ?? "0");

	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
	}).format(Number.isFinite(amount) ? amount : 0);
}
