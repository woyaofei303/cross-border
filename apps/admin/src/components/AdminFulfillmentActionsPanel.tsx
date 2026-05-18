"use client";

import { Alert, Button, Input } from "antd";
import { CheckCircle2, PackageCheck, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminOrderDetail } from "@/lib/admin-orders";
import { getFulfillmentActionState } from "@/lib/admin-orders";

type AdminFulfillmentActionsPanelProps = {
	order: Pick<
		AdminOrderDetail,
		| "orderId"
		| "orderNo"
		| "orderStatus"
		| "paymentStatus"
		| "fulfillmentStatus"
		| "inventoryLocks"
		| "inventoryTransactions"
		| "fulfillmentOrders"
		| "shipments"
	>;
};

type OperationState = "idle" | "running" | "succeeded" | "failed";

async function postJson<T>(pathname: string, body: unknown): Promise<T> {
	const response = await fetch(pathname, {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(body),
	});
	const payload = (await response.json().catch(() => ({}))) as {
		message?: string;
	};

	if (!response.ok) {
		throw new Error(payload.message ?? `Admin fulfillment request failed.`);
	}

	return payload as T;
}

export function AdminFulfillmentActionsPanel({
	order,
}: AdminFulfillmentActionsPanelProps) {
	const router = useRouter();
	const actionState = useMemo(() => getFulfillmentActionState(order), [order]);
	const [operationState, setOperationState] =
		useState<OperationState>("idle");
	const [message, setMessage] = useState("");
	const providerCode = "demo-carrier";
	const [providerName, setProviderName] = useState("Demo Carrier");
	const [trackingNo, setTrackingNo] = useState(
		`TRACK-${order.orderNo.slice(-8)}`,
	);
	const [deliveryLocation, setDeliveryLocation] = useState("Customer address");

	async function runOperation(operation: () => Promise<unknown>, success: string) {
		setOperationState("running");
		setMessage("");

		try {
			await operation();
			setOperationState("succeeded");
			setMessage(success);
			router.refresh();
		} catch (error) {
			setOperationState("failed");
			setMessage(error instanceof Error ? error.message : String(error));
		}
	}

	const isRunning = operationState === "running";

	return (
		<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
			<div className="flex items-center justify-between border-b border-[#d9e1dc] px-4 py-3">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
						Fulfillment Actions
					</p>
					<h2 className="mt-1 text-sm font-semibold text-[#17221b]">
						{order.orderStatus} / {order.paymentStatus} /{" "}
						{order.fulfillmentStatus}
					</h2>
				</div>
				<PackageCheck className="size-5 text-[#1d7053]" />
			</div>
			<div className="grid gap-4 p-4 lg:grid-cols-3">
				<form
					className="grid gap-3 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3"
					onSubmit={(event) => {
						event.preventDefault();
						void runOperation(
							() =>
								postJson("/api/admin/fulfillments", {
									orderId: order.orderId,
									...(actionState.defaultWarehouseId
										? { warehouseId: actionState.defaultWarehouseId }
										: {}),
								}),
							"Fulfillment order created.",
						);
					}}
				>
					<div>
						<p className="text-sm font-semibold">Create Fulfillment</p>
						<p className="mt-1 text-xs text-[#65736b]">
							Warehouse {actionState.defaultWarehouseId?.slice(0, 8) ?? "-"}
						</p>
					</div>
					<Button
						htmlType="submit"
						type="primary"
						loading={isRunning}
						disabled={isRunning || !actionState.canCreateFulfillment}
						icon={<PackageCheck size={16} />}
					>
						Create
					</Button>
				</form>

				<form
					className="grid gap-3 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3"
					onSubmit={(event) => {
						event.preventDefault();

						if (!actionState.shippableFulfillmentOrderId) {
							return;
						}

						void runOperation(
							() =>
								postJson(
									`/api/admin/fulfillments/${actionState.shippableFulfillmentOrderId}/ship`,
									{
										providerCode,
										providerName,
										trackingNo,
									},
								),
							"Shipment created.",
						);
					}}
				>
					<div className="grid gap-2">
						<label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
							Carrier
							<Input
								value={providerName}
								onChange={(event) => setProviderName(event.target.value)}
							/>
						</label>
						<label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
							Tracking
							<Input
								value={trackingNo}
								onChange={(event) => setTrackingNo(event.target.value)}
							/>
						</label>
					</div>
					<Button
						htmlType="submit"
						type="primary"
						loading={isRunning}
						disabled={isRunning || !actionState.shippableFulfillmentOrderId}
						icon={<Truck size={16} />}
					>
						Ship
					</Button>
				</form>

				<form
					className="grid gap-3 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3"
					onSubmit={(event) => {
						event.preventDefault();

						if (!actionState.deliverableShipmentId) {
							return;
						}

						void runOperation(
							() =>
								postJson(
									`/api/admin/shipments/${actionState.deliverableShipmentId}/deliver`,
									{
										deliveredAt: new Date().toISOString(),
										description: "Delivered by admin operation",
										location: deliveryLocation,
									},
								),
							"Shipment delivered.",
						);
					}}
				>
					<label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
						Location
						<Input
							value={deliveryLocation}
							onChange={(event) => setDeliveryLocation(event.target.value)}
						/>
					</label>
					<Button
						htmlType="submit"
						type="primary"
						loading={isRunning}
						disabled={isRunning || !actionState.deliverableShipmentId}
						icon={<CheckCircle2 size={16} />}
					>
						Deliver
					</Button>
				</form>
			</div>
			{message ? (
				<div className="border-t border-[#edf1ef] px-4 py-3">
					<Alert
						message={message}
						showIcon
						type={operationState === "failed" ? "error" : "success"}
					/>
				</div>
			) : null}
		</section>
	);
}
