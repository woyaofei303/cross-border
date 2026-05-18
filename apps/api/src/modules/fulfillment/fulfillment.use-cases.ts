import { ForbiddenException } from "@nestjs/common";
import type { AdminAccessContext } from "../../common/admin/admin-access.js";
import { canAccessSiteDimensions } from "../../common/admin/admin-access.js";
import type { TransactionManagerPort } from "../../common/application/application-ports.js";
import type { SiteDimensions } from "../../common/site/site-context.js";
import type { FulfillmentRepositoryPort } from "./fulfillment.ports.js";
import { FulfillmentWorkflowService } from "./fulfillment.service.js";
import type {
	FulfillmentOrderSummary,
	ShipmentSummary,
} from "./fulfillment.types.js";

export type CreateFulfillmentInput = {
	fulfillmentOrderId: string;
	fulfillmentNo: string;
	orderId: string;
	warehouseId?: string;
	adminAccess: AdminAccessContext;
};

export type CreateFulfillmentResult = {
	fulfillment: FulfillmentOrderSummary;
	reusedIdempotency: boolean;
};

export type ShipFulfillmentInput = {
	shipmentId: string;
	fulfillmentOrderId: string;
	providerCode: string;
	providerName: string;
	trackingNo: string;
	adminAccess: AdminAccessContext;
};

export type ShipFulfillmentResult = {
	shipment: ShipmentSummary;
	reusedIdempotency: boolean;
};

export type DeliverShipmentInput = {
	shipmentId: string;
	deliveredAt: string;
	description?: string;
	location?: string;
	adminAccess: AdminAccessContext;
};

export type DeliverShipmentResult = {
	shipment: ShipmentSummary;
	status: "processed" | "already_delivered";
};

export type FulfillmentUseCaseDeps = {
	transactions: TransactionManagerPort;
	fulfillment: FulfillmentRepositoryPort;
	workflow: FulfillmentWorkflowService;
};

function assertAdminCanAccess(
	access: AdminAccessContext,
	dimensions: SiteDimensions,
): void {
	if (!canAccessSiteDimensions(access.scopes, dimensions)) {
		throw new ForbiddenException({
			code: "ADMIN_SCOPE_FORBIDDEN",
			message: "Admin scope cannot access this fulfillment resource.",
		});
	}
}

export class CreateFulfillmentUseCase {
	constructor(private readonly deps: FulfillmentUseCaseDeps) {}

	async execute(input: CreateFulfillmentInput): Promise<CreateFulfillmentResult> {
		return this.deps.transactions.runInTransaction(async (transaction) => {
			const existing = await this.deps.fulfillment.findFulfillmentByNo(
				input.fulfillmentNo,
				transaction,
			);

			if (existing) {
				assertAdminCanAccess(input.adminAccess, existing);
				return {
					fulfillment: existing,
					reusedIdempotency: true,
				};
			}

			const order = await this.deps.fulfillment.getOrderForFulfillment(
				input.orderId,
				transaction,
			);
			assertAdminCanAccess(input.adminAccess, order);
			const plan = this.deps.workflow.planCreateFulfillment({
				orderStatus: order.orderStatus,
				paymentStatus: order.paymentStatus,
				fulfillmentStatus: order.fulfillmentStatus,
			});
			const fulfillment =
				await this.deps.fulfillment.createFulfillmentOrder(
					{
						fulfillmentOrderId: input.fulfillmentOrderId,
						fulfillmentNo: input.fulfillmentNo,
						order,
						...(input.warehouseId ? { warehouseId: input.warehouseId } : {}),
						status: plan.fulfillmentOrderStatus,
					},
					transaction,
				);
			const itemCount =
				await this.deps.fulfillment.createFulfillmentItemsFromOrder(
					{
						fulfillmentOrderId: fulfillment.fulfillmentOrderId,
						orderId: order.orderId,
						dimensions: order,
					},
					transaction,
				);

			await this.deps.fulfillment.updateOrderFulfillmentState(
				{
					orderId: order.orderId,
					orderStatus: plan.nextOrderStatus,
					fulfillmentStatus: plan.nextFulfillmentStatus,
					dimensions: order,
				},
				transaction,
			);
			await this.deps.fulfillment.appendOrderStatusLogs(
				{
					orderId: order.orderId,
					dimensions: order,
					logs: [
						...(order.orderStatus !== plan.nextOrderStatus
							? [
									{
										statusType: "order" as const,
										fromStatus: order.orderStatus,
										toStatus: plan.nextOrderStatus,
										reason: "fulfillment_created",
									},
								]
							: []),
						...(order.fulfillmentStatus !== plan.nextFulfillmentStatus
							? [
									{
										statusType: "fulfillment" as const,
										fromStatus: order.fulfillmentStatus,
										toStatus: plan.nextFulfillmentStatus,
										reason: "fulfillment_created",
									},
								]
							: []),
					],
				},
				transaction,
			);

			return {
				fulfillment: {
					...fulfillment,
					itemCount,
				},
				reusedIdempotency: false,
			};
		});
	}
}

