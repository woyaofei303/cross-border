import { Injectable } from "@nestjs/common";
import type {
	FulfillmentOrderStatus,
	FulfillmentStatus,
	OrderStatus,
	PaymentStatus,
	ShipmentStatus,
} from "@cross-border/shared";
import type { TransactionContext } from "../../../common/application/application-ports.js";
import type { SiteDimensions } from "../../../common/site/site-context.js";
import { getPgClient } from "../../database/pg/pg-transaction-manager.js";
import type { FulfillmentRepositoryPort } from "../fulfillment.ports.js";
import type {
	FulfillmentOrderSnapshot,
	FulfillmentOrderSummary,
	OrderFulfillmentSnapshot,
	ShipmentDeliverySnapshot,
	ShipmentSummary,
} from "../fulfillment.types.js";

type FulfillmentOrderRow = {
	id: string;
	fulfillment_no: string;
	order_id: string;
	order_no: string;
	warehouse_id: string | null;
	status: FulfillmentOrderStatus;
	site_id: string;
	vertical_id: string;
	brand_id: string;
	item_count: number;
	order_status?: OrderStatus;
	payment_status?: PaymentStatus;
	fulfillment_status?: FulfillmentStatus;
};

type OrderFulfillmentRow = {
	order_id: string;
	order_no: string;
	site_id: string;
	vertical_id: string;
	brand_id: string;
	order_status: OrderStatus;
	payment_status: PaymentStatus;
	fulfillment_status: FulfillmentStatus;
};

type ShipmentRow = {
	id: string;
	fulfillment_order_id: string;
	provider_id: string;
	provider_code: string;
	tracking_no: string;
	status: ShipmentStatus;
	site_id: string;
	vertical_id: string;
	brand_id: string;
	order_id?: string;
	order_no?: string;
	order_status?: OrderStatus;
	fulfillment_order_status?: FulfillmentOrderStatus;
	fulfillment_status?: FulfillmentStatus;
};

function mapFulfillmentSummary(
	row: FulfillmentOrderRow,
): FulfillmentOrderSummary {
	return {
		fulfillmentOrderId: row.id,
		fulfillmentNo: row.fulfillment_no,
		orderId: row.order_id,
		orderNo: row.order_no,
		...(row.warehouse_id ? { warehouseId: row.warehouse_id } : {}),
		status: row.status,
		siteId: row.site_id,
		verticalId: row.vertical_id,
		brandId: row.brand_id,
		itemCount: row.item_count,
	};
}

function mapOrder(row: OrderFulfillmentRow): OrderFulfillmentSnapshot {
	return {
		orderId: row.order_id,
		orderNo: row.order_no,
		siteId: row.site_id,
		verticalId: row.vertical_id,
		brandId: row.brand_id,
		orderStatus: row.order_status,
		paymentStatus: row.payment_status,
		fulfillmentStatus: row.fulfillment_status,
	};
}

function mapShipment(row: ShipmentRow): ShipmentSummary {
	return {
		shipmentId: row.id,
		fulfillmentOrderId: row.fulfillment_order_id,
		providerId: row.provider_id,
		providerCode: row.provider_code,
		trackingNo: row.tracking_no,
		status: row.status,
		siteId: row.site_id,
		verticalId: row.vertical_id,
		brandId: row.brand_id,
	};
}

@Injectable()
export class PgFulfillmentRepository implements FulfillmentRepositoryPort {
	async findFulfillmentByNo(
		fulfillmentNo: string,
		transaction: TransactionContext,
	): Promise<FulfillmentOrderSummary | null> {
		const result = await getPgClient(transaction).query<FulfillmentOrderRow>(
			`
        SELECT
          fulfillment_orders.id,
          fulfillment_orders.fulfillment_no,
          fulfillment_orders.order_id,
          orders.order_no,
          fulfillment_orders.warehouse_id,
          fulfillment_orders.status,
          fulfillment_orders.site_id,
          fulfillment_orders.vertical_id,
          fulfillment_orders.brand_id,
          COUNT(fulfillment_items.id)::int AS item_count
        FROM fulfillment_orders
        JOIN orders ON orders.id = fulfillment_orders.order_id
        LEFT JOIN fulfillment_items
          ON fulfillment_items.fulfillment_order_id = fulfillment_orders.id
        WHERE fulfillment_orders.fulfillment_no = $1
        GROUP BY fulfillment_orders.id, orders.order_no
        LIMIT 1
      `,
			[fulfillmentNo],
		);
		const row = result.rows[0];

		return row ? mapFulfillmentSummary(row) : null;
	}

