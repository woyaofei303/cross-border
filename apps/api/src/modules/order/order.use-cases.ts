import type {
	AdminAccessContext,
	AdminScope,
} from "../../common/admin/admin-access.js";
import type {
	EventProcessLogPort,
	OutboxEventDraft,
	OutboxPort,
	TransactionManagerPort,
} from "../../common/application/application-ports.js";
import { DomainRuleViolationError } from "../../common/domain/domain-errors.js";
import { defaultSiteContext, type SiteDimensions } from "../../common/site/site-context.js";
import type { InventoryWriteRepositoryPort } from "../inventory/inventory.ports.js";
import { InventoryWorkflowService } from "../inventory/inventory.service.js";
import type { PaymentSucceededPayload } from "@cross-border/shared";
import type {
	AdminOrderDetail,
	AdminOrderListItem,
	CreateOrderItemInput,
	OrderCheckoutResult,
	OrderSummary,
	OrderWriteRepositoryPort,
	StorefrontOrderDetail,
	StorefrontOrderListItem,
} from "./order.ports.js";
import { OrderWorkflowService } from "./order.service.js";
import type { CreateOrderWorkflowInput } from "./order.types.js";

export type CreateOrderUseCaseInput = Omit<
	CreateOrderWorkflowInput,
	"itemCount"
> &
	SiteDimensions & {
	items: CreateOrderItemInput[];
	shippingAddressSnapshot?: Record<string, unknown>;
	priceSnapshot?: Record<string, unknown>;
};

export type GetOrderCheckoutResultUseCaseInput = SiteDimensions & {
	orderId: string;
	userId?: string;
	guestToken?: string;
};

export type ListStorefrontOrdersUseCaseInput = SiteDimensions & {
	userId?: string;
	guestToken?: string;
	limit?: number;
};

export type GetStorefrontOrderDetailUseCaseInput = SiteDimensions & {
	orderId: string;
	userId?: string;
	guestToken?: string;
};

export type ListAdminOrdersUseCaseInput = {
	adminAccess: AdminAccessContext;
	selectedScope?: AdminScope;
	limit?: number;
};

export type GetAdminOrderDetailUseCaseInput = {
	orderId: string;
	adminAccess: AdminAccessContext;
};

export type CreateOrderUseCaseResult = {
	order: OrderSummary;
	reusedIdempotency: boolean;
	events: OutboxEventDraft<Record<string, unknown>>[];
};

export type ApplyPaymentSucceededUseCaseInput = PaymentSucceededPayload & {
	eventId: string;
	consumerName?: string;
};

export type ApplyPaymentSucceededUseCaseResult =
	| {
			status: "processed";
			events: OutboxEventDraft<Record<string, unknown>>[];
	  }
	| {
			status: "already_processed";
			events: [];
	  }
	| {
			status: "failed";
			errorMessage: string;
			events: [];
	  };

export type CreateOrderUseCaseDeps = {
	transactions: TransactionManagerPort;
	orders: OrderWriteRepositoryPort;
	inventory: InventoryWriteRepositoryPort;
	outbox: OutboxPort;
	orderWorkflow: OrderWorkflowService;
	inventoryWorkflow: InventoryWorkflowService;
};

export type GetOrderCheckoutResultUseCaseDeps = Pick<
	CreateOrderUseCaseDeps,
	"transactions" | "orders"
>;

export type ApplyPaymentSucceededUseCaseDeps = CreateOrderUseCaseDeps & {
	eventProcessLog: EventProcessLogPort;
};

export class CreateOrderUseCase {
	constructor(private readonly deps: CreateOrderUseCaseDeps) {}

