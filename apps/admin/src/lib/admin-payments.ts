import type {
	AdminScopeType,
	AdminSite,
	ProcessCommercePipelineResponse,
} from "@/lib/admin-sites";

export type AdminPaymentOrderListItem = {
	paymentOrderId: string;
	paymentNo: string;
	orderId: string;
	orderNo: string;
	siteId: string;
	verticalId: string;
	brandId: string;
	channelCode: string;
	status: string;
	amount: string;
	currency: string;
	providerPaymentId?: string;
	idempotencyKey: string;
	transactionCount: number;
	latestWebhookEventId?: string;
	latestWebhookStatus?: string;
	createdAt: string;
	updatedAt: string;
	succeededAt?: string;
	failedAt?: string;
};

export type AdminPaymentTransactionListItem = {
	paymentTransactionId: string;
	paymentOrderId: string;
	paymentNo: string;
	orderId: string;
	orderNo: string;
	siteId: string;
	verticalId: string;
	brandId: string;
	channelCode: string;
	providerTransactionId: string;
	transactionType: string;
	status: string;
	amount: string;
	currency: string;
	createdAt: string;
};

export type AdminPaymentWebhookListItem = {
	webhookEventId: string;
	paymentOrderId?: string;
	paymentNo?: string;
	orderId?: string;
	orderNo?: string;
	siteId: string;
	verticalId: string;
	brandId: string;
	channelCode: string;
	providerEventId: string;
	eventType: string;
	providerObjectId?: string;
	dedupeKey: string;
	duplicateCount: number;
	status: string;
	errorMessage?: string;
	receivedAt: string;
	processedAt?: string;
};

export type AdminPaymentOperationsData = {
	paymentOrders: AdminPaymentOrderListItem[];
	paymentTransactions: AdminPaymentTransactionListItem[];
	paymentWebhooks: AdminPaymentWebhookListItem[];
};

type AdminPaymentOrdersResponse = {
	paymentOrders: AdminPaymentOrderListItem[];
};

type AdminPaymentTransactionsResponse = {
	paymentTransactions: AdminPaymentTransactionListItem[];
};

type AdminPaymentWebhooksResponse = {
	paymentWebhooks: AdminPaymentWebhookListItem[];
};

const API_BASE_URL = process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

export function normalizePaymentScopeType(
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

export function selectedPaymentScopeIdForSite(
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

export function buildAdminPaymentsPath(input: {
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

	return `/payments?${params.toString()}`;
}

function buildAdminPaymentApiPath(
	pathname: string,
	input: {
		scopeType: AdminScopeType;
		scopeId?: string;
		limit?: number;
	},
) {
	const params = new URLSearchParams();
	params.set("scopeType", input.scopeType);

	if (input.scopeId) {
		params.set("scopeId", input.scopeId);
	}

	if (input.limit) {
		params.set("limit", String(input.limit));
	}

	return `${pathname}?${params.toString()}`;
}

async function fetchJson<T>(pathname: string): Promise<T> {
	if (!API_BASE_URL) {
		throw new Error("Admin API base URL is not configured.");
	}

	const response = await fetch(new URL(pathname, API_BASE_URL), {
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`Admin payment API request failed: ${pathname}`);
	}

	return (await response.json()) as T;
}

export async function loadAdminPaymentOperations(input: {
	scopeType: AdminScopeType;
	scopeId?: string;
	limit?: number;
}): Promise<AdminPaymentOperationsData> {
	if (!API_BASE_URL) {
		return {
			paymentOrders: [],
			paymentTransactions: [],
			paymentWebhooks: [],
		};
	}

	const [orders, transactions, webhooks] = await Promise.all([
		fetchJson<AdminPaymentOrdersResponse>(
			buildAdminPaymentApiPath("/api/admin/payments/orders", input),
		),
		fetchJson<AdminPaymentTransactionsResponse>(
			buildAdminPaymentApiPath("/api/admin/payments/transactions", input),
		),
		fetchJson<AdminPaymentWebhooksResponse>(
			buildAdminPaymentApiPath("/api/admin/payments/webhooks", input),
		),
	]);

	return {
		paymentOrders: orders.paymentOrders,
		paymentTransactions: transactions.paymentTransactions,
		paymentWebhooks: webhooks.paymentWebhooks,
	};
}

export function getSiteForPayment(
	sites: AdminSite[],
	payment: { siteId: string },
): AdminSite | undefined {
	return sites.find((site) => site.siteId === payment.siteId);
}

export function paymentStatusClassName(status: string) {
	if (["processed", "paid", "succeeded", "completed"].includes(status)) {
		return "border-[#bbdfcc] bg-[#eef8f1] text-[#1d7053]";
	}

	if (["failed", "dead_letter", "chargeback", "cancelled", "expired"].includes(status)) {
		return "border-[#e8c8c1] bg-[#fff1ee] text-[#a43b24]";
	}

	if (["received", "processing", "created", "pending"].includes(status)) {
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

export function summarizePipelineResult(
	result: ProcessCommercePipelineResponse | undefined,
) {
	if (!result) {
		return {
			claimed: 0,
			processed: 0,
			skipped: 0,
			alreadyProcessed: 0,
			failed: 0,
		};
	}

	return {
		claimed:
			result.paymentWebhooks.claimed +
			result.paymentSucceededEvents.claimed +
			result.analyticsEvents.claimed,
		processed:
			result.paymentWebhooks.processed +
			result.paymentSucceededEvents.processed +
			result.analyticsEvents.processed,
		skipped: result.paymentWebhooks.skipped + result.paymentSucceededEvents.skipped,
		alreadyProcessed:
			result.paymentWebhooks.alreadyProcessed +
			result.paymentSucceededEvents.alreadyProcessed +
			result.analyticsEvents.alreadyProcessed,
		failed:
			result.paymentWebhooks.failed +
			result.paymentSucceededEvents.failed +
			result.analyticsEvents.failed,
	};
}
