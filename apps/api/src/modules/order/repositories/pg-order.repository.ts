import { Injectable } from "@nestjs/common";
import type {
	AftersalesStatus,
	AfterSalesRequestStatus,
	AfterSalesRequestType,
	FulfillmentOrderStatus,
	FulfillmentStatus,
	InventoryLockStatus,
	InventoryTransactionType,
	OrderStatus,
	PaymentOrderStatus,
	PaymentRefundStatus,
	PaymentStatus,
	PaymentTransactionStatus,
	PaymentTransactionType,
	ShipmentStatus,
} from "@cross-border/shared";
import type { AdminScope } from "../../../common/admin/admin-access.js";
import { hasGlobalAdminScope } from "../../../common/admin/admin-access.js";
import type { TransactionContext } from "../../../common/application/application-ports.js";
import {
	defaultSiteContext,
	type SiteDimensions,
} from "../../../common/site/site-context.js";
import { getPgClient } from "../../database/pg/pg-transaction-manager.js";
import type {
	ApplyPaymentSucceededRecord,
	AdminOrderAfterSalesItem,
	AdminOrderAfterSalesRequest,
	AdminOrderDetail,
	AdminOrderFulfillmentItem,
	AdminOrderFulfillmentOrder,
	AdminOrderInventoryLock,
	AdminOrderInventoryTransaction,
	AdminOrderListItem,
	AdminOrderPaymentOrder,
	AdminOrderPaymentRefund,
	AdminOrderPaymentTransaction,
	AdminOrderScopeQuery,
	AdminOrderStatusLog,
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
	StorefrontOrderItem,
	StorefrontOrderListItem,
	StorefrontShipment,
	StorefrontShipmentTrackingEvent,
} from "../order.ports.js";

type OrderSummaryRow = {
	id: string;
	order_no: string;
	idempotency_key: string;
};

type PaymentApplicationSnapshotRow = {
	order_id: string;
	payment_order_id: string;
	site_id: string;
	vertical_id: string;
	brand_id: string;
	order_status: OrderStatus;
	payment_status: PaymentStatus;
	total_amount: string;
	currency: string;
};

type OrderCheckoutResultRow = {
	order_id: string;
	order_no: string;
	user_id: string | null;
	guest_token: string | null;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	order_status: OrderStatus;
	payment_status: PaymentStatus;
	fulfillment_status: FulfillmentStatus;
	aftersales_status: OrderCheckoutResult["aftersalesStatus"];
	currency: string;
	subtotal_amount: string;
	discount_amount: string;
	shipping_amount: string;
	tax_amount: string;
	total_amount: string;
	created_at: Date;
	updated_at: Date;
	paid_at: Date | null;
	payment_order_id: string | null;
	payment_no: string | null;
	payment_order_status: PaymentOrderStatus | null;
	channel_code: string | null;
	payment_amount: string | null;
	payment_currency: string | null;
};

type StorefrontOrderListItemRow = {
	order_id: string;
	order_no: string;
	user_id: string | null;
	guest_token: string | null;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	order_status: OrderStatus;
	payment_status: PaymentStatus;
	fulfillment_status: FulfillmentStatus;
	aftersales_status: StorefrontOrderListItem["aftersalesStatus"];
	currency: string;
	total_amount: string;
	item_count: number;
	first_item_title: string | null;
	first_item_image_url: string | null;
	created_at: Date;
	updated_at: Date;
	paid_at: Date | null;
	payment_order_id: string | null;
	payment_no: string | null;
	payment_order_status: PaymentOrderStatus | null;
	channel_code: string | null;
};

type StorefrontOrderDetailRow = OrderCheckoutResultRow & {
	shipping_address_snapshot: Record<string, unknown> | null;
	price_snapshot: Record<string, unknown> | null;
};

type StorefrontOrderItemRow = {
	order_item_id: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	product_id: string;
	sku_id: string;
	sku_code: string;
	product_title: string;
	sku_title: string | null;
	image_url: string | null;
	unit_price: string;
	quantity: number;
	discount_amount: string;
	total_amount: string;
	snapshot: Record<string, unknown> | null;
};

type StorefrontShipmentRow = {
	shipment_id: string;
	fulfillment_order_id: string;
	fulfillment_no: string;
	fulfillment_status: FulfillmentOrderStatus;
	provider_code: string;
	provider_name: string;
	tracking_no: string;
	status: ShipmentStatus;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	shipped_at: Date | null;
	delivered_at: Date | null;
	tracking_events: StorefrontShipmentTrackingEvent[] | null;
};

type AdminOrderListItemRow = {
	order_id: string;
	order_no: string;
	user_id: string | null;
	guest_token: string | null;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	order_status: OrderStatus;
	payment_status: PaymentStatus;
	fulfillment_status: FulfillmentStatus;
	aftersales_status: AftersalesStatus;
	currency: string;
	total_amount: string;
	item_count: number | string;
	status_log_count: number | string;
	created_at: Date;
	updated_at: Date;
	paid_at: Date | null;
	cancelled_at: Date | null;
	payment_order_id: string | null;
	payment_no: string | null;
	payment_order_status: PaymentOrderStatus | null;
	channel_code: string | null;
};

type AdminOrderDetailRow = OrderCheckoutResultRow & {
	idempotency_key: string;
	shipping_address_snapshot: Record<string, unknown> | null;
	price_snapshot: Record<string, unknown> | null;
};

type AdminOrderPaymentOrderRow = {
	payment_order_id: string;
	payment_no: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	channel_code: string;
	status: PaymentOrderStatus;
	amount: string;
	currency: string;
	provider_payment_id: string | null;
	idempotency_key: string;
	created_at: Date;
	updated_at: Date;
	succeeded_at: Date | null;
	failed_at: Date | null;
};

type AdminOrderPaymentTransactionRow = {
	payment_transaction_id: string;
	payment_order_id: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	channel_code: string;
	provider_transaction_id: string;
	transaction_type: PaymentTransactionType;
	status: PaymentTransactionStatus;
	amount: string;
	currency: string;
	raw_payload: Record<string, unknown> | null;
	created_at: Date;
};

type AdminOrderInventoryLockRow = {
	inventory_lock_id: string;
	order_item_id: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	sku_id: string;
	warehouse_id: string;
	quantity: number;
	status: InventoryLockStatus;
	idempotency_key: string;
	expires_at: Date;
	released_at: Date | null;
	deducted_at: Date | null;
	created_at: Date;
};

type AdminOrderInventoryTransactionRow = {
	inventory_transaction_id: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	sku_id: string;
	warehouse_id: string;
	type: InventoryTransactionType;
	quantity: number;
	before_available: number;
	after_available: number;
	before_locked: number;
	after_locked: number;
	before_physical: number;
	after_physical: number;
	idempotency_key: string;
	created_at: Date;
};

type AdminOrderFulfillmentOrderRow = {
	fulfillment_order_id: string;
	fulfillment_no: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	warehouse_id: string | null;
	status: FulfillmentOrderStatus;
	item_count: number | string;
	created_at: Date;
	updated_at: Date;
};

type AdminOrderFulfillmentItemRow = {
	fulfillment_item_id: string;
	fulfillment_order_id: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	order_item_id: string;
	sku_id: string;
	quantity: number;
	created_at: Date;
};

type AdminOrderPaymentRefundRow = {
	refund_id: string;
	refund_no: string;
	after_sales_request_id: string | null;
	payment_order_id: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	status: PaymentRefundStatus;
	amount: string;
	currency: string;
	provider_refund_id: string | null;
	created_at: Date;
	updated_at: Date;
	succeeded_at: Date | null;
	failed_at: Date | null;
};