	async execute(
		input: CreateOrderUseCaseInput,
	): Promise<CreateOrderUseCaseResult> {
		return this.deps.transactions.runInTransaction(async (transaction) => {
			const existingOrder = await this.deps.orders.findByIdempotencyKey(
				{
					siteId: input.siteId,
					verticalId: input.verticalId,
					brandId: input.brandId,
					allowLegacyNullScope: input.siteId === defaultSiteContext.siteId,
					...(input.userId ? { userId: input.userId } : {}),
					...(input.guestToken ? { guestToken: input.guestToken } : {}),
					idempotencyKey: input.idempotencyKey,
				},
				transaction,
			);

			if (existingOrder) {
				return {
					order: existingOrder,
					reusedIdempotency: true,
					events: [],
				};
			}

			const orderPlan = this.deps.orderWorkflow.planCreateOrder({
				...input,
				itemCount: input.items.length,
			});
			const order = await this.deps.orders.createOrder(
				{
					orderId: input.orderId,
					orderNo: input.orderNo,
					siteId: input.siteId,
					verticalId: input.verticalId,
					brandId: input.brandId,
					...(input.userId ? { userId: input.userId } : {}),
					...(input.guestToken ? { guestToken: input.guestToken } : {}),
					idempotencyKey: input.idempotencyKey,
					currency: input.currency,
					subtotalAmount: input.subtotalAmount,
					discountAmount: input.discountAmount,
					shippingAmount: input.shippingAmount,
					taxAmount: input.taxAmount,
					totalAmount: input.totalAmount,
					orderStatus: orderPlan.initialOrderStatus,
					paymentStatus: orderPlan.initialPaymentStatus,
					fulfillmentStatus: orderPlan.initialFulfillmentStatus,
					...(input.shippingAddressSnapshot
						? { shippingAddressSnapshot: input.shippingAddressSnapshot }
						: {}),
					...(input.priceSnapshot ? { priceSnapshot: input.priceSnapshot } : {}),
				},
				transaction,
			);

			await this.deps.orders.createOrderItems(
				input.items.map((item) => ({
					orderId: input.orderId,
					siteId: input.siteId,
					verticalId: input.verticalId,
					brandId: input.brandId,
					orderItemId: item.orderItemId,
					productId: item.productId,
					skuId: item.skuId,
					skuCode: item.skuCode,
					productTitle: item.productTitle,
					...(item.skuTitle ? { skuTitle: item.skuTitle } : {}),
					...(item.imageUrl ? { imageUrl: item.imageUrl } : {}),
					unitPrice: item.unitPrice,
					quantity: item.quantity,
					discountAmount: item.discountAmount,
					totalAmount: item.totalAmount,
					snapshot: item.snapshot,
				})),
				transaction,
			);
			await this.deps.orders.appendStatusLogs(
				input.orderId,
				[orderPlan.statusLog],
				input,
				transaction,
			);

			const events = [...orderPlan.events];

			for (const item of input.items) {
				const inventorySnapshot =
					await this.deps.inventory.getInventoryForUpdate({
						siteId: input.siteId,
						verticalId: input.verticalId,
						brandId: input.brandId,
						skuId: item.skuId,
						warehouseId: item.warehouseId,
						allowLegacyNullScope: input.siteId === defaultSiteContext.siteId,
						transaction,
					});
				const lockPlan = this.deps.inventoryWorkflow.planLockInventory({
					orderId: input.orderId,
					orderItemId: item.orderItemId,
					quantity: item.quantity,
					expiresAt: item.lockExpiresAt,
					idempotencyKey: `${input.idempotencyKey}:lock:${item.orderItemId}`,
					inventory: inventorySnapshot,
				});

				await this.deps.inventory.saveLock(lockPlan.lock, transaction);
				await this.deps.inventory.updateInventory(
					lockPlan.after,
					transaction,
				);
				await this.deps.inventory.appendTransaction(
					lockPlan.transaction,
					transaction,
				);
				events.push(...lockPlan.events);
			}

			const scopedEvents = withSiteDimensions(events, input);

			await this.deps.outbox.append(scopedEvents, transaction);

			return {
				order,
				reusedIdempotency: false,
				events: scopedEvents,
			};
		});
	}
}

export class GetOrderCheckoutResultUseCase {
	constructor(private readonly deps: GetOrderCheckoutResultUseCaseDeps) {}

	async execute(
		input: GetOrderCheckoutResultUseCaseInput,
	): Promise<OrderCheckoutResult | null> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.orders.getCheckoutResult(
				{
					orderId: input.orderId,
					siteId: input.siteId,
					verticalId: input.verticalId,
					brandId: input.brandId,
					allowLegacyNullScope: input.siteId === defaultSiteContext.siteId,
					...(input.userId ? { userId: input.userId } : {}),
					...(input.guestToken ? { guestToken: input.guestToken } : {}),
				},
				transaction,
			),
		);
	}
}

export class ListStorefrontOrdersUseCase {
	constructor(private readonly deps: GetOrderCheckoutResultUseCaseDeps) {}

	async execute(
		input: ListStorefrontOrdersUseCaseInput,
	): Promise<StorefrontOrderListItem[]> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.orders.listStorefrontOrders(
				{
					siteId: input.siteId,
					verticalId: input.verticalId,
					brandId: input.brandId,
					allowLegacyNullScope: input.siteId === defaultSiteContext.siteId,
					...(input.userId ? { userId: input.userId } : {}),
					...(input.guestToken ? { guestToken: input.guestToken } : {}),
					limit: Math.min(Math.max(input.limit ?? 20, 1), 50),
				},
				transaction,
			),
		);
	}
}

export class GetStorefrontOrderDetailUseCase {
	constructor(private readonly deps: GetOrderCheckoutResultUseCaseDeps) {}

	async execute(
		input: GetStorefrontOrderDetailUseCaseInput,
	): Promise<StorefrontOrderDetail | null> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.orders.getStorefrontOrderDetail(
				{
					orderId: input.orderId,
					siteId: input.siteId,
					verticalId: input.verticalId,
					brandId: input.brandId,
					allowLegacyNullScope: input.siteId === defaultSiteContext.siteId,
					...(input.userId ? { userId: input.userId } : {}),
					...(input.guestToken ? { guestToken: input.guestToken } : {}),
				},
				transaction,
			),
		);
	}
}

export class ListAdminOrdersUseCase {
	constructor(private readonly deps: GetOrderCheckoutResultUseCaseDeps) {}

