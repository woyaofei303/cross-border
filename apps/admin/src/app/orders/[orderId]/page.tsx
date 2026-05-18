import Link from "next/link";
import { notFound } from "next/navigation";
import {
	ArrowLeft,
	Boxes,
	ClipboardList,
	CreditCard,
	LockKeyhole,
	ReceiptText,
	RotateCcw,
	Truck,
} from "lucide-react";
import {
	formatCurrency,
	formatDateTime,
	loadAdminOrderDetail,
	orderStatusClassName,
	shortId,
} from "@/lib/admin-orders";
import { AdminFulfillmentActionsPanel } from "@/components/AdminFulfillmentActionsPanel";
import { loadSiteManagementData } from "@/lib/admin-sites";

type OrderDetailPageProps = {
	params: Promise<{ orderId: string }>;
};

function StatusBadge({ status }: { status: string }) {
	return (
		<span
			className={`inline-flex h-7 items-center rounded-sm border px-2 text-xs font-bold ${orderStatusClassName(
				status,
			)}`}
		>
			{status}
		</span>
	);
}

function Section({
	title,
	icon,
	count,
	children,
}: {
	title: string;
	icon: React.ReactNode;
	count?: number;
	children: React.ReactNode;
}) {
	return (
		<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
			<div className="flex items-center justify-between border-b border-[#d9e1dc] px-4 py-3">
				<div className="flex items-center gap-2 text-[#1d7053]">
					{icon}
					<h2 className="text-sm font-semibold text-[#17221b]">{title}</h2>
				</div>
				{typeof count === "number" && (
					<span className="inline-flex h-7 items-center rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] px-2 text-xs font-semibold text-[#425149]">
						{count} rows
					</span>
				)}
			</div>
			{children}
		</section>
	);
}

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3">
			<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
				{label}
			</p>
			<div className="mt-1 break-words text-sm font-semibold text-[#17221b]">
				{value}
			</div>
		</div>
	);
}

function EmptyState({ message }: { message: string }) {
	return <p className="px-4 py-6 text-center text-sm text-[#65736b]">{message}</p>;
}

