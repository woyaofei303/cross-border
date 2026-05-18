import type { AdminScopeType, AdminSite } from "@/lib/admin-sites";

export type AdminCustomerStatus = "active" | "disabled" | "blocked";

export type AdminCustomerAddress = {
	addressId: string;
	siteCustomerId: string;
	siteId: string;
	verticalId: string;
	brandId: string;
	label?: string;
	email: string;
	fullName: string;
	phone?: string;
	countryCode: string;
	region?: string;
	city: string;
	postalCode: string;
	addressLine1: string;
	addressLine2?: string;
	isDefault: boolean;
	createdAt: string;
	updatedAt: string;
};

export type AdminCustomerListItem = {
	siteCustomerId: string;
	globalUserId?: string;
	guestToken?: string;
	siteId: string;
	verticalId: string;
	brandId: string;
	email?: string;
	phone?: string;
	nickname?: string;
	membershipLevel: string;
	points: number;
	status: AdminCustomerStatus;
	createdAt: string;
	updatedAt: string;
	globalUser?: {
		userId: string;
		email?: string;
		phone?: string;
		status: AdminCustomerStatus;
		userType: "guest" | "registered";
		riskLevel: "normal" | "watch" | "high" | "blocked";
		createdAt: string;
		updatedAt: string;
	};
	defaultAddress?: AdminCustomerAddress;
	orderCount: number;
	lifetimeSpend: string;
	currency?: string;
};

type AdminCustomerListResponse = {
	customers: AdminCustomerListItem[];
};

const API_BASE_URL =
	process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

export function normalizeCustomerScopeType(
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

export function selectedCustomerScopeIdForSite(
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

export function buildAdminCustomersPath(input: {
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

	return `/customers?${params.toString()}`;
}

function buildAdminCustomersApiPath(input: {
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

	return `/api/admin/customers?${params.toString()}`;
}

async function fetchJson<T>(pathname: string): Promise<T> {
	if (!API_BASE_URL) {
		throw new Error("Admin API base URL is not configured.");
	}

	const response = await fetch(new URL(pathname, API_BASE_URL), {
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`Admin customer API request failed: ${pathname}`);
	}

	return (await response.json()) as T;
}

export async function loadAdminCustomers(input: {
	scopeType: AdminScopeType;
	scopeId?: string;
	limit?: number;
}): Promise<AdminCustomerListItem[]> {
	if (!API_BASE_URL) {
		return [];
	}

	const payload = await fetchJson<AdminCustomerListResponse>(
		buildAdminCustomersApiPath(input),
	);

	return payload.customers;
}

export function customerStatusClassName(status: string) {
	if (status === "active") {
		return "border-[#bbdfcc] bg-[#eef8f1] text-[#1d7053]";
	}

	if (status === "disabled") {
		return "border-[#e5dac0] bg-[#fff8e6] text-[#8a5a13]";
	}

	return "border-[#e8c8c1] bg-[#fff1ee] text-[#a43b24]";
}

export function formatCustomerMoney(value: string | undefined, currency = "USD") {
	const amount = Number(value ?? "0");

	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
	}).format(Number.isFinite(amount) ? amount : 0);
}

export function formatCustomerDateTime(value: string | undefined) {
	return value ? value.slice(0, 16).replace("T", " ") : "-";
}

export function shortCustomerId(value: string | undefined) {
	return value ? value.slice(0, 8) : "-";
}
