import { describe, expect, it } from "vitest";
import {
	NoopTransactionManager,
	type OutboxEventDraft,
	type OutboxPort,
	type TransactionContext,
} from "../../common/application/application-ports.js";
import { defaultSiteContext } from "../../common/site/site-context.js";
import type {
	InventoryLockWithSnapshot,
	InventoryWriteRepositoryPort,
} from "../inventory/inventory.ports.js";
import { InventoryWorkflowService } from "../inventory/inventory.service.js";
import type {
	InventoryMutation,
	InventorySnapshot,
	LockInventoryPlan,
} from "../inventory/inventory.types.js";
import type {
	ApplyPaymentSucceededRecord,
	AdminOrderDetail,
	AdminOrderListItem,
	AdminOrderScopeQuery,
	BuyerIdempotencyScope,
	CreateOrderItemRecord,
	CreateOrderRecord,
	OrderCheckoutResult,
	OrderCheckoutResultBuyerScope,
	OrderLookupBuyerScope,
	OrderPaymentApplicationSnapshot,
	OrderStatusLogRecord,
	OrderSummary,
	OrderWriteRepositoryPort,
	StorefrontOrderDetail,
	StorefrontOrderListItem,
} from "./order.ports.js";
import { OrderWorkflowService } from "./order.service.js";
import {
	ApplyPaymentSucceededUseCase,
	CreateOrderUseCase,
	GetAdminOrderDetailUseCase,
	GetStorefrontOrderDetailUseCase,
	GetOrderCheckoutResultUseCase,
	ListAdminOrdersUseCase,
	ListStorefrontOrdersUseCase,
} from "./order.use-cases.js";

class MemoryOutbox implements OutboxPort {
	events: OutboxEventDraft<Record<string, unknown>>[] = [];

	async append(
		events: OutboxEventDraft<Record<string, unknown>>[],
	): Promise<void> {
		this.events.push(...events);
	}
}

class MemoryOrderRepository implements OrderWriteRepositoryPort {
	existingOrder: OrderSummary | null = null;
	lastIdempotencyScope: BuyerIdempotencyScope | null = null;
	createdOrder: CreateOrderRecord | null = null;
	createdItems: CreateOrderItemRecord[] = [];
	statusLogs: OrderStatusLogRecord[] = [];
	appliedPayment: ApplyPaymentSucceededRecord | null = null;
	lastCheckoutResultScope: OrderCheckoutResultBuyerScope | null = null;
	lastOrderListScope: (OrderLookupBuyerScope & { limit: number }) | null = null;
	lastOrderDetailScope: (OrderLookupBuyerScope & { orderId: string }) | null =
		null;
	checkoutResult: OrderCheckoutResult | null = null;
	orderList: StorefrontOrderListItem[] = [];
	orderDetail: StorefrontOrderDetail | null = null;
	lastAdminOrderListQuery: AdminOrderScopeQuery | null = null;
	lastAdminOrderDetailInput: {
		orderId: string;
		adminAccess: AdminOrderScopeQuery["adminAccess"];
	} | null = null;
	adminOrderList: AdminOrderListItem[] = [];
	adminOrderDetail: AdminOrderDetail | null = null;
	paymentSnapshot: OrderPaymentApplicationSnapshot = {
		orderId: "order-1",
		paymentOrderId: "pay-1",
		siteId: defaultSiteContext.siteId,
		verticalId: defaultSiteContext.verticalId,
		brandId: defaultSiteContext.brandId,
		orderStatus: "payment_processing",
		paymentStatus: "processing",
		totalAmount: "100.00",
		currency: "USD",
	};

	async findByIdempotencyKey(
		scope: BuyerIdempotencyScope,
	): Promise<OrderSummary | null> {
		this.lastIdempotencyScope = scope;
		return this.existingOrder;
	}

	async createOrder(record: CreateOrderRecord): Promise<OrderSummary> {
		this.createdOrder = record;
		return {
			orderId: record.orderId,
			orderNo: record.orderNo,
			idempotencyKey: record.idempotencyKey,
		};
	}

	async createOrderItems(records: CreateOrderItemRecord[]): Promise<void> {
		this.createdItems.push(...records);
	}

	async appendStatusLogs(
		_orderId: string,
		records: OrderStatusLogRecord[],
	): Promise<void> {
		this.statusLogs.push(...records);
	}

	async getPaymentApplicationSnapshot(): Promise<OrderPaymentApplicationSnapshot> {
		return this.paymentSnapshot;
	}

	async getCheckoutResult(
		scope: OrderCheckoutResultBuyerScope,
	): Promise<OrderCheckoutResult | null> {
		this.lastCheckoutResultScope = scope;
		return this.checkoutResult;
	}

