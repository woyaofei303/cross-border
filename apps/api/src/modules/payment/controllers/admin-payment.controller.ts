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
	ListAdminPaymentOrdersUseCase,
	ListAdminPaymentTransactionsUseCase,
	ListAdminPaymentWebhooksUseCase,
} from "../payment.use-cases.js";
import {
	AdminPaymentListQueryDto,
	AdminPaymentOrderListResponseDto,
	AdminPaymentTransactionListResponseDto,
	AdminPaymentWebhookListResponseDto,
} from "./payment.dto.js";

function selectedScopeFromQuery(
	query: AdminPaymentListQueryDto,
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

@ApiTags("admin-payments")
@Controller("admin/payments")
export class AdminPaymentController {
	constructor(
		private readonly adminAccess: AdminAccessService,
		private readonly listAdminPaymentOrders: ListAdminPaymentOrdersUseCase,
		private readonly listAdminPaymentTransactions: ListAdminPaymentTransactionsUseCase,
		private readonly listAdminPaymentWebhooks: ListAdminPaymentWebhooksUseCase,
	) {}

	@Get("orders")
	@ApiOperation({
		summary: "List payment orders visible to the current admin scope",
		description:
			"Returns scoped payment orders with order number, idempotency key, transaction count, and latest webhook status.",
	})
	@ApiOkResponse({ type: AdminPaymentOrderListResponseDto })
	@ApiBadRequestResponse({ description: "Invalid selected scope." })
	async listPaymentOrders(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AdminPaymentListQueryDto,
	): Promise<AdminPaymentOrderListResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const selectedScope = selectedScopeFromQuery(query);
		const paymentOrders = await this.listAdminPaymentOrders.execute({
			adminAccess: access,
			...(selectedScope ? { selectedScope } : {}),
			...(query.limit ? { limit: query.limit } : {}),
		});

		return { paymentOrders };
	}

	@Get("transactions")
	@ApiOperation({
		summary: "List payment transactions visible to the current admin scope",
		description:
			"Returns scoped payment transactions for payment reconciliation and duplicate transaction inspection.",
	})
	@ApiOkResponse({ type: AdminPaymentTransactionListResponseDto })
	@ApiBadRequestResponse({ description: "Invalid selected scope." })
	async listPaymentTransactions(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AdminPaymentListQueryDto,
	): Promise<AdminPaymentTransactionListResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const selectedScope = selectedScopeFromQuery(query);
		const paymentTransactions =
			await this.listAdminPaymentTransactions.execute({
				adminAccess: access,
				...(selectedScope ? { selectedScope } : {}),
				...(query.limit ? { limit: query.limit } : {}),
			});

		return { paymentTransactions };
	}

	@Get("webhooks")
	@ApiOperation({
		summary: "List payment webhook events visible to the current admin scope",
		description:
			"Returns provider webhook ids, event type, processing status, error message, processed time, and dedupe key.",
	})
	@ApiOkResponse({ type: AdminPaymentWebhookListResponseDto })
	@ApiBadRequestResponse({ description: "Invalid selected scope." })
	async listPaymentWebhooks(
		@Req() request: AdminAccessAwareRequest,
		@Query() query: AdminPaymentListQueryDto,
	): Promise<AdminPaymentWebhookListResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const selectedScope = selectedScopeFromQuery(query);
		const paymentWebhooks = await this.listAdminPaymentWebhooks.execute({
			adminAccess: access,
			...(selectedScope ? { selectedScope } : {}),
			...(query.limit ? { limit: query.limit } : {}),
		});

		return { paymentWebhooks };
	}
}
