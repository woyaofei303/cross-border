import type { TransactionManagerPort } from "../../common/application/application-ports.js";
import type {
	AdminInventoryBalanceListItem,
	AdminInventoryLockListItem,
	AdminInventoryScopeQuery,
	AdminInventoryTransactionListItem,
	InventoryAdminReadRepositoryPort,
} from "./inventory.ports.js";

export type InventoryAdminReadUseCaseDeps = {
	transactions: TransactionManagerPort;
	inventory: InventoryAdminReadRepositoryPort;
};

export type ListAdminInventoryUseCaseInput = Omit<
	AdminInventoryScopeQuery,
	"limit"
> & {
	limit?: number;
};

function normalizeAdminInventoryLimit(limit: number | undefined): number {
	if (!Number.isInteger(limit)) {
		return 50;
	}

	return Math.min(Math.max(limit ?? 50, 1), 100);
}

export class ListAdminInventoryBalancesUseCase {
	constructor(private readonly deps: InventoryAdminReadUseCaseDeps) {}

	async execute(
		input: ListAdminInventoryUseCaseInput,
	): Promise<AdminInventoryBalanceListItem[]> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.inventory.listAdminInventoryBalances(
				{
					adminAccess: input.adminAccess,
					...(input.selectedScope ? { selectedScope: input.selectedScope } : {}),
					limit: normalizeAdminInventoryLimit(input.limit),
				},
				transaction,
			),
		);
	}
}

export class ListAdminInventoryLocksUseCase {
	constructor(private readonly deps: InventoryAdminReadUseCaseDeps) {}

	async execute(
		input: ListAdminInventoryUseCaseInput,
	): Promise<AdminInventoryLockListItem[]> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.inventory.listAdminInventoryLocks(
				{
					adminAccess: input.adminAccess,
					...(input.selectedScope ? { selectedScope: input.selectedScope } : {}),
					limit: normalizeAdminInventoryLimit(input.limit),
				},
				transaction,
			),
		);
	}
}

export class ListAdminInventoryTransactionsUseCase {
	constructor(private readonly deps: InventoryAdminReadUseCaseDeps) {}

	async execute(
		input: ListAdminInventoryUseCaseInput,
	): Promise<AdminInventoryTransactionListItem[]> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.inventory.listAdminInventoryTransactions(
				{
					adminAccess: input.adminAccess,
					...(input.selectedScope ? { selectedScope: input.selectedScope } : {}),
					limit: normalizeAdminInventoryLimit(input.limit),
				},
				transaction,
			),
		);
	}
}
