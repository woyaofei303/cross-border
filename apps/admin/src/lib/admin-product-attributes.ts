import type { AdminProductAttribute } from "@/lib/admin-sites";

type AdminProductAttributesResponse = {
	attributes: AdminProductAttribute[];
};

const API_BASE_URL =
	process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL;

export function buildAdminProductAttributesPath(input: {
	siteId?: string;
	verticalId?: string;
}) {
	const params = new URLSearchParams();

	if (input.siteId) {
		params.set("siteId", input.siteId);
	}

	if (input.verticalId) {
		params.set("verticalId", input.verticalId);
	}

	const query = params.toString();

	return query ? `/product-attributes?${query}` : "/product-attributes";
}

async function fetchJson<T>(pathname: string): Promise<T> {
	if (!API_BASE_URL) {
		throw new Error("Admin API base URL is not configured.");
	}

	const response = await fetch(new URL(pathname, API_BASE_URL), {
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error(`Admin product attribute API request failed: ${pathname}`);
	}

	return (await response.json()) as T;
}

export async function loadAdminProductAttributes(input: {
	verticalId?: string;
}): Promise<AdminProductAttribute[]> {
	if (!API_BASE_URL) {
		return [];
	}

	const params = new URLSearchParams();

	if (input.verticalId) {
		params.set("verticalId", input.verticalId);
	}

	const pathname = params.size
		? `/api/admin/product-attributes?${params.toString()}`
		: "/api/admin/product-attributes";
	const payload = await fetchJson<AdminProductAttributesResponse>(pathname);

	return payload.attributes;
}

export function productAttributeStatusClassName(status: string) {
	if (status === "active") {
		return "border-[#bbdfcc] bg-[#eef8f1] text-[#1d7053]";
	}

	if (status === "inactive") {
		return "border-[#e5dac0] bg-[#fff8e6] text-[#8a5a13]";
	}

	if (status === "archived") {
		return "border-[#e8c8c1] bg-[#fff1ee] text-[#a43b24]";
	}

	return "border-[#d9e1dc] bg-[#f5f7f8] text-[#425149]";
}

export function shortId(value: string | undefined) {
	return value ? value.slice(0, 8) : "-";
}
