import type { AdminScope } from "../../common/admin/admin-access.js";

export type SiteCustomerStatus = "active" | "disabled" | "blocked";

export type SiteCustomerAddressInput = {
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
	isDefault?: boolean;
};

export type SiteCustomerAddress = SiteCustomerAddressInput & {
	addressId: string;
	siteCustomerId: string;
	siteId: string;
	verticalId: string;
	brandId: string;
	isDefault: boolean;
	createdAt: string;
	updatedAt: string;
};

export type SiteCustomerSummary = {
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
	status: SiteCustomerStatus;
	createdAt: string;
	updatedAt: string;
};

export type GlobalUserSummary = {
	userId: string;
	email?: string;
	phone?: string;
	status: SiteCustomerStatus;
	userType: "guest" | "registered";
	riskLevel: "normal" | "watch" | "high" | "blocked";
	createdAt: string;
	updatedAt: string;
};

export type SiteCustomerProfile = {
	globalUser?: GlobalUserSummary;
	siteCustomer: SiteCustomerSummary;
	addresses: SiteCustomerAddress[];
	defaultAddress?: SiteCustomerAddress;
};

export type UpsertSiteCustomerInput = {
	siteId: string;
	verticalId: string;
	brandId: string;
	guestToken?: string;
	email: string;
	phone?: string;
	nickname?: string;
	defaultAddress?: SiteCustomerAddressInput;
};

export type UpsertSiteCustomerAddressInput = {
	siteId: string;
	verticalId: string;
	brandId: string;
	siteCustomerId: string;
	address: SiteCustomerAddressInput;
};

export type GetSiteCustomerInput = {
	siteId: string;
	siteCustomerId: string;
};

export type AdminCustomerListInput = {
	adminScopes: AdminScope[];
	selectedScope?: AdminScope;
	limit?: number;
};

export type AdminCustomerListItem = SiteCustomerSummary & {
	globalUser?: GlobalUserSummary;
	defaultAddress?: SiteCustomerAddress;
	orderCount: number;
	lifetimeSpend: string;
	currency?: string;
};