	async listStorefrontOrders(
		scope: OrderLookupBuyerScope & { limit: number },
	): Promise<StorefrontOrderListItem[]> {
		this.lastOrderListScope = scope;
		return this.orderList;
	}

	async getStorefrontOrderDetail(
		scope: OrderLookupBuyerScope & { orderId: string },
	): Promise<StorefrontOrderDetail | null> {
		this.lastOrderDetailScope = scope;
		return this.orderDetail;
	}

	async listAdminOrders(
		query: AdminOrderScopeQuery,
	): Promise<AdminOrderListItem[]> {
		this.lastAdminOrderListQuery = query;
		return this.adminOrderList;
	}

	async getAdminOrderDetail(input: {
		orderId: string;
		adminAccess: AdminOrderScopeQuery["adminAccess"];
	}): Promise<AdminOrderDetail | null> {
		this.lastAdminOrderDetailInput = input;
		return this.adminOrderDetail;
	}

	async applyPaymentSucceeded(
		record: ApplyPaymentSucceededRecord,
	): Promise<void> {
		this.appliedPayment = record;
	}
}

class MemoryInventoryRepository implements InventoryWriteRepositoryPort {
	snapshot: InventorySnapshot = {
		siteId: defaultSiteContext.siteId,
		verticalId: defaultSiteContext.verticalId,
		brandId: defaultSiteContext.brandId,
		skuId: "sku-1",
		warehouseId: "wh-1",
		availableQty: 10,
		lockedQty: 0,
		physicalQty: 10,
		inboundQty: 0,
		safetyQty: 1,
		version: 0,
	};
	locksForOrder: InventoryLockWithSnapshot[] = [];
	savedLocks: LockInventoryPlan["lock"][] = [];
	updatedSnapshots: InventorySnapshot[] = [];
	transactions: InventoryMutation["transaction"][] = [];
	inventoryScopes: Array<{
		siteId: string;
		verticalId: string;
		brandId: string;
		allowLegacyNullScope?: boolean;
	}> = [];
	lockScopes: Array<{
		orderId: string;
		siteId: string;
		verticalId: string;
		brandId: string;
		allowLegacyNullScope?: boolean;
	}> = [];
	lockStatusUpdates: Array<{
		lockIdempotencyKey: string;
		status: "released" | "deducted";
	}> = [];

	async getInventoryForUpdate(input: {
		siteId: string;
		verticalId: string;
		brandId: string;
		allowLegacyNullScope?: boolean;
	}): Promise<InventorySnapshot> {
		this.inventoryScopes.push(input);
		return this.snapshot;
	}

	async saveLock(lock: LockInventoryPlan["lock"]): Promise<void> {
		this.savedLocks.push(lock);
	}

	async getLocksForOrderForUpdate(input: {
		orderId: string;
		siteId: string;
		verticalId: string;
		brandId: string;
		allowLegacyNullScope?: boolean;
	}): Promise<InventoryLockWithSnapshot[]> {
		this.lockScopes.push(input);
		return this.locksForOrder;
	}

	async updateInventory(snapshot: InventorySnapshot): Promise<void> {
		this.updatedSnapshots.push(snapshot);
	}

	async appendTransaction(
		transactionRecord: InventoryMutation["transaction"],
	): Promise<void> {
		this.transactions.push(transactionRecord);
	}

	async updateLockStatus(input: {
		lockIdempotencyKey: string;
		status: "released" | "deducted";
		transaction: TransactionContext;
	}): Promise<void> {
		this.lockStatusUpdates.push({
			lockIdempotencyKey: input.lockIdempotencyKey,
			status: input.status,
		});
	}
}

class MemoryEventProcessLog {
	status: "started" | "already_processed" = "started";
	processed = false;
	failed: string | null = null;

	async tryStartProcessing(): Promise<"started" | "already_processed"> {
		return this.status;
	}

	async markProcessed(): Promise<void> {
		this.processed = true;
	}

	async markFailed(input: { errorMessage: string }): Promise<void> {
		this.failed = input.errorMessage;
	}
}

function createOrderDeps() {
	const outbox = new MemoryOutbox();
	const orders = new MemoryOrderRepository();
	const inventory = new MemoryInventoryRepository();

	return {
		outbox,
		orders,
		inventory,
		transactions: new NoopTransactionManager(),
		orderWorkflow: new OrderWorkflowService(),
		inventoryWorkflow: new InventoryWorkflowService(),
	};
}

