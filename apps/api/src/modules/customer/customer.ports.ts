import type { TransactionContext } from "../../common/application/application-ports.js";
import type {
	AdminCustomerListInput,
	AdminCustomerListItem,
	GetSiteCustomerInput,
	SiteCustomerProfile,
	UpsertSiteCustomerAddressInput,
	UpsertSiteCustomerInput,
} from "./customer.types.js";

export interface CustomerRepositoryPort {
	upsertSiteCustomerWithDefaultAddress(
		transaction: TransactionContext,
		input: UpsertSiteCustomerInput,
	): Promise<SiteCustomerProfile>;

	upsertDefaultAddress(
		transaction: TransactionContext,
		input: UpsertSiteCustomerAddressInput,
	): Promise<SiteCustomerProfile | null>;

	findSiteCustomerProfile(
		transaction: TransactionContext,
		input: GetSiteCustomerInput,
	): Promise<SiteCustomerProfile | null>;

	listAdminCustomers(
		transaction: TransactionContext,
		input: AdminCustomerListInput,
	): Promise<AdminCustomerListItem[]>;
}
