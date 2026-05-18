import { DomainRuleViolationError } from "../../common/domain/domain-errors.js";
import type { TransactionManagerPort } from "../../common/application/application-ports.js";
import type { CustomerRepositoryPort } from "./customer.ports.js";
import type {
	AdminCustomerListInput,
	AdminCustomerListItem,
	GetSiteCustomerInput,
	SiteCustomerProfile,
	UpsertSiteCustomerAddressInput,
	UpsertSiteCustomerInput,
} from "./customer.types.js";

type CustomerUseCaseDeps = {
	transactions: TransactionManagerPort;
	customers: CustomerRepositoryPort;
};

function assertEmailOrThrow(email: string | undefined) {
	if (!email?.trim()) {
		throw new DomainRuleViolationError(
			"An email is required to create the MVP site customer profile.",
			"CUSTOMER_EMAIL_REQUIRED",
		);
	}
}

export class UpsertStorefrontSiteCustomerUseCase {
	constructor(private readonly deps: CustomerUseCaseDeps) {}

	async execute(input: UpsertSiteCustomerInput): Promise<SiteCustomerProfile> {
		assertEmailOrThrow(input.email);

		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.customers.upsertSiteCustomerWithDefaultAddress(transaction, {
				...input,
				email: input.email.trim().toLowerCase(),
				...(input.phone ? { phone: input.phone.trim() } : {}),
				...(input.nickname ? { nickname: input.nickname.trim() } : {}),
			}),
		);
	}
}

export class UpsertStorefrontSiteCustomerAddressUseCase {
	constructor(private readonly deps: CustomerUseCaseDeps) {}

	async execute(
		input: UpsertSiteCustomerAddressInput,
	): Promise<SiteCustomerProfile | null> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.customers.upsertDefaultAddress(transaction, input),
		);
	}
}

export class GetStorefrontSiteCustomerUseCase {
	constructor(private readonly deps: CustomerUseCaseDeps) {}

	async execute(input: GetSiteCustomerInput): Promise<SiteCustomerProfile | null> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.customers.findSiteCustomerProfile(transaction, input),
		);
	}
}

export class ListAdminCustomersUseCase {
	constructor(private readonly deps: CustomerUseCaseDeps) {}

	async execute(input: AdminCustomerListInput): Promise<AdminCustomerListItem[]> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.customers.listAdminCustomers(transaction, input),
		);
	}
}