	async getOrderForFulfillment(
		orderId: string,
		transaction: TransactionContext,
	): Promise<OrderFulfillmentSnapshot> {
		const result = await getPgClient(transaction).query<OrderFulfillmentRow>(
			`
        SELECT
          id AS order_id,
          order_no,
          site_id,
          vertical_id,
          brand_id,
          order_status,
          payment_status,
          fulfillment_status
        FROM orders
        WHERE id = $1
        FOR UPDATE
      `,
			[orderId],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error(`Order not found for fulfillment: ${orderId}.`);
		}

		return mapOrder(row);
	}

	async createFulfillmentOrder(
		input: {
			fulfillmentOrderId: string;
			fulfillmentNo: string;
			order: OrderFulfillmentSnapshot;
			warehouseId?: string;
			status: string;
		},
		transaction: TransactionContext,
	): Promise<FulfillmentOrderSummary> {
		const result = await getPgClient(transaction).query<FulfillmentOrderRow>(
			`
        INSERT INTO fulfillment_orders (
          id,
          order_id,
          site_id,
          vertical_id,
          brand_id,
          fulfillment_no,
          warehouse_id,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING
          id,
          fulfillment_no,
          order_id,
          $9::varchar AS order_no,
          warehouse_id,
          status,
          site_id,
          vertical_id,
          brand_id,
          0::int AS item_count
      `,
			[
				input.fulfillmentOrderId,
				input.order.orderId,
				input.order.siteId,
				input.order.verticalId,
				input.order.brandId,
				input.fulfillmentNo,
				input.warehouseId ?? null,
				input.status,
				input.order.orderNo,
			],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error("Failed to create fulfillment order.");
		}

		return mapFulfillmentSummary(row);
	}

	async createFulfillmentItemsFromOrder(
		input: {
			fulfillmentOrderId: string;
			orderId: string;
			dimensions: SiteDimensions;
		},
		transaction: TransactionContext,
	): Promise<number> {
		const result = await getPgClient(transaction).query<{ id: string }>(
			`
        INSERT INTO fulfillment_items (
          fulfillment_order_id,
          site_id,
          vertical_id,
          brand_id,
          order_item_id,
          sku_id,
          quantity
        )
        SELECT
          $1,
          $3,
          $4,
          $5,
          order_items.id,
          order_items.sku_id,
          order_items.quantity
        FROM order_items
        WHERE order_items.order_id = $2
          AND order_items.site_id = $3
          AND order_items.vertical_id = $4
          AND order_items.brand_id = $5
        RETURNING id
      `,
			[
				input.fulfillmentOrderId,
				input.orderId,
				input.dimensions.siteId,
				input.dimensions.verticalId,
				input.dimensions.brandId,
			],
		);

		return result.rowCount ?? 0;
	}

	async updateOrderFulfillmentState(
		input: {
			orderId: string;
			orderStatus: string;
			fulfillmentStatus: string;
			dimensions: SiteDimensions;
		},
		transaction: TransactionContext,
	): Promise<void> {
		await getPgClient(transaction).query(
			`
        UPDATE orders
        SET
          order_status = $2,
          fulfillment_status = $3,
          updated_at = now()
        WHERE id = $1
          AND site_id = $4
          AND vertical_id = $5
          AND brand_id = $6
      `,
			[
				input.orderId,
				input.orderStatus,
				input.fulfillmentStatus,
				input.dimensions.siteId,
				input.dimensions.verticalId,
				input.dimensions.brandId,
			],
		);
	}

