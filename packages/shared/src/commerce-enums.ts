export const orderStatuses = [
	"pending_payment",
	"payment_processing",
	"paid",
	"confirmed",
	"partially_fulfilled",
	"fulfilled",
	"completed",
	"cancelled",
	"closed",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export const paymentStatuses = [
	"unpaid",
	"processing",
	"paid",
	"failed",
	"partially_refunded",
	"refunded",
	"chargeback",
] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];

export const fulfillmentStatuses = [
	"unfulfilled",
	"pending",
	"partially_shipped",
	"shipped",
	"delivered",
	"failed",
] as const;

export type FulfillmentStatus = (typeof fulfillmentStatuses)[number];

export const aftersalesStatuses = [
	"none",
	"requested",
	"reviewing",
	"approved",
	"rejected",
	"returning",
	"received",
	"refunding",
	"completed",
	"closed",
] as const;

export type AftersalesStatus = (typeof aftersalesStatuses)[number];

export const paymentOrderStatuses = [
	"created",
	"processing",
	"succeeded",
	"failed",
	"cancelled",
	"expired",
] as const;

export type PaymentOrderStatus = (typeof paymentOrderStatuses)[number];

export const paymentTransactionTypes = [
	"authorize",
	"capture",
	"sale",
	"refund",
	"chargeback",
] as const;

export type PaymentTransactionType = (typeof paymentTransactionTypes)[number];

export const paymentTransactionStatuses = [
	"pending",
	"succeeded",
	"failed",
] as const;

export type PaymentTransactionStatus =
	(typeof paymentTransactionStatuses)[number];

export const paymentWebhookStatuses = [
	"received",
	"processing",
	"processed",
	"failed",
	"dead_letter",
] as const;

export type PaymentWebhookStatus = (typeof paymentWebhookStatuses)[number];

export const paymentRefundStatuses = [
	"requested",
	"processing",
	"succeeded",
	"failed",
	"cancelled",
] as const;

export type PaymentRefundStatus = (typeof paymentRefundStatuses)[number];

export const paymentChargebackStatuses = [
	"opened",
	"won",
	"lost",
	"closed",
] as const;

export type PaymentChargebackStatus =
	(typeof paymentChargebackStatuses)[number];

export const inventoryLockStatuses = [
	"locked",
	"released",
	"deducted",
	"expired",
] as const;

export type InventoryLockStatus = (typeof inventoryLockStatuses)[number];

export const inventoryTransactionTypes = [
	"initial",
	"adjust",
	"lock",
	"release",
	"deduct",
	"return_restock",
] as const;

export type InventoryTransactionType = (typeof inventoryTransactionTypes)[number];

export const fulfillmentOrderStatuses = [
	"pending",
	"picking",
	"packed",
	"shipped",
	"partially_shipped",
	"delivered",
	"cancelled",
	"failed",
] as const;

export type FulfillmentOrderStatus =
	(typeof fulfillmentOrderStatuses)[number];

export const shipmentStatuses = [
	"created",
	"shipped",
	"in_transit",
	"delivered",
	"exception",
	"returned",
] as const;

export type ShipmentStatus = (typeof shipmentStatuses)[number];

export const afterSalesRequestTypes = [
	"refund_only",
	"return_refund",
	"exchange",
] as const;

export type AfterSalesRequestType = (typeof afterSalesRequestTypes)[number];

export const afterSalesRequestStatuses = [
	"requested",
	"reviewing",
	"approved",
	"rejected",
	"returning",
	"received",
	"refunding",
	"completed",
	"closed",
] as const;

export type AfterSalesRequestStatus =
	(typeof afterSalesRequestStatuses)[number];

export const adminPermissionTypes = ["menu", "action", "data"] as const;

export type AdminPermissionType = (typeof adminPermissionTypes)[number];

export function isOneOf<const T extends readonly string[]>(
	values: T,
	value: string,
): value is T[number] {
	return values.includes(value);
}