type AdminOrderAfterSalesRequestRow = {
	after_sales_request_id: string;
	request_no: string;
	user_id: string | null;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	type: AfterSalesRequestType;
	status: AfterSalesRequestStatus;
	reason: string;
	requested_amount: string | null;
	approved_amount: string | null;
	created_at: Date;
	updated_at: Date;
};

type AdminOrderAfterSalesItemRow = {
	after_sales_item_id: string;
	after_sales_request_id: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	order_item_id: string;
	quantity: number;
	requested_amount: string | null;
	approved_amount: string | null;
	return_quality_status: string | null;
	created_at: Date;
};

type AdminOrderStatusLogRow = {
	status_log_id: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	status_type: "order" | "payment" | "fulfillment" | "aftersales";
	from_status: string | null;
	to_status: string;
	reason: string | null;
	operator_type: "user" | "admin" | "system";
	operator_id: string | null;
	metadata: Record<string, unknown> | null;
	created_at: Date;
};

function appendParam(params: unknown[], value: unknown): string {
	params.push(value);

	return `$${params.length}`;
}

function toIsoString(value: Date): string {
	return value.toISOString();
}

function toNumber(value: number | string): number {
	return typeof value === "number" ? value : Number(value);
}

function siteDimensionFields(row: {
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
}): SiteDimensions {
	return {
		siteId: row.site_id ?? defaultSiteContext.siteId,
		verticalId: row.vertical_id ?? defaultSiteContext.verticalId,
		brandId: row.brand_id ?? defaultSiteContext.brandId,
	};
}

function buildDimensionPredicate(
	scope: AdminScope,
	alias: string,
	params: unknown[],
): string {
	if (scope.scopeType === "global") {
		return "TRUE";
	}

	if (!scope.scopeId) {
		return "FALSE";
	}

	const placeholder = appendParam(params, scope.scopeId);

	if (scope.scopeType === "site") {
		return `(${alias}.site_id = ${placeholder} OR (${placeholder} = '${defaultSiteContext.siteId}' AND ${alias}.site_id IS NULL))`;
	}

	if (scope.scopeType === "vertical") {
		return `(${alias}.vertical_id = ${placeholder} OR (${placeholder} = '${defaultSiteContext.verticalId}' AND ${alias}.vertical_id IS NULL))`;
	}

	return `(${alias}.brand_id = ${placeholder} OR (${placeholder} = '${defaultSiteContext.brandId}' AND ${alias}.brand_id IS NULL))`;
}

function buildAdminAccessPredicate(
	scopes: readonly AdminScope[],
	alias: string,
	params: unknown[],
): string {
	if (hasGlobalAdminScope(scopes)) {
		return "TRUE";
	}

	const clauses = scopes.map((scope) =>
		buildDimensionPredicate(scope, alias, params),
	);

	return clauses.length > 0 ? `(${clauses.join(" OR ")})` : "FALSE";
}

function buildSelectedScopePredicate(
	selectedScope: AdminScope | undefined,
	alias: string,
	params: unknown[],
): string {
	return selectedScope
		? buildDimensionPredicate(selectedScope, alias, params)
		: "TRUE";
}

function mapCheckoutResult(row: OrderCheckoutResultRow): OrderCheckoutResult {
	return {
		orderId: row.order_id,
		orderNo: row.order_no,
		...(row.user_id ? { userId: row.user_id } : {}),
		...(row.guest_token ? { guestToken: row.guest_token } : {}),
		siteId: row.site_id ?? defaultSiteContext.siteId,
		verticalId: row.vertical_id ?? defaultSiteContext.verticalId,
		brandId: row.brand_id ?? defaultSiteContext.brandId,
		orderStatus: row.order_status,
		paymentStatus: row.payment_status,
		fulfillmentStatus: row.fulfillment_status,
		aftersalesStatus: row.aftersales_status,
		currency: row.currency,
		subtotalAmount: row.subtotal_amount,
		discountAmount: row.discount_amount,
		shippingAmount: row.shipping_amount,
		taxAmount: row.tax_amount,
		totalAmount: row.total_amount,
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString(),
		...(row.paid_at ? { paidAt: row.paid_at.toISOString() } : {}),
		...(row.payment_order_id &&
		row.payment_no &&
		row.payment_order_status &&
		row.channel_code &&
		row.payment_amount &&
		row.payment_currency
			? {
					paymentOrder: {
						paymentOrderId: row.payment_order_id,
						paymentNo: row.payment_no,
						status: row.payment_order_status,
						channelCode: row.channel_code,
						amount: row.payment_amount,
						currency: row.payment_currency,
					},
				}
			: {}),
	};
}

function mapOrderListItem(
	row: StorefrontOrderListItemRow,
): StorefrontOrderListItem {
	return {
		orderId: row.order_id,
		orderNo: row.order_no,
		...(row.user_id ? { userId: row.user_id } : {}),
		...(row.guest_token ? { guestToken: row.guest_token } : {}),
		siteId: row.site_id ?? defaultSiteContext.siteId,
		verticalId: row.vertical_id ?? defaultSiteContext.verticalId,
		brandId: row.brand_id ?? defaultSiteContext.brandId,
		orderStatus: row.order_status,
		paymentStatus: row.payment_status,
		fulfillmentStatus: row.fulfillment_status,
		aftersalesStatus: row.aftersales_status,
		currency: row.currency,
		totalAmount: row.total_amount,
		itemCount: row.item_count,
		...(row.first_item_title ? { firstItemTitle: row.first_item_title } : {}),
		...(row.first_item_image_url
			? { firstItemImageUrl: row.first_item_image_url }
			: {}),
		createdAt: row.created_at.toISOString(),
		updatedAt: row.updated_at.toISOString(),
		...(row.paid_at ? { paidAt: row.paid_at.toISOString() } : {}),
		...(row.payment_order_id &&
		row.payment_no &&
		row.payment_order_status &&
		row.channel_code
			? {
					latestPaymentOrder: {
						paymentOrderId: row.payment_order_id,
						paymentNo: row.payment_no,
						status: row.payment_order_status,
						channelCode: row.channel_code,
					},
				}
			: {}),
	};
}

function mapOrderItem(row: StorefrontOrderItemRow): StorefrontOrderItem {
	return {
		orderItemId: row.order_item_id,
		siteId: row.site_id ?? defaultSiteContext.siteId,
		verticalId: row.vertical_id ?? defaultSiteContext.verticalId,
		brandId: row.brand_id ?? defaultSiteContext.brandId,
		productId: row.product_id,
		skuId: row.sku_id,
		skuCode: row.sku_code,
		productTitle: row.product_title,
		...(row.sku_title ? { skuTitle: row.sku_title } : {}),
		...(row.image_url ? { imageUrl: row.image_url } : {}),
		unitPrice: row.unit_price,
		quantity: row.quantity,
		discountAmount: row.discount_amount,
		totalAmount: row.total_amount,
		snapshot: row.snapshot ?? {},
	};
}

function mapShipment(row: StorefrontShipmentRow): StorefrontShipment {
	return {
		shipmentId: row.shipment_id,
		fulfillmentOrderId: row.fulfillment_order_id,
		fulfillmentNo: row.fulfillment_no,
		fulfillmentStatus: row.fulfillment_status,
		providerCode: row.provider_code,
		providerName: row.provider_name,
		trackingNo: row.tracking_no,
		status: row.status,
		siteId: row.site_id ?? defaultSiteContext.siteId,
		verticalId: row.vertical_id ?? defaultSiteContext.verticalId,
		brandId: row.brand_id ?? defaultSiteContext.brandId,
		...(row.shipped_at ? { shippedAt: row.shipped_at.toISOString() } : {}),
		...(row.delivered_at
			? { deliveredAt: row.delivered_at.toISOString() }
			: {}),
		trackingEvents: row.tracking_events ?? [],
	};
}

