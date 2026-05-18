import { describe, expect, it } from "vitest";
import type { TransactionContext } from "../../common/application/application-ports.js";
import { DomainRuleViolationError } from "../../common/domain/domain-errors.js";
import type { CustomerRepositoryPort } from "./customer.ports.js";
import {
	GetStorefrontSiteCustomerUseCase,
	ListAdminCustomersUseCase,
	UpsertStorefrontSiteCustomerAddressUseCase,
	UpsertStorefrontSiteCustomerUseCase,
} from "./customer.use-cases.js";
import type {
	AdminCustomerListInput,
	AdminCustomerListItem,
	GetSiteCustomerInput,
	SiteCustomerProfile,
	UpsertSiteCustomerAddressInput,
	UpsertSiteCustomerInput,
} from "./customer.types.js";

const transaction: TransactionContext = {
	transactionId: Symbol("test"),
};

const profile: SiteCustomerProfile = {
	globalUser: {
		userId: "00000000-0000-4000-8000-000000000901",
		email: "buyer@example.com",
		status: "active",
		userType: "registered",
		riskLevel: "normal",
		createdAt: "2026-05-16T00:00:00.000Z",
		updatedAt: "2026-05-16T00:00:00.000Z",
	},
	siteCustomer: {
		siteCustomerId: "00000000-0000-4000-8000-000000000902",
		globalUserId: "00000000-0000-4000-8000-000000000901",
		siteId: "site-1",
		verticalId: "vertical-1",
		brandId: "brand-1",
		email: "buyer@example.com",
		membershipLevel: "standard",
		points: 0,
		status: "active",
		createdAt: "2026-05-16T00:00:00.000Z",
		updatedAt: "2026-05-16T00:00:00.000Z",
	},
	addresses: [
		{
			addressId: "00000000-0000-4000-8000-000000000903",
			siteCustomerId: "00000000-0000-4000-8000-000000000902",
			siteId: "site-1",
			verticalId: "vertical-1",
			brandId: "brand-1",
			email: "buyer@example.com",
			fullName: "Demo Buyer",
			countryCode: "US",
			city: "San Francisco",
			postalCode: "94105",
			addressLine1: "100 Market Street",
			isDefault: true,
			createdAt: "2026-05-16T00:00:00.000Z",
			updatedAt: "2026-05-16T00:00:00.000Z",
		},
	],
};

class MemoryCustomers implements CustomerRepositoryPort {
	upsertInput: UpsertSiteCustomerInput | undefined;
	addressInput: UpsertSiteCustomerAddressInput | undefined;
	findInput: GetSiteCustomerInput | undefined;
	adminInput: AdminCustomerListInput | undefined;
	adminCustomers: AdminCustomerListItem[] = [];

	async upsertSiteCustomerWithDefaultAddress(
		_transaction: TransactionContext,
		input: UpsertSiteCustomerInput,
	) {
		this.upsertInput = input;
		return profile;
	}

	async upsertDefaultAddress(
		_transaction: TransactionContext,
		input: UpsertSiteCustomerAddressInput,
	) {
		this.addressInput = input;
		return profile;
	}

	async findSiteCustomerProfile(
		_transaction: TransactionContext,
		input: GetSiteCustomerInput,
	) {
		this.findInput = input;
		return input.siteId === "site-1" ? profile : null;
	}

	async listAdminCustomers(
		_transaction: TransactionContext,
		input: AdminCustomerListInput,
	) {
		this.adminInput = input;
		return this.adminCustomers;
	}
}

function createUseCases(customers = new MemoryCustomers()) {
	const transactions = {
		runInTransaction: <T>(work: (context: TransactionContext) => Promise<T>) =>
			work(transaction),
	};

	return {
		customers,
		upsert: new UpsertStorefrontSiteCustomerUseCase({
			transactions,
			customers,
		}),
		upsertAddress: new UpsertStorefrontSiteCustomerAddressUseCase({
			transactions,
			customers,
		}),
		get: new GetStorefrontSiteCustomerUseCase({ transactions, customers }),
		listAdmin: new ListAdminCustomersUseCase({ transactions, customers }),
	};
}

describe("customer use cases", () => {
	it("normalizes email and preserves current-site dimensions when creating a site customer", async () => {
		const { upsert, customers } = createUseCases();
		const result = await upsert.execute({
			siteId: "site-1",
			verticalId: "vertical-1",
			brandId: "brand-1",
			guestToken: "guest-1",
			email: " Buyer@Example.COM ",
			nickname: " Demo Buyer ",
			defaultAddress: {
				email: "buyer@example.com",
				fullName: "Demo Buyer",
				countryCode: "US",
				city: "San Francisco",
				postalCode: "94105",
				addressLine1: "100 Market Street",
			},
		});

		expect(customers.upsertInput).toMatchObject({
			siteId: "site-1",
			verticalId: "vertical-1",
			brandId: "brand-1",
			email: "buyer@example.com",
			nickname: "Demo Buyer",
		});
		expect(result.siteCustomer.siteId).toBe("site-1");
	});

	it("rejects missing email for the MVP guest-to-account path", async () => {
		const { upsert } = createUseCases();

		await expect(
			upsert.execute({
				siteId: "site-1",
				verticalId: "vertical-1",
				brandId: "brand-1",
				email: "",
			}),
		).rejects.toBeInstanceOf(DomainRuleViolationError);
	});

	it("reads and writes addresses only through the current site customer id", async () => {
		const { upsertAddress, get, customers } = createUseCases();

		await upsertAddress.execute({
			siteId: "site-1",
			verticalId: "vertical-1",
			brandId: "brand-1",
			siteCustomerId: "customer-1",
			address: {
				email: "buyer@example.com",
				fullName: "Demo Buyer",
				countryCode: "US",
				city: "San Francisco",
				postalCode: "94105",
				addressLine1: "100 Market Street",
			},
		});
		const missing = await get.execute({
			siteId: "other-site",
			siteCustomerId: "customer-1",
		});

		expect(customers.addressInput?.siteId).toBe("site-1");
		expect(missing).toBeNull();
	});

	it("passes admin scopes to customer listing", async () => {
		const { listAdmin, customers } = createUseCases();

		await listAdmin.execute({
			adminScopes: [{ scopeType: "site", scopeId: "site-1" }],
			selectedScope: { scopeType: "site", scopeId: "site-1" },
			limit: 50,
		});

		expect(customers.adminInput).toMatchObject({
			adminScopes: [{ scopeType: "site", scopeId: "site-1" }],
			selectedScope: { scopeType: "site", scopeId: "site-1" },
			limit: 50,
		});
	});
});