	async appendOrderStatusLogs(
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
	): Promise<void> {
		for (const log of input.logs) {
			await getPgClient(transaction).query(
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
            operator_type
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'admin')
        `,
				[
					input.orderId,
					input.dimensions.siteId,
					input.dimensions.verticalId,
					input.dimensions.brandId,
					log.statusType,
					log.fromStatus,
					log.toStatus,
					log.reason,
				],
			);
		}
	}

	async getFulfillmentForUpdate(
		fulfillmentOrderId: string,
		transaction: TransactionContext,
	): Promise<FulfillmentOrderSnapshot> {
		const result = await getPgClient(transaction).query<FulfillmentOrderRow>(
			`
        SELECT
          fulfillment_orders.id,
          fulfillment_orders.fulfillment_no,
          fulfillment_orders.order_id,
          orders.order_no,
          fulfillment_orders.warehouse_id,
          fulfillment_orders.status,
          fulfillment_orders.site_id,
          fulfillment_orders.vertical_id,
          fulfillment_orders.brand_id,
          orders.order_status,
          orders.payment_status,
          orders.fulfillment_status,
          (
            SELECT COUNT(*)::int
            FROM fulfillment_items
            WHERE fulfillment_items.fulfillment_order_id = fulfillment_orders.id
          ) AS item_count
        FROM fulfillment_orders
        JOIN orders ON orders.id = fulfillment_orders.order_id
        WHERE fulfillment_orders.id = $1
        FOR UPDATE OF fulfillment_orders, orders
      `,
			[fulfillmentOrderId],
		);
		const row = result.rows[0];

		if (!row || !row.order_status || !row.payment_status || !row.fulfillment_status) {
			throw new Error(`Fulfillment order not found: ${fulfillmentOrderId}.`);
		}

		return {
			...mapFulfillmentSummary(row),
			orderStatus: row.order_status,
			paymentStatus: row.payment_status,
			fulfillmentStatus: row.fulfillment_status,
		};
	}

	async upsertLogisticsProvider(
		input: {
			code: string;
			name: string;
		},
		transaction: TransactionContext,
	): Promise<string> {
		const result = await getPgClient(transaction).query<{ id: string }>(
			`
        INSERT INTO logistics_providers (code, name, status)
        VALUES ($1, $2, 'active')
        ON CONFLICT (code)
        DO UPDATE SET
          name = EXCLUDED.name,
          status = 'active',
          updated_at = now()
        RETURNING id
      `,
			[input.code, input.name],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error("Failed to upsert logistics provider.");
		}

		return row.id;
	}

	async insertShipmentIfNew(
		input: {
			shipmentId: string;
			fulfillment: FulfillmentOrderSnapshot;
			providerId: string;
			providerCode: string;
			trackingNo: string;
			status: string;
		},
		transaction: TransactionContext,
	): Promise<{ shipment: ShipmentSummary; inserted: boolean }> {
		const result = await getPgClient(transaction).query<ShipmentRow>(
			`
        INSERT INTO shipments (
          id,
          site_id,
          vertical_id,
          brand_id,
          fulfillment_order_id,
          provider_id,
          tracking_no,
          status,
          shipped_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
        ON CONFLICT (provider_id, tracking_no)
        DO NOTHING
        RETURNING
          id,
          fulfillment_order_id,
          provider_id,
          $9::varchar AS provider_code,
          tracking_no,
          status,
          site_id,
          vertical_id,
          brand_id
      `,
			[
				input.shipmentId,
				input.fulfillment.siteId,
				input.fulfillment.verticalId,
				input.fulfillment.brandId,
				input.fulfillment.fulfillmentOrderId,
				input.providerId,
				input.trackingNo,
				input.status,
				input.providerCode,
			],
		);
		const inserted = result.rows[0];

		if (inserted) {
			return {
				shipment: mapShipment(inserted),
				inserted: true,
			};
		}

		const existing = await getPgClient(transaction).query<ShipmentRow>(
			`
        SELECT
          shipments.id,
          shipments.fulfillment_order_id,
          shipments.provider_id,
          logistics_providers.code AS provider_code,
          shipments.tracking_no,
          shipments.status,
          shipments.site_id,
          shipments.vertical_id,
          shipments.brand_id
        FROM shipments
        JOIN logistics_providers ON logistics_providers.id = shipments.provider_id
        WHERE shipments.provider_id = $1
          AND shipments.tracking_no = $2
        LIMIT 1
      `,
			[input.providerId, input.trackingNo],
		);
		const row = existing.rows[0];

		if (!row) {
			throw new Error("Shipment conflict row not found.");
		}

		return {
			shipment: mapShipment(row),
			inserted: false,
		};
	}

	async markFulfillmentShipped(
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
	): Promise<void> {
		const client = getPgClient(transaction);
		await client.query(
			`
        UPDATE fulfillment_orders
        SET status = $2, updated_at = now()
        WHERE id = $1
          AND site_id = $3
          AND vertical_id = $4
          AND brand_id = $5
      `,
			[
				input.fulfillmentOrderId,
				input.fulfillmentOrderStatus,
				input.dimensions.siteId,
				input.dimensions.verticalId,
				input.dimensions.brandId,
			],
		);
		await this.updateOrderFulfillmentState(
			{
				orderId: input.orderId,
				orderStatus: input.orderStatus,
				fulfillmentStatus: input.fulfillmentStatus,
				dimensions: input.dimensions,
			},
			transaction,
		);
	}

	async getShipmentForDelivery(
		shipmentId: string,
		transaction: TransactionContext,
	): Promise<ShipmentDeliverySnapshot> {
		const result = await getPgClient(transaction).query<ShipmentRow>(
			`
        SELECT
          shipments.id,
          shipments.fulfillment_order_id,
          shipments.provider_id,
          logistics_providers.code AS provider_code,
          shipments.tracking_no,
          shipments.status,
          shipments.site_id,
          shipments.vertical_id,
          shipments.brand_id,
          fulfillment_orders.order_id,
          orders.order_no,
          orders.order_status,
          fulfillment_orders.status AS fulfillment_order_status,
          orders.fulfillment_status
        FROM shipments
        JOIN logistics_providers ON logistics_providers.id = shipments.provider_id
        JOIN fulfillment_orders
          ON fulfillment_orders.id = shipments.fulfillment_order_id
        JOIN orders ON orders.id = fulfillment_orders.order_id
        WHERE shipments.id = $1
        FOR UPDATE OF shipments, fulfillment_orders, orders
      `,
			[shipmentId],
		);
		const row = result.rows[0];

		if (
			!row ||
			!row.order_id ||
			!row.order_no ||
			!row.order_status ||
			!row.fulfillment_order_status ||
			!row.fulfillment_status
		) {
			throw new Error(`Shipment not found for delivery: ${shipmentId}.`);
		}

		return {
			...mapShipment(row),
			orderId: row.order_id,
			orderNo: row.order_no,
			orderStatus: row.order_status,
			fulfillmentOrderStatus: row.fulfillment_order_status,
			fulfillmentStatus: row.fulfillment_status,
		};
	}

	async markShipmentDelivered(
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
	): Promise<void> {
		const client = getPgClient(transaction);
		await client.query(
			`
        UPDATE shipments
        SET
          status = 'delivered',
          delivered_at = $2,
          updated_at = now()
        WHERE id = $1
          AND site_id = $3
          AND vertical_id = $4
          AND brand_id = $5
      `,
			[
				input.shipmentId,
				input.deliveredAt,
				input.dimensions.siteId,
				input.dimensions.verticalId,
				input.dimensions.brandId,
			],
		);
		await client.query(
			`
        UPDATE fulfillment_orders
        SET status = $2, updated_at = now()
        WHERE id = $1
          AND site_id = $3
          AND vertical_id = $4
          AND brand_id = $5
      `,
			[
				input.fulfillmentOrderId,
				input.fulfillmentOrderStatus,
				input.dimensions.siteId,
				input.dimensions.verticalId,
				input.dimensions.brandId,
			],
		);
		await this.updateOrderFulfillmentState(
			{
				orderId: input.orderId,
				orderStatus: input.orderStatus,
				fulfillmentStatus: input.fulfillmentStatus,
				dimensions: input.dimensions,
			},
			transaction,
		);
		await client.query(
			`
        INSERT INTO shipment_tracking_events (
          shipment_id,
          site_id,
          vertical_id,
          brand_id,
          tracking_status,
          description,
          location,
          occurred_at,
          raw_payload
        )
        VALUES ($1, $2, $3, $4, 'delivered', $5, $6, $7, '{}'::jsonb)
      `,
			[
				input.shipmentId,
				input.dimensions.siteId,
				input.dimensions.verticalId,
				input.dimensions.brandId,
				input.description ?? "Delivered",
				input.location ?? null,
				input.deliveredAt,
			],
		);
	}
}