describe("CreateOrderUseCase", () => {
	it("creates order, locks inventory, and appends outbox events in one transaction boundary", async () => {
		const deps = createOrderDeps();
		const useCase = new CreateOrderUseCase(deps);

		const result = await useCase.execute({
			orderId: "order-1",
			orderNo: "CB202605160001",
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			userId: "user-1",
			idempotencyKey: "create-order-1",
			currency: "USD",
			subtotalAmount: "100.00",
			discountAmount: "0.00",
			shippingAmount: "0.00",
			taxAmount: "0.00",
			totalAmount: "100.00",
			shippingAddressSnapshot: {
				email: "buyer@example.com",
				countryCode: "US",
			},
			priceSnapshot: {
				totalAmount: "100.00",
				currency: "USD",
			},
			items: [
				{
					orderItemId: "item-1",
					productId: "product-1",
					skuId: "sku-1",
					skuCode: "SKU-1",
					productTitle: "Product",
					unitPrice: "100.00",
					quantity: 1,
					discountAmount: "0.00",
					totalAmount: "100.00",
					snapshot: {},
					warehouseId: "wh-1",
					lockExpiresAt: "2026-05-16T01:00:00.000Z",
				},
			],
		});

		expect(result.reusedIdempotency).toBe(false);
		expect(deps.orders.createdOrder?.orderStatus).toBe("pending_payment");
		expect(deps.orders.createdItems).toHaveLength(1);
		expect(deps.inventory.savedLocks[0]?.status).toBe("locked");
		expect(deps.inventory.savedLocks[0]).toMatchObject({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
		});
		expect(deps.inventory.updatedSnapshots[0]?.availableQty).toBe(9);
		expect(deps.inventory.transactions[0]).toMatchObject({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
		});
		expect(deps.inventory.inventoryScopes[0]).toMatchObject({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			allowLegacyNullScope: true,
		});
		expect(deps.outbox.events.map((event) => event.eventType)).toEqual([
			"OrderCreated",
			"InventoryLocked",
		]);
		expect(
			deps.outbox.events.every(
				(event) => event.siteId === defaultSiteContext.siteId,
			),
		).toBe(true);
		expect(deps.orders.createdOrder).toMatchObject({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			priceSnapshot: {
				totalAmount: "100.00",
				currency: "USD",
			},
			shippingAddressSnapshot: {
				email: "buyer@example.com",
				countryCode: "US",
			},
		});
		expect(deps.orders.lastIdempotencyScope).toMatchObject({
			siteId: defaultSiteContext.siteId,
			allowLegacyNullScope: true,
		});
	});

	it("returns the existing order without locking inventory when idempotency key already exists", async () => {
		const deps = createOrderDeps();
		deps.orders.existingOrder = {
			orderId: "order-1",
			orderNo: "CB202605160001",
			idempotencyKey: "create-order-1",
		};
		const useCase = new CreateOrderUseCase(deps);

		const result = await useCase.execute({
			orderId: "order-1",
			orderNo: "CB202605160001",
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			userId: "user-1",
			idempotencyKey: "create-order-1",
			currency: "USD",
			subtotalAmount: "100.00",
			discountAmount: "0.00",
			shippingAmount: "0.00",
			taxAmount: "0.00",
			totalAmount: "100.00",
			items: [],
		});

		expect(result.reusedIdempotency).toBe(true);
		expect(deps.inventory.savedLocks).toHaveLength(0);
		expect(deps.outbox.events).toHaveLength(0);
	});
});

describe("GetOrderCheckoutResultUseCase", () => {
	it("reads checkout result with current site and buyer scope", async () => {
		const deps = createOrderDeps();
		deps.orders.checkoutResult = {
			orderId: "order-1",
			orderNo: "CB202605160001",
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: "guest-1",
			orderStatus: "paid",
			paymentStatus: "paid",
			fulfillmentStatus: "unfulfilled",
			aftersalesStatus: "none",
			currency: "USD",
			subtotalAmount: "100.00",
			discountAmount: "0.00",
			shippingAmount: "0.00",
			taxAmount: "0.00",
			totalAmount: "100.00",
			createdAt: "2026-05-16T00:00:00.000Z",
			updatedAt: "2026-05-16T00:00:00.000Z",
		};
		const useCase = new GetOrderCheckoutResultUseCase({
			transactions: deps.transactions,
			orders: deps.orders,
		});

		const result = await useCase.execute({
			orderId: "order-1",
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: "guest-1",
		});

		expect(result?.paymentStatus).toBe("paid");
		expect(deps.orders.lastCheckoutResultScope).toMatchObject({
			orderId: "order-1",
			siteId: defaultSiteContext.siteId,
			guestToken: "guest-1",
			allowLegacyNullScope: true,
		});
	});
});

