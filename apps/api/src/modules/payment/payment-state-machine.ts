import type { PaymentOrderStatus } from "@cross-border/shared";
import { assertDomainRule } from "../../common/domain/domain-errors.js";

const paymentOrderTransitions: Record<
	PaymentOrderStatus,
	readonly PaymentOrderStatus[]
> = {
	created: ["processing", "succeeded", "failed", "cancelled", "expired"],
	processing: ["succeeded", "failed", "cancelled", "expired"],
	succeeded: [],
	failed: [],
	cancelled: [],
	expired: [],
};

export function assertPaymentOrderStatusTransition(
	fromStatus: PaymentOrderStatus,
	toStatus: PaymentOrderStatus,
): void {
	assertDomainRule(
		paymentOrderTransitions[fromStatus].includes(toStatus),
		"PAYMENT_ORDER_STATUS_TRANSITION_NOT_ALLOWED",
		`Payment order status cannot transition from ${fromStatus} to ${toStatus}.`,
	);
}
