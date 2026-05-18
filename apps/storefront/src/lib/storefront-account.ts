import type { CheckoutShippingAddress } from "@/lib/storefront-checkout";

export const accountLiteAddressStorageKey =
	"cross-border-store:account-lite-address";
export const accountLiteCustomerStorageKey =
	"cross-border-store:account-lite-customer";

export type AccountLiteAddress = CheckoutShippingAddress;

export type StoredSiteCustomer = {
	siteCustomerId: string;
	globalUserId?: string;
	email?: string;
	phone?: string;
	nickname?: string;
	savedAt: string;
};

export type SiteCustomerProfile = {
	globalUser?: {
		userId: string;
		email?: string;
		phone?: string;
		status: string;
		userType: string;
		riskLevel: string;
		createdAt: string;
		updatedAt: string;
	};
	siteCustomer: {
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
		status: string;
		createdAt: string;
		updatedAt: string;
	};
	defaultAddress?: AccountLiteAddress;
	addresses: AccountLiteAddress[];
};

export const emptyAccountAddress: AccountLiteAddress = {
	email: "",
	fullName: "",
	phone: "",
	addressLine1: "",
	addressLine2: "",
	city: "",
	region: "",
	postalCode: "",
	countryCode: "US",
};

function parseStoredJson<T>(storageKey: string): T | null {
	if (typeof window === "undefined") {
		return null;
	}

	try {
		const raw = window.localStorage.getItem(storageKey);

		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		window.localStorage.removeItem(storageKey);
		return null;
	}
}

export function readStoredAccountAddress(): AccountLiteAddress {
	return {
		...emptyAccountAddress,
		...(parseStoredJson<Partial<AccountLiteAddress>>(
			accountLiteAddressStorageKey,
		) ?? {}),
	};
}

export function writeStoredAccountAddress(address: AccountLiteAddress) {
	window.localStorage.setItem(
		accountLiteAddressStorageKey,
		JSON.stringify(address),
	);
}

export function clearStoredAccountAddress() {
	window.localStorage.removeItem(accountLiteAddressStorageKey);
}

export function readStoredSiteCustomer(): StoredSiteCustomer | null {
	return parseStoredJson<StoredSiteCustomer>(accountLiteCustomerStorageKey);
}

export function writeStoredSiteCustomer(profile: SiteCustomerProfile) {
	const customer: StoredSiteCustomer = {
		siteCustomerId: profile.siteCustomer.siteCustomerId,
		...(profile.siteCustomer.globalUserId
			? { globalUserId: profile.siteCustomer.globalUserId }
			: {}),
		...(profile.siteCustomer.email ? { email: profile.siteCustomer.email } : {}),
		...(profile.siteCustomer.phone ? { phone: profile.siteCustomer.phone } : {}),
		...(profile.siteCustomer.nickname
			? { nickname: profile.siteCustomer.nickname }
			: {}),
		savedAt: new Date().toISOString(),
	};

	window.localStorage.setItem(
		accountLiteCustomerStorageKey,
		JSON.stringify(customer),
	);

	return customer;
}

export function clearStoredSiteCustomer() {
	window.localStorage.removeItem(accountLiteCustomerStorageKey);
}

export async function upsertCurrentSiteCustomer(input: {
	guestToken: string;
	address: AccountLiteAddress;
}): Promise<SiteCustomerProfile> {
	const response = await fetch("/api/account/site-customer", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({
			guestToken: input.guestToken,
			email: input.address.email,
			phone: input.address.phone,
			nickname: input.address.fullName,
			defaultAddress: {
				label: "Default",
				...input.address,
			},
		}),
	});
	const payload = (await response.json().catch(() => ({}))) as
		| SiteCustomerProfile
		| { message?: string };

	if (!response.ok) {
		throw new Error(
			"message" in payload && payload.message
				? payload.message
				: "Unable to save account.",
		);
	}

	return payload as SiteCustomerProfile;
}

export async function fetchCurrentSiteCustomer(
	siteCustomerId: string,
): Promise<SiteCustomerProfile> {
	const response = await fetch(
		`/api/account/site-customer/${encodeURIComponent(siteCustomerId)}`,
		{ cache: "no-store" },
	);
	const payload = (await response.json().catch(() => ({}))) as
		| SiteCustomerProfile
		| { message?: string };

	if (!response.ok) {
		throw new Error(
			"message" in payload && payload.message
				? payload.message
				: "Unable to load account.",
		);
	}

	return payload as SiteCustomerProfile;
}

export function getProfileDefaultAddress(
	profile: SiteCustomerProfile,
): AccountLiteAddress | null {
	return profile.defaultAddress
		? {
				...emptyAccountAddress,
				...profile.defaultAddress,
			}
		: null;
}
