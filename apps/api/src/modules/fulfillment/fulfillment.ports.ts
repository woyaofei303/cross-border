import type { TransactionContext } from "../../common/application/application-ports.js";
import type { SiteDimensions } from "../../common/site/site-context.js";
import type {
	FulfillmentOrderSnapshot,
	FulfillmentOrderSummary,
	OrderFulfillmentSnapshot,
	ShipmentDeliverySnapshot,
	ShipmentSummary,
} from "./fulfillment.types.js";

export interface FulfillmentRepositoryPort {
	findFulfillmentByNo(
		fulfillmentNo: string,
		transaction: TransactionContext,
	): Promise<FulfillmentOrderSummary | null>;

	getOrderForFulfillment(
		orderId: string,
		transaction: TransactionContext,
	): Promise<OrderFulfillmentSnapshot>;

	createFulfillmentOrder(
		input: {
			fulfillmentOrderId: string;
			fulfillmentNo: string;
			order: OrderFulfillmentSnapshot;
			warehouseId?: string;
			status: string;
		},
		transaction: TransactionContext,
	): Promise<FulfillmentOrderSummary>;

	createFulfillmentItemsFromOrder(
		input: {
			fulfillmentOrderId: string;
			orderId: string;
			dimensions: SiteDimensions;
		},
		transaction: TransactionContext,
	): Promise<number>;

	updateOrderFulfillmentState(
		input: {
			orderId: string;
			orderStatus: string;
			fulfillmentStatus: string;
			dimensions: SiteDimensions;
		},
		transaction: TransactionContext,
	): Promise<void>;

	appendOrderStatusLogs(
		input: {
			orderId: string;
			dimensions: SiteDimensions;
			logs: Array<{
				statusType: "order" | "fulfillment";
				fromStatus: string;
				toStatus: string;
				reason: string;
			}>;
		},
		transaction: TransactionContext,
	): Promise<void>;

	getFulfillmentForUpdate(
		fulfillmentOrderId: string,
		transaction: TransactionContext,
	): Promise<FulfillmentOrderSnapshot>;

	upsertLogisticsProvider(
		input: {
			code: string;
			name: string;
		},
		transaction: TransactionContext,
	): Promise<string>;

	insertShipmentIfNew(
		input: {
			shipmentId: string;
			fulfillment: FulfillmentOrderSnapshot;
			providerId: string;
			providerCode: string;
			trackingNo: string;
			status: string;
		},
		transaction: TransactionContext,
	): Promise<{ shipment: ShipmentSummary; inserted: boolean }>;

	markFulfillmentShipped(
		input: {
			fulfillmentOrderId: string;
			orderId: string;
			dimensions: SiteDimensions;
			orderStatus: string;
			fulfillmentStatus: string;
			fulfillmentOrderStatus: string;
			shippedAt: string;
		},
		transaction: TransactionContext,
	): Promise<void>;

	getShipmentForDelivery(
		shipmentId: string,
		transaction: TransactionContext,
	): Promise<ShipmentDeliverySnapshot>;

	markShipmentDelivered(
		input: {
			shipmentId: string;
			fulfillmentOrderId: string;
			orderId: string;
			dimensions: SiteDimensions;
			orderStatus: string;
			fulfillmentStatus: string;
			fulfillmentOrderStatus: string;
			deliveredAt: string;
			description?: string;
			location?: string;
		},
		transaction: TransactionContext,
	): Promise<void>;
}
