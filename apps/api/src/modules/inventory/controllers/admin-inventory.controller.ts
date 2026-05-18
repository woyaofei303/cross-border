import {
	BadRequestException,
	Controller,
	Get,
	Query,
	Req,
} from "@nestjs/common";
import {
	ApiBadRequestResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from "@nestjs/swagger";
import type {
	AdminAccessAwareRequest,
	AdminScope,
	AdminScopeType,
} from "../../../common/admin/admin-access.js";
import { AdminAccessService } from "../../admin-access/admin-access.service.js";
import {
	ListAdminInventoryBalancesUseCase,
	ListAdminInventoryLocksUseCase,
	ListAdminInventoryTransactionsUseCase,
} from "../inventory.use-cases.js";
import {
	AdminInventoryBalanceListResponseDto,
	AdminInventoryListQueryDto,
	AdminInventoryLockListResponseDto,
	AdminInventoryTransactionListResponseDto,
} from "./inventory.dto.js";

function selectedScopeFromQuery(
	query: AdminInventoryListQueryDto,
): AdminScope | undefined {
	if (!query.scopeType || query.scopeType === "global") {
		return query.scopeType === "global" ? { scopeType: "global" } : undefined;
	}

	if (!query.scopeId) {
		throw new BadRequestException({
			code: "ADMIN_SCOPE_ID_REQUIRED",
			message: "scopeId is required when scopeType is vertical, brand, or site.",
		});
	}

	return {
		scopeType: query.scopeType as Exclude<AdminScopeType, "global">,
		scopeId: query.scopeId,
	};
}

@ApiTags("admin-inventory")
@Controller("admin/inventory")
export class AdminInventoryController {
	constructor(
		private readonly adminAccess: AdminAccessService,
		private readonly listAdminInventoryBalances: ListAdminInventoryBalancesUseCase,
		private readonly listAdminInventoryLocks: ListAdminInventoryLocksUseCase,
		private readonly listAdminInventoryTransactions: ListAdminInventoryTransactionsUseCase,
	) {}

	@Get("balances")
	@ApiOperation({
		summary: "List SKU inventory balances visible to the current admin scope",
		description:
			"Returns scoped available, locked, physical, inbound and safety quantities per SKU and warehouse.",
	})
	@ApiOkResponse({ type: AdminInventoryBalanceListResponseDto })
	@ApiBadRequestResponse({ description: "Invalid selected scope." })
	async listInventoryBalances(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AdminInventoryListQueryDto,
	): Promise<AdminInventoryBalanceListResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const selectedScope = selectedScopeFromQuery(query);
		const inventoryBalances = await this.listAdminInventoryBalances.execute({
			adminAccess: access,
			...(selectedScope ? { selectedScope } : {}),
			...(query.limit ? { limit: query.limit } : {}),
		});

		return { inventoryBalances };
	}

	@Get("locks")
	@ApiOperation({
		summary: "List inventory locks visible to the current admin scope",
		description:
			"Returns scoped inventory lock status, expiry, release, deduction and idempotency details.",
	})
	@ApiOkResponse({ type: AdminInventoryLockListResponseDto })
	@ApiBadRequestResponse({ description: "Invalid selected scope." })
	async listInventoryLocks(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AdminInventoryListQueryDto,
	): Promise<AdminInventoryLockListResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const selectedScope = selectedScopeFromQuery(query);
		const inventoryLocks = await this.listAdminInventoryLocks.execute({
			adminAccess: access,
			...(selectedScope ? { selectedScope } : {}),
			...(query.limit ? { limit: query.limit } : {}),
		});

		return { inventoryLocks };
	}

	@Get("transactions")
	@ApiOperation({
		summary: "List inventory transactions visible to the current admin scope",
		description:
			"Returns scoped stock movement before/after quantities and idempotency keys for traceability.",
	})
	@ApiOkResponse({ type: AdminInventoryTransactionListResponseDto })
	@ApiBadRequestResponse({ description: "Invalid selected scope." })
	async listInventoryTransactions(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AdminInventoryListQueryDto,
	): Promise<AdminInventoryTransactionListResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const selectedScope = selectedScopeFromQuery(query);
		const inventoryTransactions =
			await this.listAdminInventoryTransactions.execute({
				adminAccess: access,
				...(selectedScope ? { selectedScope } : {}),
				...(query.limit ? { limit: query.limit } : {}),
			});

		return { inventoryTransactions };
	}
}