export class ShipFulfillmentUseCase {
	constructor(private readonly deps: FulfillmentUseCaseDeps) {}

	async execute(input: ShipFulfillmentInput): Promise<ShipFulfillmentResult> {
		return this.deps.transactions.runInTransaction(async (transaction) => {
			const fulfillment = await this.deps.fulfillment.getFulfillmentForUpdate(
				input.fulfillmentOrderId,
				transaction,
			);
			assertAdminCanAccess(input.adminAccess, fulfillment);
			const providerId = await this.deps.fulfillment.upsertLogisticsProvider(
				{
					code: input.providerCode,
					name: input.providerName,
				},
				transaction,
			);
			const shipmentResult = await this.deps.fulfillment.insertShipmentIfNew(
				{
					shipmentId: input.shipmentId,
					fulfillment,
					providerId,
					providerCode: input.providerCode,
					trackingNo: input.trackingNo,
					status: "shipped",
				},
				transaction,
			);

			if (!shipmentResult.inserted && shipmentResult.shipment.status === "shipped") {
				return {
					shipment: shipmentResult.shipment,
					reusedIdempotency: true,
				};
			}

			const plan = this.deps.workflow.planShipFulfillment({
				orderStatus: fulfillment.orderStatus,
				fulfillmentStatus: fulfillment.fulfillmentStatus,
				fulfillmentOrderStatus: fulfillment.status,
			});

			await this.deps.fulfillment.markFulfillmentShipped(
				{
					fulfillmentOrderId: fulfillment.fulfillmentOrderId,
					orderId: fulfillment.orderId,
					dimensions: fulfillment,
					orderStatus: plan.nextOrderStatus,
					fulfillmentStatus: plan.nextFulfillmentStatus,
					fulfillmentOrderStatus: plan.nextFulfillmentOrderStatus,
					shippedAt: new Date().toISOString(),
				},
				transaction,
			);
			await this.deps.fulfillment.appendOrderStatusLogs(
				{
					orderId: fulfillment.orderId,
					dimensions: fulfillment,
					logs: [
						...(fulfillment.orderStatus !== plan.nextOrderStatus
							? [
									{
										statusType: "order" as const,
										fromStatus: fulfillment.orderStatus,
										toStatus: plan.nextOrderStatus,
										reason: "shipment_created",
									},
								]
							: []),
						...(fulfillment.fulfillmentStatus !== plan.nextFulfillmentStatus
							? [
									{
										statusType: "fulfillment" as const,
										fromStatus: fulfillment.fulfillmentStatus,
										toStatus: plan.nextFulfillmentStatus,
										reason: "shipment_created",
									},
								]
							: []),
					],
				},
				transaction,
			);

			return {
				shipment: shipmentResult.shipment,
				reusedIdempotency: false,
			};
		});
	}
}

export class DeliverShipmentUseCase {
	constructor(private readonly deps: FulfillmentUseCaseDeps) {}

	async execute(input: DeliverShipmentInput): Promise<DeliverShipmentResult> {
		return this.deps.transactions.runInTransaction(async (transaction) => {
			const shipment = await this.deps.fulfillment.getShipmentForDelivery(
				input.shipmentId,
				transaction,
			);
			assertAdminCanAccess(input.adminAccess, shipment);

			if (shipment.status === "delivered") {
				return {
					shipment,
					status: "already_delivered",
				};
			}

			const plan = this.deps.workflow.planDeliverShipment({
				orderStatus: shipment.orderStatus,
				fulfillmentStatus: shipment.fulfillmentStatus,
				fulfillmentOrderStatus: shipment.fulfillmentOrderStatus,
			});

			await this.deps.fulfillment.markShipmentDelivered(
				{
					shipmentId: shipment.shipmentId,
					fulfillmentOrderId: shipment.fulfillmentOrderId,
					orderId: shipment.orderId,
					dimensions: shipment,
					orderStatus: plan.nextOrderStatus,
					fulfillmentStatus: plan.nextFulfillmentStatus,
					fulfillmentOrderStatus: plan.nextFulfillmentOrderStatus,
					deliveredAt: input.deliveredAt,
					...(input.description ? { description: input.description } : {}),
					...(input.location ? { location: input.location } : {}),
				},
				transaction,
			);
			await this.deps.fulfillment.appendOrderStatusLogs(
				{
					orderId: shipment.orderId,
					dimensions: shipment,
					logs: [
						...(shipment.orderStatus !== plan.nextOrderStatus
							? [
									{
										statusType: "order" as const,
										fromStatus: shipment.orderStatus,
										toStatus: plan.nextOrderStatus,
										reason: "shipment_delivered",
									},
								]
							: []),
						...(shipment.fulfillmentStatus !== plan.nextFulfillmentStatus
							? [
									{
										statusType: "fulfillment" as const,
										fromStatus: shipment.fulfillmentStatus,
										toStatus: plan.nextFulfillmentStatus,
										reason: "shipment_delivered",
									},
								]
							: []),
					],
				},
				transaction,
			);

			return {
				shipment: {
					...shipment,
					status: "delivered",
				},
				status: "processed",
			};
		});
	}
}