function mapAdminOrderListItem(row: AdminOrderListItemRow): AdminOrderListItem {
	return {
		orderId: row.order_id,
		orderNo: row.order_no,
		...(row.user_id ? { userId: row.user_id } : {}),
		...(row.guest_token ? { guestToken: row.guest_token } : {}),
		...siteDimensionFields(row),
		orderStatus: row.order_status,
		paymentStatus: row.payment_status,
		fulfillmentStatus: row.fulfillment_status,
		aftersalesStatus: row.aftersales_status,
		currency: row.currency,
		totalAmount: row.total_amount,
		itemCount: toNumber(row.item_count),
		statusLogCount: toNumber(row.status_log_count),
		createdAt: toIsoString(row.created_at),
		updatedAt: toIsoString(row.updated_at),
		...(row.paid_at ? { paidAt: toIsoString(row.paid_at) } : {}),
		...(row.cancelled_at
			? { cancelledAt: toIsoString(row.cancelled_at) }
			: {}),
		...(row.payment_order_id &&
		row.payment_no &&
		row.payment_order_status &&
		row.channel_code
			? {
					latestPaymentOrder: {
						paymentOrderId: row.payment_order_id,
						paymentNo: row.payment_no,
						status: row.payment_order_status,
						channelCode: row.channel_code,
					},
				}
			: {}),
	};
}

function mapAdminPaymentOrder(
	row: AdminOrderPaymentOrderRow,
): AdminOrderPaymentOrder {
	return {
		paymentOrderId: row.payment_order_id,
		paymentNo: row.payment_no,
		...siteDimensionFields(row),
		channelCode: row.channel_code,
		status: row.status,
		amount: row.amount,
		currency: row.currency,
		...(row.provider_payment_id
			? { providerPaymentId: row.provider_payment_id }
			: {}),
		idempotencyKey: row.idempotency_key,
		createdAt: toIsoString(row.created_at),
		updatedAt: toIsoString(row.updated_at),
		...(row.succeeded_at ? { succeededAt: toIsoString(row.succeeded_at) } : {}),
		...(row.failed_at ? { failedAt: toIsoString(row.failed_at) } : {}),
	};
}

function mapAdminPaymentTransaction(
	row: AdminOrderPaymentTransactionRow,
): AdminOrderPaymentTransaction {
	return {
		paymentTransactionId: row.payment_transaction_id,
		paymentOrderId: row.payment_order_id,
		...siteDimensionFields(row),
		channelCode: row.channel_code,
		providerTransactionId: row.provider_transaction_id,
		transactionType: row.transaction_type,
		status: row.status,
		amount: row.amount,
		currency: row.currency,
		rawPayload: row.raw_payload ?? {},
		createdAt: toIsoString(row.created_at),
	};
}

function mapAdminInventoryLock(
	row: AdminOrderInventoryLockRow,
): AdminOrderInventoryLock {
	return {
		inventoryLockId: row.inventory_lock_id,
		orderItemId: row.order_item_id,
		...siteDimensionFields(row),
		skuId: row.sku_id,
		warehouseId: row.warehouse_id,
		quantity: row.quantity,
		status: row.status,
		idempotencyKey: row.idempotency_key,
		expiresAt: toIsoString(row.expires_at),
		...(row.released_at ? { releasedAt: toIsoString(row.released_at) } : {}),
		...(row.deducted_at ? { deductedAt: toIsoString(row.deducted_at) } : {}),
		createdAt: toIsoString(row.created_at),
	};
}

function mapAdminInventoryTransaction(
	row: AdminOrderInventoryTransactionRow,
): AdminOrderInventoryTransaction {
	return {
		inventoryTransactionId: row.inventory_transaction_id,
		...siteDimensionFields(row),
		skuId: row.sku_id,
		warehouseId: row.warehouse_id,
		type: row.type,
		quantity: row.quantity,
		beforeAvailable: row.before_available,
		afterAvailable: row.after_available,
		beforeLocked: row.before_locked,
		afterLocked: row.after_locked,
		beforePhysical: row.before_physical,
		afterPhysical: row.after_physical,
		idempotencyKey: row.idempotency_key,
		createdAt: toIsoString(row.created_at),
	};
}

function mapAdminFulfillmentOrder(
	row: AdminOrderFulfillmentOrderRow,
): AdminOrderFulfillmentOrder {
	return {
		fulfillmentOrderId: row.fulfillment_order_id,
		fulfillmentNo: row.fulfillment_no,
		...siteDimensionFields(row),
		...(row.warehouse_id ? { warehouseId: row.warehouse_id } : {}),
		status: row.status,
		itemCount: toNumber(row.item_count),
		createdAt: toIsoString(row.created_at),
		updatedAt: toIsoString(row.updated_at),
	};
}

function mapAdminFulfillmentItem(
	row: AdminOrderFulfillmentItemRow,
): AdminOrderFulfillmentItem {
	return {
		fulfillmentItemId: row.fulfillment_item_id,
		fulfillmentOrderId: row.fulfillment_order_id,
		...siteDimensionFields(row),
		orderItemId: row.order_item_id,
		skuId: row.sku_id,
		quantity: row.quantity,
		createdAt: toIsoString(row.created_at),
	};
}

function mapAdminPaymentRefund(
	row: AdminOrderPaymentRefundRow,
): AdminOrderPaymentRefund {
	return {
		refundId: row.refund_id,
		refundNo: row.refund_no,
		...(row.after_sales_request_id
			? { afterSalesRequestId: row.after_sales_request_id }
			: {}),
		paymentOrderId: row.payment_order_id,
		...siteDimensionFields(row),
		status: row.status,
		amount: row.amount,
		currency: row.currency,
		...(row.provider_refund_id
			? { providerRefundId: row.provider_refund_id }
			: {}),
		createdAt: toIsoString(row.created_at),
		updatedAt: toIsoString(row.updated_at),
		...(row.succeeded_at ? { succeededAt: toIsoString(row.succeeded_at) } : {}),
		...(row.failed_at ? { failedAt: toIsoString(row.failed_at) } : {}),
	};
}

function mapAdminAfterSalesRequest(
	row: AdminOrderAfterSalesRequestRow,
): AdminOrderAfterSalesRequest {
	return {
		afterSalesRequestId: row.after_sales_request_id,
		requestNo: row.request_no,
		...(row.user_id ? { userId: row.user_id } : {}),
		...siteDimensionFields(row),
		type: row.type,
		status: row.status,
		reason: row.reason,
		...(row.requested_amount ? { requestedAmount: row.requested_amount } : {}),
		...(row.approved_amount ? { approvedAmount: row.approved_amount } : {}),
		createdAt: toIsoString(row.created_at),
		updatedAt: toIsoString(row.updated_at),
	};
}

function mapAdminAfterSalesItem(
	row: AdminOrderAfterSalesItemRow,
): AdminOrderAfterSalesItem {
	return {
		afterSalesItemId: row.after_sales_item_id,
		afterSalesRequestId: row.after_sales_request_id,
		...siteDimensionFields(row),
		orderItemId: row.order_item_id,
		quantity: row.quantity,
		...(row.requested_amount ? { requestedAmount: row.requested_amount } : {}),
		...(row.approved_amount ? { approvedAmount: row.approved_amount } : {}),
		...(row.return_quality_status
			? { returnQualityStatus: row.return_quality_status }
			: {}),
		createdAt: toIsoString(row.created_at),
	};
}

