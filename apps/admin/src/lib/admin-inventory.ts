import type { AdminScopeType, AdminSite } from "@/lib/admin-sites";

export type AdminInventoryBalanceListItem = {
	siteId: string;
	verticalId: string;
	brandId: string;
	skuId: string;
	skuCode: string;
	skuTitle?: string;
	productId: string;
	productTitle: string;
	warehouseId: string;
	warehouseCode: string;
	warehouseName: string;
	availableQty: number;
	lockedQty: number;
	physicalQty: number;
	inboundQty: number;
	safetyQty: number;
	updatedAt: string;
};

export type AdminInventoryLockListItem = {
	siteId: string;
	verticalId: string;
	brandId: string;
	inventoryLockId: string;
	orderId: string;
	orderNo?: string;
	orderItemId: string;
	skuId: string;
	skuCode?: string;
	warehouseId: string;
	warehouseCode?: string;
	quantity: number;
	status: string;
	idempotencyKey: string;
	expiresAt: string;
	releasedAt?: string;
	deductedAt?: string;
	createdAt: string;
};

export type AdminInventoryTransactionListItem = {
	siteId: string;
	verticalId: string;
	brandId: string;
	inventoryTransactionId: string;
	skuId: string;
	skuCode?: string;
	warehouseId: string;
	warehouseCode?: string;
	orderId?: string;
	orderNo?: string;
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

export type AdminInventoryOperationsData = {
	inventoryBalances: AdminInventoryBalanceListItem[];
	inventoryLocks: AdminInventoryLockListItem[];
	inventoryTransactions: AdminInventoryTransactionListItem[];
};

type AdminInventoryBalancesResponse = {
	inventoryBalances: AdminInventoryBalanceListItem[];
};

type AdminInventoryLocksResponse = {
	inventoryLocks: AdminInventoryLockListItem[];
};

type AdminInventoryTransactionsResponse = {
	inventoryTransactions: AdminInventoryTransactionListItem[];
};

const API_BASE_URL =
	process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

export function normalizeInventoryScopeType(
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

export function selectedInventoryScopeIdForSite(
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

export function buildAdminInventoryPath(input: {
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

	return `/inventory?${params.toString()}`;
}

function buildAdminInventoryApiPath(
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
		throw new Error(`Admin inventory API request failed: ${pathname}`);
	}

	return (await response.json()) as T;
}

export async function loadAdminInventoryOperations(input: {
	scopeType: AdminScopeType;
	scopeId?: string;
	limit?: number;
}): Promise<AdminInventoryOperationsData> {
	if (!API_BASE_URL) {
		return {
			inventoryBalances: [],
			inventoryLocks: [],
			inventoryTransactions: [],
		};
	}

	const [balances, locks, transactions] = await Promise.all([
		fetchJson<AdminInventoryBalancesResponse>(
			buildAdminInventoryApiPath("/api/admin/inventory/balances", input),
		),
		fetchJson<AdminInventoryLocksResponse>(
			buildAdminInventoryApiPath("/api/admin/inventory/locks", input),
		),
		fetchJson<AdminInventoryTransactionsResponse>(
			buildAdminInventoryApiPath("/api/admin/inventory/transactions", input),
		),
	]);

	return {
		inventoryBalances: balances.inventoryBalances,
		inventoryLocks: locks.inventoryLocks,
		inventoryTransactions: transactions.inventoryTransactions,
	};
}

export function getSiteForInventoryItem(
	sites: AdminSite[],
	item: { siteId: string },
): AdminSite | undefined {
	return sites.find((site) => site.siteId === item.siteId);
}

export function inventoryStatusClassName(status: string) {
	if (["deducted", "released", "processed", "completed"].includes(status)) {
		return "border-[#bbdfcc] bg-[#eef8f1] text-[#1d7053]";
	}

	if (["failed", "expired", "cancelled"].includes(status)) {
		return "border-[#e8c8c1] bg-[#fff1ee] text-[#a43b24]";
	}

	if (["locked", "pending", "processing"].includes(status)) {
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
