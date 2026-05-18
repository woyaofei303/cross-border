import { Injectable } from "@nestjs/common";
import type {
	FulfillmentOrderStatus,
	FulfillmentStatus,
	OrderStatus,
} from "@cross-border/shared";
import { assertDomainRule } from "../../common/domain/domain-errors.js";
import {
	assertFulfillmentStatusTransition,
	assertOrderStatusTransition,
} from "../order/order-state-machine.js";

export type FulfillmentOrderCreationPlan = {
	nextOrderStatus: OrderStatus;
	nextFulfillmentStatus: FulfillmentStatus;
	fulfillmentOrderStatus: FulfillmentOrderStatus;
};

export type ShipmentPlan = {
	nextOrderStatus: OrderStatus;
	nextFulfillmentStatus: FulfillmentStatus;
	nextFulfillmentOrderStatus: FulfillmentOrderStatus;
};

@Injectable()
export class FulfillmentWorkflowService {
	planCreateFulfillment(input: {
		orderStatus: OrderStatus;
		paymentStatus: string;
		fulfillmentStatus: FulfillmentStatus;
	}): FulfillmentOrderCreationPlan {
		assertDomainRule(
			input.paymentStatus === "paid" ||
				input.paymentStatus === "partially_refunded",
			"FULFILLMENT_ORDER_NOT_PAYABLE",
			"Only paid orders can enter fulfillment.",
		);
		assertDomainRule(
			input.orderStatus === "paid" || input.orderStatus === "confirmed",
			"FULFILLMENT_ORDER_STATUS_INVALID",
			"Only paid or confirmed orders can enter fulfillment.",
		);
		assertDomainRule(
			input.fulfillmentStatus === "unfulfilled" ||
				input.fulfillmentStatus === "pending",
			"FULFILLMENT_STATUS_INVALID",
			"Only unfulfilled or pending orders can create fulfillment.",
		);

		const nextOrderStatus =
			input.orderStatus === "paid" ? "confirmed" : input.orderStatus;
		const nextFulfillmentStatus =
			input.fulfillmentStatus === "unfulfilled"
				? "pending"
				: input.fulfillmentStatus;

		if (input.orderStatus !== nextOrderStatus) {
			assertOrderStatusTransition(input.orderStatus, nextOrderStatus);
		}

		if (input.fulfillmentStatus !== nextFulfillmentStatus) {
			assertFulfillmentStatusTransition(
				input.fulfillmentStatus,
				nextFulfillmentStatus,
			);
		}

		return {
			nextOrderStatus,
			nextFulfillmentStatus,
			fulfillmentOrderStatus: "pending",
		};
	}

	planShipFulfillment(input: {
		orderStatus: OrderStatus;
		fulfillmentStatus: FulfillmentStatus;
		fulfillmentOrderStatus: FulfillmentOrderStatus;
	}): ShipmentPlan {
		assertDomainRule(
			input.orderStatus === "confirmed" || input.orderStatus === "fulfilled",
			"FULFILLMENT_SHIP_ORDER_STATUS_INVALID",
			"Only confirmed or fulfilled orders can be shipped.",
		);
		assertDomainRule(
			input.fulfillmentOrderStatus === "pending" ||
				input.fulfillmentOrderStatus === "picking" ||
				input.fulfillmentOrderStatus === "packed" ||
				input.fulfillmentOrderStatus === "shipped",
			"FULFILLMENT_SHIP_STATUS_INVALID",
			"Only pending, picking, packed, or shipped fulfillment orders can be shipped.",
		);

		const nextOrderStatus =
			input.orderStatus === "confirmed" ? "fulfilled" : input.orderStatus;
		const nextFulfillmentStatus =
			input.fulfillmentStatus === "pending" ? "shipped" : input.fulfillmentStatus;

		if (input.orderStatus !== nextOrderStatus) {
			assertOrderStatusTransition(input.orderStatus, nextOrderStatus);
		}

		if (input.fulfillmentStatus !== nextFulfillmentStatus) {
			assertFulfillmentStatusTransition(
				input.fulfillmentStatus,
				nextFulfillmentStatus,
			);
		}

		return {
			nextOrderStatus,
			nextFulfillmentStatus,
			nextFulfillmentOrderStatus: "shipped",
		};
	}

	planDeliverShipment(input: {
		orderStatus: OrderStatus;
		fulfillmentStatus: FulfillmentStatus;
		fulfillmentOrderStatus: FulfillmentOrderStatus;
	}): ShipmentPlan {
		assertDomainRule(
			input.orderStatus === "fulfilled" || input.orderStatus === "completed",
			"FULFILLMENT_DELIVER_ORDER_STATUS_INVALID",
			"Only fulfilled orders can be completed by delivery.",
		);
		assertDomainRule(
			input.fulfillmentOrderStatus === "shipped" ||
				input.fulfillmentOrderStatus === "delivered",
			"FULFILLMENT_DELIVER_STATUS_INVALID",
			"Only shipped fulfillment orders can be delivered.",
		);

		const nextOrderStatus =
			input.orderStatus === "fulfilled" ? "completed" : input.orderStatus;
		const nextFulfillmentStatus =
			input.fulfillmentStatus === "shipped"
				? "delivered"
				: input.fulfillmentStatus;

		if (input.orderStatus !== nextOrderStatus) {
			assertOrderStatusTransition(input.orderStatus, nextOrderStatus);
		}

		if (input.fulfillmentStatus !== nextFulfillmentStatus) {
			assertFulfillmentStatusTransition(
				input.fulfillmentStatus,
				nextFulfillmentStatus,
			);
		}

		return {
			nextOrderStatus,
			nextFulfillmentStatus,
			nextFulfillmentOrderStatus: "delivered",
		};
	}
}