function mapAdminStatusLog(row: AdminOrderStatusLogRow): AdminOrderStatusLog {
	return {
		statusLogId: row.status_log_id,
		...siteDimensionFields(row),
		statusType: row.status_type,
		...(row.from_status ? { fromStatus: row.from_status } : {}),
		toStatus: row.to_status,
		...(row.reason ? { reason: row.reason } : {}),
		operatorType: row.operator_type,
		...(row.operator_id ? { operatorId: row.operator_id } : {}),
		metadata: row.metadata ?? {},
		createdAt: toIsoString(row.created_at),
	};
}

@Injectable()
export class PgOrderRepository implements OrderWriteRepositoryPort {
	async findByIdempotencyKey(
		scope: BuyerIdempotencyScope,
		transaction: TransactionContext,
	): Promise<OrderSummary | null> {
		const client = getPgClient(transaction);
		const result = scope.userId
			? await client.query<OrderSummaryRow>(
					`
            SELECT id, order_no, idempotency_key
            FROM orders
            WHERE user_id = $1
              AND idempotency_key = $2
              AND (
                site_id = $3
                OR ($4::boolean AND site_id IS NULL)
              )
            LIMIT 1
          `,
					[
						scope.userId,
						scope.idempotencyKey,
						scope.siteId,
						scope.allowLegacyNullScope ?? false,
					],
				)
			: await client.query<OrderSummaryRow>(
					`
            SELECT id, order_no, idempotency_key
            FROM orders
            WHERE guest_token = $1
              AND idempotency_key = $2
              AND (
                site_id = $3
                OR ($4::boolean AND site_id IS NULL)
              )
            LIMIT 1
          `,
					[
						scope.guestToken,
						scope.idempotencyKey,
						scope.siteId,
						scope.allowLegacyNullScope ?? false,
					],
				);
		const row = result.rows[0];

		if (!row) {
			return null;
		}

		return {
			orderId: row.id,
			orderNo: row.order_no,
			idempotencyKey: row.idempotency_key,
		};
	}

	async createOrder(
		record: CreateOrderRecord,
		transaction: TransactionContext,
	): Promise<OrderSummary> {
		const result = await getPgClient(transaction).query<OrderSummaryRow>(
			`
        INSERT INTO orders (
          id,
          order_no,
          site_id,
          vertical_id,
          brand_id,
          user_id,
          guest_token,
          order_status,
          payment_status,
          fulfillment_status,
          currency,
          subtotal_amount,
          discount_amount,
          shipping_amount,
          tax_amount,
          total_amount,
          shipping_address_snapshot,
          price_snapshot,
          idempotency_key
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16,
          $17::jsonb, $18::jsonb, $19
        )
        RETURNING id, order_no, idempotency_key
      `,
			[
				record.orderId,
				record.orderNo,
				record.siteId,
				record.verticalId,
				record.brandId,
				record.userId ?? null,
				record.guestToken ?? null,
				record.orderStatus,
				record.paymentStatus,
				record.fulfillmentStatus,
				record.currency,
				record.subtotalAmount,
				record.discountAmount,
				record.shippingAmount,
				record.taxAmount,
				record.totalAmount,
				JSON.stringify(record.shippingAddressSnapshot ?? {}),
				JSON.stringify(
					record.priceSnapshot ?? {
						subtotalAmount: record.subtotalAmount,
						discountAmount: record.discountAmount,
						shippingAmount: record.shippingAmount,
						taxAmount: record.taxAmount,
						totalAmount: record.totalAmount,
						currency: record.currency,
					},
				),
				record.idempotencyKey,
			],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error("Failed to create order.");
		}

		return {
			orderId: row.id,
			orderNo: row.order_no,
			idempotencyKey: row.idempotency_key,
		};
	}

	async createOrderItems(
		records: CreateOrderItemRecord[],
		transaction: TransactionContext,
	): Promise<void> {
		const client = getPgClient(transaction);

		for (const item of records) {
			await client.query(
				`
          INSERT INTO order_items (
            id,
            order_id,
            site_id,
            vertical_id,
            brand_id,
            product_id,
            sku_id,
            sku_code,
            product_title,
            sku_title,
            image_url,
            unit_price,
            quantity,
            discount_amount,
            total_amount,
            snapshot
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15, $16::jsonb
          )
        `,
				[
					item.orderItemId,
					item.orderId,
					item.siteId,
					item.verticalId,
					item.brandId,
					item.productId,
					item.skuId,
					item.skuCode,
					item.productTitle,
					item.skuTitle ?? null,
					item.imageUrl ?? null,
					item.unitPrice,
					item.quantity,
					item.discountAmount,
					item.totalAmount,
					JSON.stringify(item.snapshot),
				],
			);
		}
	}

	async appendStatusLogs(
		orderId: string,
		records: OrderStatusLogRecord[],
		dimensions: SiteDimensions,
		transaction: TransactionContext,
	): Promise<void> {
		const client = getPgClient(transaction);

		for (const record of records) {
			await client.query(
				`
          INSERT INTO order_status_logs (
            order_id,
            site_id,
            vertical_id,
            brand_id,
            status_type,
            from_status,
            to_status,
            reason,
            operator_type,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '{}'::jsonb)
        `,
				[
					orderId,
					dimensions.siteId,
					dimensions.verticalId,
					dimensions.brandId,
					record.statusType,
					record.fromStatus,
					record.toStatus,
					record.reason,
					record.operatorType,
				],
			);
		}
	}

	async getPaymentApplicationSnapshot(
		orderId: string,
		transaction: TransactionContext,
	): Promise<OrderPaymentApplicationSnapshot> {
		const result = await getPgClient(
			transaction,
		).query<PaymentApplicationSnapshotRow>(
			`
        SELECT
          orders.id AS order_id,
          payment_orders.id AS payment_order_id,
          COALESCE(orders.site_id, $2) AS site_id,
          COALESCE(orders.vertical_id, $3) AS vertical_id,
          COALESCE(orders.brand_id, $4) AS brand_id,
          orders.order_status,
          orders.payment_status,
          orders.total_amount::text,
          orders.currency
        FROM orders
        JOIN payment_orders ON payment_orders.order_id = orders.id
        WHERE orders.id = $1
        ORDER BY payment_orders.created_at DESC
        LIMIT 1
        FOR UPDATE OF orders
      `,
			[
				orderId,
				defaultSiteContext.siteId,
				defaultSiteContext.verticalId,
				defaultSiteContext.brandId,
			],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error(`Order payment snapshot not found: ${orderId}`);
		}

		return {
			orderId: row.order_id,
			paymentOrderId: row.payment_order_id,
			siteId: row.site_id,
			verticalId: row.vertical_id,
			brandId: row.brand_id,
			orderStatus: row.order_status,
			paymentStatus: row.payment_status,
			totalAmount: row.total_amount,
			currency: row.currency,
		};
	}