function JsonBlock({ value }: { value: Record<string, unknown> }) {
	return (
		<pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-sm bg-[#17221b] p-4 text-xs leading-5 text-white">
			{JSON.stringify(value, null, 2)}
		</pre>
	);
}

export default async function AdminOrderDetailPage({
	params,
}: OrderDetailPageProps) {
	const { orderId } = await params;
	const [data, order] = await Promise.all([
		loadSiteManagementData(),
		loadAdminOrderDetail(orderId),
	]);

	if (!order) {
		notFound();
	}

	const site = data.sites.find((item) => item.siteId === order.siteId);
	const totalOperationalRows =
		order.paymentOrders.length +
		order.paymentTransactions.length +
		order.inventoryLocks.length +
		order.inventoryTransactions.length +
		order.fulfillmentOrders.length +
		order.shipments.length +
		order.paymentRefunds.length +
		order.afterSalesRequests.length +
		order.statusLogs.length;

	return (
		<div className="min-h-screen bg-[#f5f7f8] text-[#17221b]">
			<header className="border-b border-[#d9e1dc] bg-white">
				<div className="grid w-full gap-4 px-4 py-5 md:px-6">
					<Link
						href="/orders"
						className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#1d7053]"
					>
						<ArrowLeft className="size-4" />
						Orders
					</Link>
					<div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
								Admin Order Detail
							</p>
							<h1 className="mt-1 text-2xl font-semibold">{order.orderNo}</h1>
							<p className="mt-1 max-w-2xl text-sm text-[#65736b]">
								{site?.siteName ?? shortId(order.siteId)} /{" "}
								{shortId(order.orderId)}
							</p>
						</div>
						<div className="grid gap-2 sm:grid-cols-4">
							<StatusBadge status={order.orderStatus} />
							<StatusBadge status={order.paymentStatus} />
							<StatusBadge status={order.fulfillmentStatus} />
							<StatusBadge status={order.aftersalesStatus} />
						</div>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
						<KeyValue
							label="Total"
							value={formatCurrency(order.totalAmount, order.currency)}
						/>
						<KeyValue label="Items" value={order.items.length} />
						<KeyValue label="Ops Rows" value={totalOperationalRows} />
						<KeyValue label="Created" value={formatDateTime(order.createdAt)} />
						<KeyValue label="Paid" value={formatDateTime(order.paidAt)} />
					</div>
				</div>
			</header>

			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<AdminFulfillmentActionsPanel order={order} />

				<Section
					title="Order Snapshot"
					icon={<ReceiptText className="size-4" />}
				>
					<div className="grid gap-3 p-4 lg:grid-cols-3">
						<KeyValue label="Buyer User" value={shortId(order.cartOrigin.userId)} />
						<KeyValue
							label="Guest Token"
							value={order.cartOrigin.guestToken ?? "-"}
						/>
						<KeyValue
							label="Idempotency"
							value={order.cartOrigin.idempotencyKey}
						/>
						<KeyValue label="Subtotal" value={order.subtotalAmount} />
						<KeyValue label="Discount" value={order.discountAmount} />
						<KeyValue label="Shipping" value={order.shippingAmount} />
					</div>
					<div className="grid gap-4 border-t border-[#edf1ef] p-4 xl:grid-cols-2">
						<div className="grid gap-2">
							<h3 className="text-sm font-semibold">Shipping Snapshot</h3>
							<JsonBlock value={order.shippingAddressSnapshot} />
						</div>
						<div className="grid gap-2">
							<h3 className="text-sm font-semibold">Price Snapshot</h3>
							<JsonBlock value={order.priceSnapshot} />
						</div>
					</div>
				</Section>

				<Section
					title="Items"
					icon={<Boxes className="size-4" />}
					count={order.items.length}
				>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[920px] border-collapse text-left text-sm">
							<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
								<tr>
									<th className="px-4 py-3 font-bold">Product</th>
									<th className="px-4 py-3 font-bold">SKU</th>
									<th className="px-4 py-3 font-bold">Unit</th>
									<th className="px-4 py-3 font-bold">Qty</th>
									<th className="px-4 py-3 font-bold">Total</th>
									<th className="px-4 py-3 font-bold">Snapshot</th>
								</tr>
							</thead>
							<tbody>
								{order.items.map((item) => (
									<tr key={item.orderItemId} className="border-t border-[#edf1ef]">
										<td className="px-4 py-3">
											<p className="font-semibold">{item.productTitle}</p>
											<p className="text-xs text-[#65736b]">
												{shortId(item.productId)}
											</p>
										</td>
										<td className="px-4 py-3">
											<p className="font-medium">{item.skuCode}</p>
											<p className="text-xs text-[#65736b]">{item.skuTitle}</p>
										</td>
										<td className="px-4 py-3">{item.unitPrice}</td>
										<td className="px-4 py-3">{item.quantity}</td>
										<td className="px-4 py-3 font-semibold">
											{item.totalAmount}
										</td>
										<td className="px-4 py-3 text-xs text-[#65736b]">
											{Object.keys(item.snapshot).join(", ") || "-"}
										</td>
									</tr>
								))}
								{order.items.length === 0 && (
									<tr>
										<td colSpan={6}>
											<EmptyState message="No item snapshots are available." />
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</Section>

				<div className="grid gap-5 xl:grid-cols-2">
					<Section
						title="Payments"
						icon={<CreditCard className="size-4" />}
						count={order.paymentOrders.length + order.paymentTransactions.length}
					>
						<div className="grid gap-3 p-4">
							{order.paymentOrders.map((payment) => (
								<div
									key={payment.paymentOrderId}
									className="grid gap-2 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3"
								>
									<div className="flex items-center justify-between gap-3">
										<div>
											<p className="font-semibold">{payment.paymentNo}</p>
											<p className="text-xs text-[#65736b]">
												{payment.channelCode} / {payment.idempotencyKey}
											</p>
										</div>
										<StatusBadge status={payment.status} />
									</div>
									<div className="grid gap-2 text-sm sm:grid-cols-3">
										<span>{formatCurrency(payment.amount, payment.currency)}</span>
										<span>provider: {payment.providerPaymentId ?? "-"}</span>
										<span>{formatDateTime(payment.createdAt)}</span>
									</div>
								</div>
							))}
							{order.paymentTransactions.map((transaction) => (
								<div
									key={transaction.paymentTransactionId}
									className="grid gap-2 rounded-sm border border-[#d9e1dc] p-3 text-sm"
								>
									<div className="flex items-center justify-between gap-3">
										<span className="font-semibold">
											{transaction.transactionType} /{" "}
											{shortId(transaction.paymentOrderId)}
										</span>
										<StatusBadge status={transaction.status} />
									</div>
									<p className="break-all text-xs text-[#65736b]">
										{transaction.providerTransactionId}
									</p>
								</div>
							))}
							{order.paymentOrders.length === 0 &&
								order.paymentTransactions.length === 0 && (
									<EmptyState message="No payment records are available." />
								)}
						</div>
					</Section>

					<Section
						title="Inventory"
						icon={<LockKeyhole className="size-4" />}
						count={order.inventoryLocks.length + order.inventoryTransactions.length}
					>
						<div className="grid gap-3 p-4">
							{order.inventoryLocks.map((lock) => (
								<div
									key={lock.inventoryLockId}
									className="grid gap-2 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3"
								>
									<div className="flex items-center justify-between gap-3">
										<span className="font-semibold">
											{shortId(lock.skuId)} / qty {lock.quantity}
										</span>
										<StatusBadge status={lock.status} />
									</div>
									<p className="text-xs text-[#65736b]">
										expires {formatDateTime(lock.expiresAt)} /{" "}
										{lock.idempotencyKey}
									</p>
								</div>
							))}
							{order.inventoryTransactions.slice(0, 6).map((transaction) => (
								<div
									key={transaction.inventoryTransactionId}
									className="rounded-sm border border-[#d9e1dc] p-3 text-sm"
								>
									<p className="font-semibold">
										{transaction.type} / qty {transaction.quantity}
									</p>
									<p className="text-xs text-[#65736b]">
										available {transaction.beforeAvailable} to{" "}
										{transaction.afterAvailable}, locked{" "}
										{transaction.beforeLocked} to {transaction.afterLocked}
									</p>
								</div>
							))}
							{order.inventoryLocks.length === 0 &&
								order.inventoryTransactions.length === 0 && (
									<EmptyState message="No inventory records are available." />
								)}
						</div>
					</Section>
				</div>

				<div className="grid gap-5 xl:grid-cols-2">
					<Section
						title="Fulfillment"
						icon={<Truck className="size-4" />}
						count={order.fulfillmentOrders.length + order.shipments.length}
					>
						<div className="grid gap-3 p-4">
							{order.fulfillmentOrders.map((fulfillment) => (
								<div
									key={fulfillment.fulfillmentOrderId}
									className="grid gap-2 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3"
								>
									<div className="flex items-center justify-between gap-3">
										<span className="font-semibold">
											{fulfillment.fulfillmentNo}
										</span>
										<StatusBadge status={fulfillment.status} />
									</div>
									<p className="text-xs text-[#65736b]">
										items {fulfillment.itemCount} / warehouse{" "}
										{shortId(fulfillment.warehouseId)}
									</p>
								</div>
							))}
							{order.shipments.map((shipment) => (
								<div
									key={shipment.shipmentId}
									className="grid gap-2 rounded-sm border border-[#d9e1dc] p-3"
								>
									<div className="flex items-center justify-between gap-3">
										<span className="font-semibold">
											{shipment.providerCode} / {shipment.trackingNo}
										</span>
										<StatusBadge status={shipment.status} />
									</div>
									<p className="text-xs text-[#65736b]">
										{shipment.providerName} / delivered{" "}
										{formatDateTime(shipment.deliveredAt)}
									</p>
								</div>
							))}
							{order.fulfillmentOrders.length === 0 &&
								order.shipments.length === 0 && (
									<EmptyState message="No fulfillment records are available." />
								)}
						</div>
					</Section>

					<Section
						title="Aftersales & Refunds"
						icon={<RotateCcw className="size-4" />}
						count={order.afterSalesRequests.length + order.paymentRefunds.length}
					>
						<div className="grid gap-3 p-4">
							{order.afterSalesRequests.map((request) => (
								<div
									key={request.afterSalesRequestId}
									className="grid gap-2 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3"
								>
									<div className="flex items-center justify-between gap-3">
										<Link
											href={`/after-sales/${request.afterSalesRequestId}`}
											className="font-semibold text-[#1d7053]"
										>
											{request.requestNo}
										</Link>
										<StatusBadge status={request.status} />
									</div>
									<p className="text-xs text-[#65736b]">
										{request.type} / {request.reason}
									</p>
								</div>
							))}
							{order.paymentRefunds.map((refund) => (
								<div
									key={refund.refundId}
									className="grid gap-2 rounded-sm border border-[#d9e1dc] p-3"
								>
									<div className="flex items-center justify-between gap-3">
										<span className="font-semibold">{refund.refundNo}</span>
										<StatusBadge status={refund.status} />
									</div>
									<p className="text-xs text-[#65736b]">
										{formatCurrency(refund.amount, refund.currency)} / provider{" "}
										{refund.providerRefundId ?? "-"}
									</p>
								</div>
							))}
							{order.afterSalesRequests.length === 0 &&
								order.paymentRefunds.length === 0 && (
									<EmptyState message="No after-sales or refund records are available." />
								)}
						</div>
					</Section>
				</div>

				<Section
					title="Status Logs"
					icon={<ClipboardList className="size-4" />}
					count={order.statusLogs.length}
				>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[900px] border-collapse text-left text-sm">
							<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
								<tr>
									<th className="px-4 py-3 font-bold">Type</th>
									<th className="px-4 py-3 font-bold">From</th>
									<th className="px-4 py-3 font-bold">To</th>
									<th className="px-4 py-3 font-bold">Operator</th>
									<th className="px-4 py-3 font-bold">Reason</th>
									<th className="px-4 py-3 font-bold">Created</th>
								</tr>
							</thead>
							<tbody>
								{order.statusLogs.map((log) => (
									<tr key={log.statusLogId} className="border-t border-[#edf1ef]">
										<td className="px-4 py-3 font-semibold">{log.statusType}</td>
										<td className="px-4 py-3">{log.fromStatus ?? "-"}</td>
										<td className="px-4 py-3">
											<StatusBadge status={log.toStatus} />
										</td>
										<td className="px-4 py-3">{log.operatorType}</td>
										<td className="px-4 py-3">{log.reason ?? "-"}</td>
										<td className="px-4 py-3">
											{formatDateTime(log.createdAt)}
										</td>
									</tr>
								))}
								{order.statusLogs.length === 0 && (
									<tr>
										<td colSpan={6}>
											<EmptyState message="No status logs are available." />
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</Section>
			</main>
		</div>
	);
}
