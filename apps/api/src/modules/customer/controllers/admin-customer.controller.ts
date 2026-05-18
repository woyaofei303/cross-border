import { BadRequestException, Controller, Get, Query, Req } from "@nestjs/common";
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type {
	AdminAccessAwareRequest,
	AdminScope,
	AdminScopeType,
} from "../../../common/admin/admin-access.js";
import { AdminAccessService } from "../../admin-access/admin-access.service.js";
import { ListAdminCustomersUseCase } from "../customer.use-cases.js";
import {
	AdminCustomerListQueryDto,
	AdminCustomerListResponseDto,
} from "./customer.dto.js";

function selectedScopeFromQuery(
	query: AdminCustomerListQueryDto,
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

@ApiTags("admin-customers")
@Controller("admin/customers")
export class AdminCustomerController {
	constructor(
		private readonly adminAccess: AdminAccessService,
		private readonly listAdminCustomers: ListAdminCustomersUseCase,
	) {}

	@Get()
	@ApiOperation({
		summary: "List site customers visible to the current admin data scope",
		description:
			"Returns Site Customer rows and default addresses filtered by RBAC + Scope.",
	})
	@ApiOkResponse({ type: AdminCustomerListResponseDto })
	@ApiBadRequestResponse({ description: "Invalid selected scope." })
	async listCustomers(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AdminCustomerListQueryDto,
	): Promise<AdminCustomerListResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const selectedScope = selectedScopeFromQuery(query);
		const customers = await this.listAdminCustomers.execute({
			adminScopes: access.scopes,
			...(selectedScope ? { selectedScope } : {}),
			...(query.limit !== undefined ? { limit: Number(query.limit) } : {}),
		});

		return { customers };
	}
}