	async getCheckoutResult(
		scope: OrderCheckoutResultBuyerScope,
		transaction: TransactionContext,
	): Promise<OrderCheckoutResult | null> {
		const result = scope.userId
			? await getPgClient(transaction).query<OrderCheckoutResultRow>(
					`
            SELECT
              orders.id AS order_id,
              orders.order_no,
              orders.user_id,
              orders.guest_token,
              orders.site_id,
              orders.vertical_id,
              orders.brand_id,
              orders.order_status,
              orders.payment_status,
              orders.fulfillment_status,
              orders.aftersales_status,
              orders.currency,
              orders.subtotal_amount::text,
              orders.discount_amount::text,
              orders.shipping_amount::text,
              orders.tax_amount::text,
              orders.total_amount::text,
              orders.created_at,
              orders.updated_at,
              orders.paid_at,
              payment_orders.id AS payment_order_id,
              payment_orders.payment_no,
              payment_orders.status AS payment_order_status,
              payment_orders.channel_code,
              payment_orders.amount::text AS payment_amount,
              payment_orders.currency AS payment_currency
            FROM orders
            LEFT JOIN LATERAL (
              SELECT id, payment_no, status, channel_code, amount, currency
              FROM payment_orders
              WHERE payment_orders.order_id = orders.id
              ORDER BY payment_orders.created_at DESC
              LIMIT 1
            ) payment_orders ON TRUE
            WHERE orders.id = $1
              AND orders.user_id = $2
              AND (
                orders.site_id = $3
                OR ($6::boolean AND orders.site_id IS NULL)
              )
              AND (
                orders.vertical_id = $4
                OR ($6::boolean AND orders.vertical_id IS NULL)
              )
              AND (
                orders.brand_id = $5
                OR ($6::boolean AND orders.brand_id IS NULL)
              )
            LIMIT 1
          `,
					[
						scope.orderId,
						scope.userId,
						scope.siteId,
						scope.verticalId,
						scope.brandId,
						scope.allowLegacyNullScope ?? false,
					],
				)
			: await getPgClient(transaction).query<OrderCheckoutResultRow>(
					`
            SELECT
              orders.id AS order_id,
              orders.order_no,
              orders.user_id,
              orders.guest_token,
              orders.site_id,
              orders.vertical_id,
              orders.brand_id,
              orders.order_status,
              orders.payment_status,
              orders.fulfillment_status,
              orders.aftersales_status,
              orders.currency,
              orders.subtotal_amount::text,
              orders.discount_amount::text,
              orders.shipping_amount::text,
              orders.tax_amount::text,
              orders.total_amount::text,
              orders.created_at,
              orders.updated_at,
              orders.paid_at,
              payment_orders.id AS payment_order_id,
              payment_orders.payment_no,
              payment_orders.status AS payment_order_status,
              payment_orders.channel_code,
              payment_orders.amount::text AS payment_amount,
              payment_orders.currency AS payment_currency
            FROM orders
            LEFT JOIN LATERAL (
              SELECT id, payment_no, status, channel_code, amount, currency
              FROM payment_orders
              WHERE payment_orders.order_id = orders.id
              ORDER BY payment_orders.created_at DESC
              LIMIT 1
            ) payment_orders ON TRUE
            WHERE orders.id = $1
              AND orders.guest_token = $2
              AND (
                orders.site_id = $3
                OR ($6::boolean AND orders.site_id IS NULL)
              )
              AND (
                orders.vertical_id = $4
                OR ($6::boolean AND orders.vertical_id IS NULL)
              )
              AND (
                orders.brand_id = $5
                OR ($6::boolean AND orders.brand_id IS NULL)
              )
            LIMIT 1
          `,
					[
						scope.orderId,
						scope.guestToken,
						scope.siteId,
						scope.verticalId,
						scope.brandId,
						scope.allowLegacyNullScope ?? false,
					],
				);
		const row = result.rows[0];

		return row ? mapCheckoutResult(row) : null;
	}

	async listStorefrontOrders(
		scope: OrderLookupBuyerScope & { limit: number },
		transaction: TransactionContext,
	): Promise<StorefrontOrderListItem[]> {
		const client = getPgClient(transaction);
		const result = scope.userId
			? await client.query<StorefrontOrderListItemRow>(
					`
            SELECT
              orders.id AS order_id,
              orders.order_no,
              orders.user_id,
              orders.guest_token,
              orders.site_id,
              orders.vertical_id,
              orders.brand_id,
              orders.order_status,
              orders.payment_status,
              orders.fulfillment_status,
              orders.aftersales_status,
              orders.currency,
              orders.total_amount::text,
              COALESCE(item_counts.item_count, 0)::int AS item_count,
              first_item.product_title AS first_item_title,
              first_item.image_url AS first_item_image_url,
              orders.created_at,
              orders.updated_at,
              orders.paid_at,
              payment_orders.id AS payment_order_id,
              payment_orders.payment_no,
              payment_orders.status AS payment_order_status,
              payment_orders.channel_code
            FROM orders
            LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS item_count
              FROM order_items
              WHERE order_items.order_id = orders.id
            ) item_counts ON TRUE
            LEFT JOIN LATERAL (
              SELECT product_title, image_url
              FROM order_items
              WHERE order_items.order_id = orders.id
              ORDER BY order_items.created_at ASC, order_items.id ASC
              LIMIT 1
            ) first_item ON TRUE
            LEFT JOIN LATERAL (
              SELECT id, payment_no, status, channel_code
              FROM payment_orders
              WHERE payment_orders.order_id = orders.id
              ORDER BY payment_orders.created_at DESC
              LIMIT 1
            ) payment_orders ON TRUE
            WHERE orders.user_id = $1
              AND (
                orders.site_id = $2
                OR ($5::boolean AND orders.site_id IS NULL)
              )
              AND (
                orders.vertical_id = $3
                OR ($5::boolean AND orders.vertical_id IS NULL)
              )
              AND (
                orders.brand_id = $4
                OR ($5::boolean AND orders.brand_id IS NULL)
              )
            ORDER BY orders.created_at DESC, orders.id DESC
            LIMIT $6
          `,
					[
						scope.userId,
						scope.siteId,
						scope.verticalId,
						scope.brandId,
						scope.allowLegacyNullScope ?? false,
						scope.limit,
					],
				)
			: await client.query<StorefrontOrderListItemRow>(
					`
            SELECT
              orders.id AS order_id,
              orders.order_no,
              orders.user_id,
              orders.guest_token,
              orders.site_id,
              orders.vertical_id,
              orders.brand_id,
              orders.order_status,
              orders.payment_status,
              orders.fulfillment_status,
              orders.aftersales_status,
              orders.currency,
              orders.total_amount::text,
              COALESCE(item_counts.item_count, 0)::int AS item_count,
              first_item.product_title AS first_item_title,
              first_item.image_url AS first_item_image_url,
              orders.created_at,
              orders.updated_at,
              orders.paid_at,
              payment_orders.id AS payment_order_id,
              payment_orders.payment_no,
              payment_orders.status AS payment_order_status,
              payment_orders.channel_code
            FROM orders
            LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS item_count
              FROM order_items
              WHERE order_items.order_id = orders.id
            ) item_counts ON TRUE
            LEFT JOIN LATERAL (
              SELECT product_title, image_url
              FROM order_items
              WHERE order_items.order_id = orders.id
              ORDER BY order_items.created_at ASC, order_items.id ASC
              LIMIT 1
            ) first_item ON TRUE
            LEFT JOIN LATERAL (
              SELECT id, payment_no, status, channel_code
              FROM payment_orders
              WHERE payment_orders.order_id = orders.id
              ORDER BY payment_orders.created_at DESC
              LIMIT 1
            ) payment_orders ON TRUE
            WHERE orders.guest_token = $1
              AND (
                orders.site_id = $2
                OR ($5::boolean AND orders.site_id IS NULL)
              )
              AND (
                orders.vertical_id = $3
                OR ($5::boolean AND orders.vertical_id IS NULL)
              )
              AND (
                orders.brand_id = $4
                OR ($5::boolean AND orders.brand_id IS NULL)
              )
            ORDER BY orders.created_at DESC, orders.id DESC
            LIMIT $6
          `,
					[
						scope.guestToken,
						scope.siteId,
						scope.verticalId,
						scope.brandId,
						scope.allowLegacyNullScope ?? false,
						scope.limit,
					],
				);

		return result.rows.map(mapOrderListItem);
	}