describe("Storefront order read use cases", () => {
	it("lists orders with current site and buyer scope", async () => {
		const deps = createOrderDeps();
		deps.orders.orderList = [
			{
				orderId: "order-1",
				orderNo: "CB202605160001",
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				guestToken: "guest-1",
				orderStatus: "paid",
				paymentStatus: "paid",
				fulfillmentStatus: "unfulfilled",
				aftersalesStatus: "none",
				currency: "USD",
				totalAmount: "100.00",
				itemCount: 1,
				createdAt: "2026-05-16T00:00:00.000Z",
				updatedAt: "2026-05-16T00:00:00.000Z",
			},
		];
		const useCase = new ListStorefrontOrdersUseCase({
			transactions: deps.transactions,
			orders: deps.orders,
		});

		const result = await useCase.execute({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: "guest-1",
			limit: 500,
		});

		expect(result).toHaveLength(1);
		expect(deps.orders.lastOrderListScope).toMatchObject({
			siteId: defaultSiteContext.siteId,
			guestToken: "guest-1",
			allowLegacyNullScope: true,
			limit: 50,
		});
	});

	it("reads order detail with current site and buyer scope", async () => {
		const deps = createOrderDeps();
		deps.orders.orderDetail = {
			orderId: "order-1",
			orderNo: "CB202605160001",
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: "guest-1",
			orderStatus: "fulfilled",
			paymentStatus: "paid",
			fulfillmentStatus: "delivered",
			aftersalesStatus: "none",
			currency: "USD",
			subtotalAmount: "100.00",
			discountAmount: "0.00",
			shippingAmount: "0.00",
			taxAmount: "0.00",
			totalAmount: "100.00",
			createdAt: "2026-05-16T00:00:00.000Z",
			updatedAt: "2026-05-16T00:00:00.000Z",
			shippingAddressSnapshot: { countryCode: "US" },
			priceSnapshot: { totalAmount: "100.00" },
			items: [],
			shipments: [],
		};
		const useCase = new GetStorefrontOrderDetailUseCase({
			transactions: deps.transactions,
			orders: deps.orders,
		});

		const result = await useCase.execute({
			orderId: "order-1",
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: "guest-1",
		});

		expect(result?.fulfillmentStatus).toBe("delivered");
		expect(deps.orders.lastOrderDetailScope).toMatchObject({
			orderId: "order-1",
			siteId: defaultSiteContext.siteId,
			guestToken: "guest-1",
			allowLegacyNullScope: true,
		});
	});
});

describe("Admin order read use cases", () => {
	it("lists scoped admin orders with a bounded limit and selected scope", async () => {
		const deps = createOrderDeps();
		deps.orders.adminOrderList = [
			{
				orderId: "order-1",
				orderNo: "CB202605160001",
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				orderStatus: "paid",
				paymentStatus: "paid",
				fulfillmentStatus: "unfulfilled",
				aftersalesStatus: "none",
				currency: "USD",
				totalAmount: "100.00",
				itemCount: 1,
				statusLogCount: 2,
				createdAt: "2026-05-16T00:00:00.000Z",
				updatedAt: "2026-05-16T00:00:00.000Z",
			},
		];
		const useCase = new ListAdminOrdersUseCase({
			transactions: deps.transactions,
			orders: deps.orders,
		});

		const result = await useCase.execute({
			adminAccess: {
				source: "database",
				adminUserId: "admin-1",
				scopes: [{ scopeType: "site", scopeId: defaultSiteContext.siteId }],
			},
			selectedScope: { scopeType: "site", scopeId: defaultSiteContext.siteId },
			limit: 500,
		});

		expect(result[0]?.orderNo).toBe("CB202605160001");
		expect(deps.orders.lastAdminOrderListQuery).toMatchObject({
			selectedScope: {
				scopeType: "site",
				scopeId: defaultSiteContext.siteId,
			},
			limit: 100,
		});
		expect(deps.orders.lastAdminOrderListQuery?.adminAccess.scopes).toEqual([
			{ scopeType: "site", scopeId: defaultSiteContext.siteId },
		]);
	});

	it("reads scoped admin order detail with separated statuses", async () => {
		const deps = createOrderDeps();
		deps.orders.adminOrderDetail = {
			orderId: "order-1",
			orderNo: "CB202605160001",
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			guestToken: "guest-1",
			orderStatus: "paid",
			paymentStatus: "paid",
			fulfillmentStatus: "unfulfilled",
			aftersalesStatus: "none",
			currency: "USD",
			subtotalAmount: "100.00",
			discountAmount: "0.00",
			shippingAmount: "0.00",
			taxAmount: "0.00",
			totalAmount: "100.00",
			createdAt: "2026-05-16T00:00:00.000Z",
			updatedAt: "2026-05-16T00:00:00.000Z",
			shippingAddressSnapshot: { countryCode: "US" },
			priceSnapshot: { totalAmount: "100.00" },
			cartOrigin: {
				guestToken: "guest-1",
				idempotencyKey: "checkout-1",
			},
			items: [],
			paymentOrders: [],
			paymentTransactions: [],
			inventoryLocks: [],
			inventoryTransactions: [],
			fulfillmentOrders: [],
			fulfillmentItems: [],
			shipments: [],
			paymentRefunds: [],
			afterSalesRequests: [],
			afterSalesItems: [],
			statusLogs: [
				{
					statusLogId: "log-1",
					siteId: defaultSiteContext.siteId,
					verticalId: defaultSiteContext.verticalId,
					brandId: defaultSiteContext.brandId,
					statusType: "payment",
					fromStatus: "processing",
					toStatus: "paid",
					operatorType: "system",
					metadata: {},
					createdAt: "2026-05-16T00:01:00.000Z",
				},
			],
		};
		const useCase = new GetAdminOrderDetailUseCase({
			transactions: deps.transactions,
			orders: deps.orders,
		});

		const result = await useCase.execute({
			orderId: "order-1",
			adminAccess: {
				source: "database",
				adminUserId: "admin-1",
				scopes: [{ scopeType: "site", scopeId: defaultSiteContext.siteId }],
			},
		});

		expect(result).toMatchObject({
			orderStatus: "paid",
			paymentStatus: "paid",
			fulfillmentStatus: "unfulfilled",
			aftersalesStatus: "none",
		});
		expect(result?.statusLogs[0]?.statusType).toBe("payment");
		expect(deps.orders.lastAdminOrderDetailInput).toMatchObject({
			orderId: "order-1",
		});
	});
});