	async execute(
		input: ListAdminOrdersUseCaseInput,
	): Promise<AdminOrderListItem[]> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.orders.listAdminOrders(
				{
					adminAccess: input.adminAccess,
					...(input.selectedScope ? { selectedScope: input.selectedScope } : {}),
					limit: Math.min(Math.max(input.limit ?? 50, 1), 100),
				},
				transaction,
			),
		);
	}
}

export class GetAdminOrderDetailUseCase {
	constructor(private readonly deps: GetOrderCheckoutResultUseCaseDeps) {}

	async execute(
		input: GetAdminOrderDetailUseCaseInput,
	): Promise<AdminOrderDetail | null> {
		return this.deps.transactions.runInTransaction((transaction) =>
			this.deps.orders.getAdminOrderDetail(
				{
					orderId: input.orderId,
					adminAccess: input.adminAccess,
				},
				transaction,
			),
		);
	}
}

function withSiteDimensions(
	events: OutboxEventDraft<Record<string, unknown>>[],
	dimensions: SiteDimensions,
): OutboxEventDraft<Record<string, unknown>>[] {
	return events.map((event) => ({
		...event,
		siteId: event.siteId ?? dimensions.siteId,
		verticalId: event.verticalId ?? dimensions.verticalId,
		brandId: event.brandId ?? dimensions.brandId,
	}));
}

export class ApplyPaymentSucceededUseCase {
	private readonly consumerName: string;

	constructor(private readonly deps: ApplyPaymentSucceededUseCaseDeps) {
		this.consumerName = "order.apply_payment_succeeded";
	}

	async execute(
		input: ApplyPaymentSucceededUseCaseInput,
	): Promise<ApplyPaymentSucceededUseCaseResult> {
		const consumerName = input.consumerName ?? this.consumerName;

		return this.deps.transactions.runInTransaction(async (transaction) => {
			const processingStatus =
				await this.deps.eventProcessLog.tryStartProcessing({
					eventId: input.eventId,
					consumerName,
					transaction,
				});

			if (processingStatus === "already_processed") {
				return {
					status: "already_processed",
					events: [],
				};
			}

			try {
				const orderSnapshot =
					await this.deps.orders.getPaymentApplicationSnapshot(
						input.orderId,
						transaction,
					);
				const dimensions: SiteDimensions = {
					siteId: orderSnapshot.siteId,
					verticalId: orderSnapshot.verticalId,
					brandId: orderSnapshot.brandId,
				};
				const orderPlan = this.deps.orderWorkflow.planPaymentSucceeded({
					orderId: input.orderId,
					paymentOrderId: input.paymentOrderId,
					currentOrderStatus: orderSnapshot.orderStatus,
					currentPaymentStatus: orderSnapshot.paymentStatus,
					orderTotalAmount: orderSnapshot.totalAmount,
					orderCurrency: orderSnapshot.currency,
					paidAmount: input.amount,
					paidCurrency: input.currency,
				});

				await this.deps.orders.applyPaymentSucceeded(
					{
						orderId: input.orderId,
						orderStatus: orderPlan.nextOrderStatus,
						paymentStatus: orderPlan.nextPaymentStatus,
						paidAt: new Date().toISOString(),
					},
					transaction,
				);
				await this.deps.orders.appendStatusLogs(
					input.orderId,
					orderPlan.statusLogs,
					dimensions,
					transaction,
				);

				const events = [...orderPlan.events];
				const locks =
					await this.deps.inventory.getLocksForOrderForUpdate({
						orderId: input.orderId,
						siteId: dimensions.siteId,
						verticalId: dimensions.verticalId,
						brandId: dimensions.brandId,
						allowLegacyNullScope:
							dimensions.siteId === defaultSiteContext.siteId,
						transaction,
					});

				for (const lockWithSnapshot of locks) {
					const deductPlan = this.deps.inventoryWorkflow.planDeductLock({
						lock: lockWithSnapshot.lock,
						inventory: lockWithSnapshot.inventory,
						idempotencyKey: `${input.eventId}:deduct:${lockWithSnapshot.lock.orderItemId}`,
					});

					await this.deps.inventory.updateInventory(
						deductPlan.after,
						transaction,
					);
					await this.deps.inventory.appendTransaction(
						deductPlan.transaction,
						transaction,
					);
					await this.deps.inventory.updateLockStatus({
						lockIdempotencyKey: lockWithSnapshot.lock.idempotencyKey,
						status: deductPlan.nextLockStatus,
						transaction,
					});
					events.push(...deductPlan.events);
				}

				const scopedEvents = withSiteDimensions(events, dimensions);

				await this.deps.outbox.append(scopedEvents, transaction);
				await this.deps.eventProcessLog.markProcessed({
					eventId: input.eventId,
					consumerName,
					transaction,
				});

				return {
					status: "processed",
					events: scopedEvents,
				};
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				await this.deps.eventProcessLog.markFailed({
					eventId: input.eventId,
					consumerName,
					errorMessage,
					transaction,
				});

				if (error instanceof DomainRuleViolationError) {
					return {
						status: "failed",
						errorMessage,
						events: [],
					};
				}

				throw error;
			}
		});
	}
}