	async getStorefrontOrderDetail(
		scope: OrderLookupBuyerScope & { orderId: string },
		transaction: TransactionContext,
	): Promise<StorefrontOrderDetail | null> {
		const client = getPgClient(transaction);
		const orderResult = scope.userId
			? await client.query<StorefrontOrderDetailRow>(
					`
            SELECT
              orders.id AS order_id,
              orders.order_no,
              orders.user_id,
              orders.guest_token,
              orders.site_id,
              orders.vertical_id,
              orders.brand_id,
              orders.order_status,
              orders.payment_status,
              orders.fulfillment_status,
              orders.aftersales_status,
              orders.currency,
              orders.subtotal_amount::text,
              orders.discount_amount::text,
              orders.shipping_amount::text,
              orders.tax_amount::text,
              orders.total_amount::text,
              orders.shipping_address_snapshot,
              orders.price_snapshot,
              orders.created_at,
              orders.updated_at,
              orders.paid_at,
              payment_orders.id AS payment_order_id,
              payment_orders.payment_no,
              payment_orders.status AS payment_order_status,
              payment_orders.channel_code,
              payment_orders.amount::text AS payment_amount,
              payment_orders.currency AS payment_currency
            FROM orders
            LEFT JOIN LATERAL (
              SELECT id, payment_no, status, channel_code, amount, currency
              FROM payment_orders
              WHERE payment_orders.order_id = orders.id
              ORDER BY payment_orders.created_at DESC
              LIMIT 1
            ) payment_orders ON TRUE
            WHERE orders.id = $1
              AND orders.user_id = $2
              AND (
                orders.site_id = $3
                OR ($6::boolean AND orders.site_id IS NULL)
              )
              AND (
                orders.vertical_id = $4
                OR ($6::boolean AND orders.vertical_id IS NULL)
              )
              AND (
                orders.brand_id = $5
                OR ($6::boolean AND orders.brand_id IS NULL)
              )
            LIMIT 1
          `,
					[
						scope.orderId,
						scope.userId,
						scope.siteId,
						scope.verticalId,
						scope.brandId,
						scope.allowLegacyNullScope ?? false,
					],
				)
			: await client.query<StorefrontOrderDetailRow>(
					`
            SELECT
              orders.id AS order_id,
              orders.order_no,
              orders.user_id,
              orders.guest_token,
              orders.site_id,
              orders.vertical_id,
              orders.brand_id,
              orders.order_status,
              orders.payment_status,
              orders.fulfillment_status,
              orders.aftersales_status,
              orders.currency,
              orders.subtotal_amount::text,
              orders.discount_amount::text,
              orders.shipping_amount::text,
              orders.tax_amount::text,
              orders.total_amount::text,
              orders.shipping_address_snapshot,
              orders.price_snapshot,
              orders.created_at,
              orders.updated_at,
              orders.paid_at,
              payment_orders.id AS payment_order_id,
              payment_orders.payment_no,
              payment_orders.status AS payment_order_status,
              payment_orders.channel_code,
              payment_orders.amount::text AS payment_amount,
              payment_orders.currency AS payment_currency
            FROM orders
            LEFT JOIN LATERAL (
              SELECT id, payment_no, status, channel_code, amount, currency
              FROM payment_orders
              WHERE payment_orders.order_id = orders.id
              ORDER BY payment_orders.created_at DESC
              LIMIT 1
            ) payment_orders ON TRUE
            WHERE orders.id = $1
              AND orders.guest_token = $2
              AND (
                orders.site_id = $3
                OR ($6::boolean AND orders.site_id IS NULL)
              )
              AND (
                orders.vertical_id = $4
                OR ($6::boolean AND orders.vertical_id IS NULL)
              )
              AND (
                orders.brand_id = $5
                OR ($6::boolean AND orders.brand_id IS NULL)
              )
            LIMIT 1
          `,
					[
						scope.orderId,
						scope.guestToken,
						scope.siteId,
						scope.verticalId,
						scope.brandId,
						scope.allowLegacyNullScope ?? false,
					],
				);
		const orderRow = orderResult.rows[0];

		if (!orderRow) {
			return null;
		}

		const itemResult = await client.query<StorefrontOrderItemRow>(
			`
        SELECT
          id AS order_item_id,
          site_id,
          vertical_id,
          brand_id,
          product_id,
          sku_id,
          sku_code,
          product_title,
          sku_title,
          image_url,
          unit_price::text,
          quantity,
          discount_amount::text,
          total_amount::text,
          snapshot
        FROM order_items
        WHERE order_id = $1
          AND (
            site_id = $2
            OR ($5::boolean AND site_id IS NULL)
          )
          AND (
            vertical_id = $3
            OR ($5::boolean AND vertical_id IS NULL)
          )
          AND (
            brand_id = $4
            OR ($5::boolean AND brand_id IS NULL)
          )
        ORDER BY created_at ASC, id ASC
      `,
			[
				scope.orderId,
				scope.siteId,
				scope.verticalId,
				scope.brandId,
				scope.allowLegacyNullScope ?? false,
			],
		);
		const shipmentResult = await client.query<StorefrontShipmentRow>(
			`
        SELECT
          shipments.id AS shipment_id,
          shipments.fulfillment_order_id,
          fulfillment_orders.fulfillment_no,
          fulfillment_orders.status AS fulfillment_status,
          logistics_providers.code AS provider_code,
          logistics_providers.name AS provider_name,
          shipments.tracking_no,
          shipments.status,
          shipments.site_id,
          shipments.vertical_id,
          shipments.brand_id,
          shipments.shipped_at,
          shipments.delivered_at,
          COALESCE(
            (
              SELECT jsonb_agg(
                jsonb_build_object(
                  'trackingStatus', shipment_tracking_events.tracking_status,
                  'description', shipment_tracking_events.description,
                  'location', shipment_tracking_events.location,
                  'occurredAt', shipment_tracking_events.occurred_at
                )
                ORDER BY shipment_tracking_events.occurred_at DESC
              )
              FROM shipment_tracking_events
              WHERE shipment_tracking_events.shipment_id = shipments.id
            ),
            '[]'::jsonb
          ) AS tracking_events
        FROM fulfillment_orders
        JOIN shipments ON shipments.fulfillment_order_id = fulfillment_orders.id
        JOIN logistics_providers ON logistics_providers.id = shipments.provider_id
        WHERE fulfillment_orders.order_id = $1
          AND (
            fulfillment_orders.site_id = $2
            OR ($5::boolean AND fulfillment_orders.site_id IS NULL)
          )
          AND (
            fulfillment_orders.vertical_id = $3
            OR ($5::boolean AND fulfillment_orders.vertical_id IS NULL)
          )
          AND (
            fulfillment_orders.brand_id = $4
            OR ($5::boolean AND fulfillment_orders.brand_id IS NULL)
          )
        ORDER BY shipments.created_at DESC, shipments.id DESC
      `,
			[
				scope.orderId,
				scope.siteId,
				scope.verticalId,
				scope.brandId,
				scope.allowLegacyNullScope ?? false,
			],
		);

		return {
			...mapCheckoutResult(orderRow),
			shippingAddressSnapshot: orderRow.shipping_address_snapshot ?? {},
			priceSnapshot: orderRow.price_snapshot ?? {},
			items: itemResult.rows.map(mapOrderItem),
			shipments: shipmentResult.rows.map(mapShipment),
		};
	}