describe("ApplyPaymentSucceededUseCase", () => {
	it("marks an order paid, deducts locked inventory, and records event processing", async () => {
		const deps = createOrderDeps();
		const eventProcessLog = new MemoryEventProcessLog();
		deps.inventory.locksForOrder = [
			{
				lock: {
					siteId: defaultSiteContext.siteId,
					verticalId: defaultSiteContext.verticalId,
					brandId: defaultSiteContext.brandId,
					orderId: "order-1",
					orderItemId: "item-1",
					skuId: "sku-1",
					warehouseId: "wh-1",
					quantity: 1,
					status: "locked",
					idempotencyKey: "lock-1",
				},
				inventory: {
					...deps.inventory.snapshot,
					availableQty: 9,
					lockedQty: 1,
				},
			},
		];
		const useCase = new ApplyPaymentSucceededUseCase({
			...deps,
			eventProcessLog,
		});

		const result = await useCase.execute({
			eventId: "event-1",
			paymentOrderId: "pay-1",
			orderId: "order-1",
			amount: "100.00",
			currency: "USD",
			providerTransactionId: "pi_1",
		});

		expect(result.status).toBe("processed");
		expect(deps.orders.appliedPayment?.orderStatus).toBe("paid");
		expect(deps.inventory.lockStatusUpdates[0]).toMatchObject({
			lockIdempotencyKey: "lock-1",
			status: "deducted",
		});
		expect(deps.inventory.lockScopes[0]).toMatchObject({
			orderId: "order-1",
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
			allowLegacyNullScope: true,
		});
		expect(deps.inventory.transactions[0]).toMatchObject({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
		});
		expect(eventProcessLog.processed).toBe(true);
		expect(deps.outbox.events.map((event) => event.eventType)).toEqual([
			"OrderPaid",
			"InventoryDeducted",
		]);
		expect(
			deps.outbox.events.every(
				(event) => event.siteId === defaultSiteContext.siteId,
			),
		).toBe(true);
	});

	it("does not deduct inventory when the payment event was already processed", async () => {
		const deps = createOrderDeps();
		const eventProcessLog = new MemoryEventProcessLog();
		eventProcessLog.status = "already_processed";
		const useCase = new ApplyPaymentSucceededUseCase({
			...deps,
			eventProcessLog,
		});

		const result = await useCase.execute({
			eventId: "event-1",
			paymentOrderId: "pay-1",
			orderId: "order-1",
			amount: "100.00",
			currency: "USD",
			providerTransactionId: "pi_1",
		});

		expect(result.status).toBe("already_processed");
		expect(deps.inventory.transactions).toHaveLength(0);
		expect(deps.outbox.events).toHaveLength(0);
	});
});
