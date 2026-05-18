import { Body, Controller, Param, Post, Req } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AdminAccessAwareRequest } from "../../../common/admin/admin-access.js";
import {
	createPublicNumber,
	createUuid,
} from "../../../common/ids/public-ids.js";
import { AdminAccessService } from "../../admin-access/admin-access.service.js";
import { AdminAuditService } from "../../admin-audit/admin-audit.service.js";
import {
	CreateFulfillmentUseCase,
	DeliverShipmentUseCase,
	ShipFulfillmentUseCase,
} from "../fulfillment.use-cases.js";
import {
	CreateFulfillmentRequestDto,
	CreateFulfillmentResponseDto,
	DeliverShipmentRequestDto,
	DeliverShipmentResponseDto,
	ShipFulfillmentRequestDto,
	ShipFulfillmentResponseDto,
} from "./fulfillment.dto.js";

@ApiTags("admin-fulfillment")
@Controller("admin")
export class AdminFulfillmentController {
	constructor(
		private readonly adminAccess: AdminAccessService,
		private readonly adminAudit: AdminAuditService,
		private readonly createFulfillment: CreateFulfillmentUseCase,
		private readonly shipFulfillment: ShipFulfillmentUseCase,
		private readonly deliverShipment: DeliverShipmentUseCase,
	) {}

	@Post("fulfillments")
	@ApiOperation({
		summary: "Create a fulfillment order for a paid order",
	})
	@ApiOkResponse({ type: CreateFulfillmentResponseDto })
	async create(
		@Req() request: AdminAccessAwareRequest,
		@Body() body: CreateFulfillmentRequestDto,
	): Promise<CreateFulfillmentResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const result = await this.createFulfillment.execute({
			fulfillmentOrderId: body.fulfillmentOrderId ?? createUuid(),
			fulfillmentNo: body.fulfillmentNo ?? createPublicNumber("fulfillment"),
			orderId: body.orderId,
			...(body.warehouseId ? { warehouseId: body.warehouseId } : {}),
			adminAccess: access,
		});

		await this.adminAudit.record({
			request,
			access,
			action: "fulfillment.create",
			resourceType: "fulfillment_order",
			resourceId: result.fulfillment.fulfillmentOrderId,
			siteId: result.fulfillment.siteId,
			verticalId: result.fulfillment.verticalId,
			brandId: result.fulfillment.brandId,
			afterSnapshot: result,
		});

		return {
			fulfillmentOrderId: result.fulfillment.fulfillmentOrderId,
			fulfillmentNo: result.fulfillment.fulfillmentNo,
			orderId: result.fulfillment.orderId,
			orderNo: result.fulfillment.orderNo,
			status: result.fulfillment.status,
			itemCount: result.fulfillment.itemCount,
			reusedIdempotency: result.reusedIdempotency,
		};
	}

	@Post("fulfillments/:fulfillmentOrderId/ship")
	@ApiOperation({
		summary: "Create a shipment and mark fulfillment as shipped",
	})
	@ApiOkResponse({ type: ShipFulfillmentResponseDto })
	async ship(
		@Req() request: AdminAccessAwareRequest,
		@Param("fulfillmentOrderId") fulfillmentOrderId: string,
		@Body() body: ShipFulfillmentRequestDto,
	): Promise<ShipFulfillmentResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const result = await this.shipFulfillment.execute({
			shipmentId: body.shipmentId ?? createUuid(),
			fulfillmentOrderId,
			providerCode: body.providerCode,
			providerName: body.providerName,
			trackingNo: body.trackingNo,
			adminAccess: access,
		});

		await this.adminAudit.record({
			request,
			access,
			action: "fulfillment.ship",
			resourceType: "shipment",
			resourceId: result.shipment.shipmentId,
			siteId: result.shipment.siteId,
			verticalId: result.shipment.verticalId,
			brandId: result.shipment.brandId,
			afterSnapshot: result,
		});

		return {
			shipmentId: result.shipment.shipmentId,
			fulfillmentOrderId: result.shipment.fulfillmentOrderId,
			providerCode: result.shipment.providerCode,
			trackingNo: result.shipment.trackingNo,
			status: result.shipment.status,
			reusedIdempotency: result.reusedIdempotency,
		};
	}

	@Post("shipments/:shipmentId/deliver")
	@ApiOperation({
		summary: "Mark a shipment delivered and complete the order",
	})
	@ApiOkResponse({ type: DeliverShipmentResponseDto })
	async deliver(
		@Req() request: AdminAccessAwareRequest,
		@Param("shipmentId") shipmentId: string,
		@Body() body: DeliverShipmentRequestDto,
	): Promise<DeliverShipmentResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);
		const result = await this.deliverShipment.execute({
			shipmentId,
			deliveredAt: body.deliveredAt ?? new Date().toISOString(),
			...(body.description ? { description: body.description } : {}),
			...(body.location ? { location: body.location } : {}),
			adminAccess: access,
		});

		await this.adminAudit.record({
			request,
			access,
			action: "shipment.deliver",
			resourceType: "shipment",
			resourceId: result.shipment.shipmentId,
			siteId: result.shipment.siteId,
			verticalId: result.shipment.verticalId,
			brandId: result.shipment.brandId,
			afterSnapshot: result,
		});

		return {
			status: result.status,
			shipmentId: result.shipment.shipmentId,
			shipmentStatus: result.shipment.status,
		};
	}
}