	async listAdminOrders(
		query: AdminOrderScopeQuery,
		transaction: TransactionContext,
	): Promise<AdminOrderListItem[]> {
		const params: unknown[] = [];
		const adminScope = buildAdminAccessPredicate(
			query.adminAccess.scopes,
			"orders",
			params,
		);
		const selectedScope = buildSelectedScopePredicate(
			query.selectedScope,
			"orders",
			params,
		);
		const limitPlaceholder = appendParam(params, query.limit);
		const result = await getPgClient(transaction).query<AdminOrderListItemRow>(
			`
        SELECT
          orders.id AS order_id,
          orders.order_no,
          orders.user_id,
          orders.guest_token,
          orders.site_id,
          orders.vertical_id,
          orders.brand_id,
          orders.order_status,
          orders.payment_status,
          orders.fulfillment_status,
          orders.aftersales_status,
          orders.currency,
          orders.total_amount::text,
          COALESCE(item_counts.item_count, 0)::int AS item_count,
          COALESCE(status_log_counts.status_log_count, 0)::int AS status_log_count,
          orders.created_at,
          orders.updated_at,
          orders.paid_at,
          orders.cancelled_at,
          latest_payment.id AS payment_order_id,
          latest_payment.payment_no,
          latest_payment.status AS payment_order_status,
          latest_payment.channel_code
        FROM orders
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS item_count
          FROM order_items
          WHERE order_items.order_id = orders.id
        ) item_counts ON TRUE
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS status_log_count
          FROM order_status_logs
          WHERE order_status_logs.order_id = orders.id
        ) status_log_counts ON TRUE
        LEFT JOIN LATERAL (
          SELECT id, payment_no, status, channel_code
          FROM payment_orders
          WHERE payment_orders.order_id = orders.id
          ORDER BY payment_orders.created_at DESC, payment_orders.id DESC
          LIMIT 1
        ) latest_payment ON TRUE
        WHERE ${adminScope}
          AND ${selectedScope}
        ORDER BY orders.created_at DESC, orders.id DESC
        LIMIT ${limitPlaceholder}
      `,
			params,
		);

		return result.rows.map(mapAdminOrderListItem);
	}

