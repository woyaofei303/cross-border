import {
	BadRequestException,
	Controller,
	Get,
	NotFoundException,
	Param,
	Query,
	Req,
} from "@nestjs/common";
import {
	ApiBadRequestResponse,
	ApiNotFoundResponse,
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
	GetAdminOrderDetailUseCase,
	ListAdminOrdersUseCase,
} from "../order.use-cases.js";
import {
	AdminOrderDetailResponseDto,
	AdminOrderListQueryDto,
	AdminOrderListResponseDto,
} from "./order.dto.js";

function selectedScopeFromQuery(query: AdminOrderListQueryDto): AdminScope | undefined {
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

@ApiTags("admin-orders")
@Controller("admin/orders")
export class AdminOrderController {
	constructor(
		private readonly adminAccess: AdminAccessService,
		private readonly listAdminOrders: ListAdminOrdersUseCase,
		private readonly getAdminOrderDetail: GetAdminOrderDetailUseCase,
	) {}

	@Get()
	@ApiOperation({
		summary: "List orders visible to the current admin scope",
		description:
			"Returns scoped order rows for the unified admin order list. Optional query scope further narrows results but cannot broaden RBAC data scope.",
	})
	@ApiOkResponse({ type: AdminOrderListResponseDto })
	@ApiBadRequestResponse({ description: "Invalid selected scope." })
	async listOrders(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AdminOrderListQueryDto,
	): Promise<AdminOrderListResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const selectedScope = selectedScopeFromQuery(query);
		const orders = await this.listAdminOrders.execute({
			adminAccess: access,
			...(selectedScope ? { selectedScope } : {}),
			...(query.limit ? { limit: query.limit } : {}),
		});

		return { orders };
	}

	@Get(":orderId")
	@ApiOperation({
		summary: "Get an order operations detail visible to the current admin scope",
		description:
			"Returns the order snapshot plus payment, inventory, fulfillment, after-sales, refund, and status-log records.",
	})
	@ApiOkResponse({ type: AdminOrderDetailResponseDto })
	@ApiNotFoundResponse({ description: "Order not found or outside admin scope." })
	async getOrder(
		@Req() request: AdminAccessAwareRequest,
		@Param("orderId") orderId: string,
	): Promise<AdminOrderDetailResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const order = await this.getAdminOrderDetail.execute({
			orderId,
			adminAccess: access,
		});

		if (!order) {
			throw new NotFoundException({
				code: "ADMIN_ORDER_NOT_FOUND",
				message: "Order was not found for the current admin scope.",
			});
		}

		return order;
	}
}