	async getAdminOrderDetail(
		input: {
			orderId: string;
			adminAccess: AdminOrderScopeQuery["adminAccess"];
		},
		transaction: TransactionContext,
	): Promise<AdminOrderDetail | null> {
		const client = getPgClient(transaction);
		const params: unknown[] = [input.orderId];
		const adminScope = buildAdminAccessPredicate(
			input.adminAccess.scopes,
			"orders",
			params,
		);
		const orderResult = await client.query<AdminOrderDetailRow>(
			`
        SELECT
          orders.id AS order_id,
          orders.order_no,
          orders.user_id,
          orders.guest_token,
          orders.site_id,
          orders.vertical_id,
          orders.brand_id,
          orders.order_status,
          orders.payment_status,
          orders.fulfillment_status,
          orders.aftersales_status,
          orders.currency,
          orders.subtotal_amount::text,
          orders.discount_amount::text,
          orders.shipping_amount::text,
          orders.tax_amount::text,
          orders.total_amount::text,
          orders.shipping_address_snapshot,
          orders.price_snapshot,
          orders.idempotency_key,
          orders.created_at,
          orders.updated_at,
          orders.paid_at,
          payment_orders.id AS payment_order_id,
          payment_orders.payment_no,
          payment_orders.status AS payment_order_status,
          payment_orders.channel_code,
          payment_orders.amount::text AS payment_amount,
          payment_orders.currency AS payment_currency
        FROM orders
        LEFT JOIN LATERAL (
          SELECT id, payment_no, status, channel_code, amount, currency
          FROM payment_orders
          WHERE payment_orders.order_id = orders.id
          ORDER BY payment_orders.created_at DESC, payment_orders.id DESC
          LIMIT 1
        ) payment_orders ON TRUE
        WHERE orders.id = $1
          AND ${adminScope}
        LIMIT 1
      `,
			params,
		);
		const orderRow = orderResult.rows[0];

		if (!orderRow) {
			return null;
		}

		const [
			itemResult,
			paymentOrderResult,
			paymentTransactionResult,
			inventoryLockResult,
			inventoryTransactionResult,
			fulfillmentOrderResult,
			fulfillmentItemResult,
			shipmentResult,
			paymentRefundResult,
			afterSalesRequestResult,
			afterSalesItemResult,
			statusLogResult,
		] = await Promise.all([
			client.query<StorefrontOrderItemRow>(
				`
          SELECT
            id AS order_item_id,
            site_id,
            vertical_id,
            brand_id,
            product_id,
            sku_id,
            sku_code,
            product_title,
            sku_title,
            image_url,
            unit_price::text,
            quantity,
            discount_amount::text,
            total_amount::text,
            snapshot
          FROM order_items
          WHERE order_id = $1
          ORDER BY created_at ASC, id ASC
        `,
				[input.orderId],
			),
			client.query<AdminOrderPaymentOrderRow>(
				`
          SELECT
            id AS payment_order_id,
            payment_no,
            site_id,
            vertical_id,
            brand_id,
            channel_code,
            status,
            amount::text,
            currency,
            provider_payment_id,
            idempotency_key,
            created_at,
            updated_at,
            succeeded_at,
            failed_at
          FROM payment_orders
          WHERE order_id = $1
          ORDER BY created_at DESC, id DESC
        `,
				[input.orderId],
			),
			client.query<AdminOrderPaymentTransactionRow>(
				`
          SELECT
            payment_transactions.id AS payment_transaction_id,
            payment_transactions.payment_order_id,
            payment_transactions.site_id,
            payment_transactions.vertical_id,
            payment_transactions.brand_id,
            payment_transactions.channel_code,
            payment_transactions.provider_transaction_id,
            payment_transactions.transaction_type,
            payment_transactions.status,
            payment_transactions.amount::text,
            payment_transactions.currency,
            payment_transactions.raw_payload,
            payment_transactions.created_at
          FROM payment_transactions
          JOIN payment_orders
            ON payment_orders.id = payment_transactions.payment_order_id
          WHERE payment_orders.order_id = $1
          ORDER BY payment_transactions.created_at DESC, payment_transactions.id DESC
        `,
				[input.orderId],
			),
			client.query<AdminOrderInventoryLockRow>(
				`
          SELECT
            id AS inventory_lock_id,
            order_item_id,
            site_id,
            vertical_id,
            brand_id,
            sku_id,
            warehouse_id,
            quantity,
            status,
            idempotency_key,
            expires_at,
            released_at,
            deducted_at,
            created_at
          FROM inventory_locks
          WHERE order_id = $1
          ORDER BY created_at DESC, id DESC
        `,
				[input.orderId],
			),
			client.query<AdminOrderInventoryTransactionRow>(
				`
          SELECT
            id AS inventory_transaction_id,
            site_id,
            vertical_id,
            brand_id,
            sku_id,
            warehouse_id,
            type,
            quantity,
            before_available,
            after_available,
            before_locked,
            after_locked,
            before_physical,
            after_physical,
            idempotency_key,
            created_at
          FROM inventory_transactions
          WHERE order_id = $1
          ORDER BY created_at DESC, id DESC
        `,
				[input.orderId],
			),
			client.query<AdminOrderFulfillmentOrderRow>(
				`
          SELECT
            fulfillment_orders.id AS fulfillment_order_id,
            fulfillment_orders.fulfillment_no,
            fulfillment_orders.site_id,
            fulfillment_orders.vertical_id,
            fulfillment_orders.brand_id,
            fulfillment_orders.warehouse_id,
            fulfillment_orders.status,
            COUNT(fulfillment_items.id)::int AS item_count,
            fulfillment_orders.created_at,
            fulfillment_orders.updated_at
          FROM fulfillment_orders
          LEFT JOIN fulfillment_items
            ON fulfillment_items.fulfillment_order_id = fulfillment_orders.id
          WHERE fulfillment_orders.order_id = $1
          GROUP BY fulfillment_orders.id
          ORDER BY fulfillment_orders.created_at DESC, fulfillment_orders.id DESC
        `,
				[input.orderId],
			),
			client.query<AdminOrderFulfillmentItemRow>(
				`
          SELECT
            fulfillment_items.id AS fulfillment_item_id,
            fulfillment_items.fulfillment_order_id,
            fulfillment_items.site_id,
            fulfillment_items.vertical_id,
            fulfillment_items.brand_id,
            fulfillment_items.order_item_id,
            fulfillment_items.sku_id,
            fulfillment_items.quantity,
            fulfillment_items.created_at
          FROM fulfillment_items
          JOIN fulfillment_orders
            ON fulfillment_orders.id = fulfillment_items.fulfillment_order_id
          WHERE fulfillment_orders.order_id = $1
          ORDER BY fulfillment_items.created_at DESC, fulfillment_items.id DESC
        `,
				[input.orderId],
			),
			client.query<StorefrontShipmentRow>(
				`
          SELECT
            shipments.id AS shipment_id,
            shipments.fulfillment_order_id,
            fulfillment_orders.fulfillment_no,
            fulfillment_orders.status AS fulfillment_status,
            logistics_providers.code AS provider_code,
            logistics_providers.name AS provider_name,
            shipments.tracking_no,
            shipments.status,
            shipments.site_id,
            shipments.vertical_id,
            shipments.brand_id,
            shipments.shipped_at,
            shipments.delivered_at,
            COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'trackingStatus', shipment_tracking_events.tracking_status,
                    'description', shipment_tracking_events.description,
                    'location', shipment_tracking_events.location,
                    'occurredAt', shipment_tracking_events.occurred_at
                  )
                  ORDER BY shipment_tracking_events.occurred_at DESC
                )
                FROM shipment_tracking_events
                WHERE shipment_tracking_events.shipment_id = shipments.id
              ),
              '[]'::jsonb
            ) AS tracking_events
          FROM fulfillment_orders
          JOIN shipments ON shipments.fulfillment_order_id = fulfillment_orders.id
          JOIN logistics_providers ON logistics_providers.id = shipments.provider_id
          WHERE fulfillment_orders.order_id = $1
          ORDER BY shipments.created_at DESC, shipments.id DESC
        `,
				[input.orderId],
			),
			client.query<AdminOrderPaymentRefundRow>(
				`
          SELECT
            id AS refund_id,
            refund_no,
            after_sales_request_id,
            payment_order_id,
            site_id,
            vertical_id,
            brand_id,
            status,
            amount::text,
            currency,
            provider_refund_id,
            created_at,
            updated_at,
            succeeded_at,
            failed_at
          FROM payment_refunds
          WHERE order_id = $1
          ORDER BY created_at DESC, id DESC
        `,
				[input.orderId],
			),
			client.query<AdminOrderAfterSalesRequestRow>(
				`
          SELECT
            id AS after_sales_request_id,
            request_no,
            user_id,
            site_id,
            vertical_id,
            brand_id,
            type,
            status,
            reason,
            requested_amount::text,
            approved_amount::text,
            created_at,
            updated_at
          FROM after_sales_requests
          WHERE order_id = $1
          ORDER BY created_at DESC, id DESC
        `,
				[input.orderId],
			),
			client.query<AdminOrderAfterSalesItemRow>(
				`
          SELECT
            after_sales_items.id AS after_sales_item_id,
            after_sales_items.after_sales_request_id,
            after_sales_items.site_id,
            after_sales_items.vertical_id,
            after_sales_items.brand_id,
            after_sales_items.order_item_id,
            after_sales_items.quantity,
            after_sales_items.requested_amount::text,
            after_sales_items.approved_amount::text,
            after_sales_items.return_quality_status,
            after_sales_items.created_at
          FROM after_sales_items
          JOIN after_sales_requests
            ON after_sales_requests.id = after_sales_items.after_sales_request_id
          WHERE after_sales_requests.order_id = $1
          ORDER BY after_sales_items.created_at DESC, after_sales_items.id DESC
        `,
				[input.orderId],
			),
			client.query<AdminOrderStatusLogRow>(
				`
          SELECT
            id AS status_log_id,
            site_id,
            vertical_id,
            brand_id,
            status_type,
            from_status,
            to_status,
            reason,
            operator_type,
            operator_id,
            metadata,
            created_at
          FROM order_status_logs
          WHERE order_id = $1
          ORDER BY created_at DESC, id DESC
        `,
				[input.orderId],
			),
		]);

		return {
			...mapCheckoutResult(orderRow),
			shippingAddressSnapshot: orderRow.shipping_address_snapshot ?? {},
			priceSnapshot: orderRow.price_snapshot ?? {},
			cartOrigin: {
				...(orderRow.user_id ? { userId: orderRow.user_id } : {}),
				...(orderRow.guest_token ? { guestToken: orderRow.guest_token } : {}),
				idempotencyKey: orderRow.idempotency_key,
			},
			items: itemResult.rows.map(mapOrderItem),
			paymentOrders: paymentOrderResult.rows.map(mapAdminPaymentOrder),
			paymentTransactions: paymentTransactionResult.rows.map(
				mapAdminPaymentTransaction,
			),
			inventoryLocks: inventoryLockResult.rows.map(mapAdminInventoryLock),
			inventoryTransactions: inventoryTransactionResult.rows.map(
				mapAdminInventoryTransaction,
			),
			fulfillmentOrders: fulfillmentOrderResult.rows.map(
				mapAdminFulfillmentOrder,
			),
			fulfillmentItems: fulfillmentItemResult.rows.map(mapAdminFulfillmentItem),
			shipments: shipmentResult.rows.map(mapShipment),
			paymentRefunds: paymentRefundResult.rows.map(mapAdminPaymentRefund),
			afterSalesRequests: afterSalesRequestResult.rows.map(
				mapAdminAfterSalesRequest,
			),
			afterSalesItems: afterSalesItemResult.rows.map(mapAdminAfterSalesItem),
			statusLogs: statusLogResult.rows.map(mapAdminStatusLog),
		};
	}

	async applyPaymentSucceeded(
		record: ApplyPaymentSucceededRecord,
		transaction: TransactionContext,
	): Promise<void> {
		await getPgClient(transaction).query(
			`
        UPDATE orders
        SET
          order_status = $2,
          payment_status = $3,
          paid_at = $4,
          updated_at = now()
        WHERE id = $1
      `,
			[
				record.orderId,
				record.orderStatus,
				record.paymentStatus,
				record.paidAt,
			],
		);
	}
}
