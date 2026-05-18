import Link from "next/link";
import { notFound } from "next/navigation";
import {
	ClipboardList,
	CircleDollarSign,
	PackageSearch,
	RotateCcw,
} from "lucide-react";
import { AdminAfterSalesActionsPanel } from "@/components/AdminAfterSalesActionsPanel";
import {
	afterSalesStatusClassName,
	formatCurrency,
	formatDateTime,
	loadAdminAfterSalesRequestDetail,
	shortId,
} from "@/lib/admin-aftersales";

type AfterSalesDetailPageProps = {
	params: Promise<{ requestId: string }>;
};

function StatusBadge({ status }: { status: string }) {
	return (
		<span
			className={`inline-flex h-7 items-center rounded-sm border px-2 text-xs font-bold ${afterSalesStatusClassName(
				status,
			)}`}
		>
			{status}
		</span>
	);
}

function EmptyState({ message }: { message: string }) {
	return <p className="px-4 py-6 text-sm text-[#65736b]">{message}</p>;
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
			<div className="flex items-center justify-between gap-3 border-b border-[#d9e1dc] px-4 py-3">
				<div className="flex items-center gap-2 text-[#1d7053]">
					{icon}
					<h2 className="text-base font-semibold text-[#17221b]">{title}</h2>
				</div>
				{count !== undefined ? (
					<span className="rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] px-2 py-1 text-xs font-bold text-[#425149]">
						{count} rows
					</span>
				) : null}
			</div>
			{children}
		</section>
	);
}

export default async function AdminAfterSalesDetailPage({
	params,
}: AfterSalesDetailPageProps) {
	const { requestId } = await params;
	const request = await loadAdminAfterSalesRequestDetail(requestId);

	if (!request) {
		notFound();
	}

	return (
		<div className="min-h-screen bg-[#f5f7f8] text-[#17221b]">
			<header className="border-b border-[#d9e1dc] bg-white">
				<div className="flex w-full flex-col gap-4 px-4 py-5 md:px-6">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<Link
								href="/after-sales"
								className="text-xs font-bold uppercase tracking-[0.16em] text-[#1d7053]"
							>
								After-sales
							</Link>
							<h1 className="mt-1 text-2xl font-semibold">
								{request.requestNo}
							</h1>
							<p className="mt-1 text-sm text-[#65736b]">
								{request.type} / {request.orderNo} / {shortId(request.siteId)}
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<StatusBadge status={request.status} />
							<StatusBadge status={request.order.paymentStatus} />
							<StatusBadge status={request.order.aftersalesStatus} />
						</div>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<div className="admin-metric-card p-4">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								Requested
							</p>
							<p className="mt-2 text-2xl font-semibold">
								{formatCurrency(request.requestedAmount, request.currency)}
							</p>
						</div>
						<div className="admin-metric-card p-4">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								Approved
							</p>
							<p className="mt-2 text-2xl font-semibold">
								{formatCurrency(request.approvedAmount, request.currency)}
							</p>
						</div>
						<div className="admin-metric-card p-4">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								Refunds
							</p>
							<p className="mt-2 text-2xl font-semibold">
								{request.refunds.length}
							</p>
						</div>
						<div className="admin-metric-card p-4">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								Updated
							</p>
							<p className="mt-2 text-lg font-semibold">
								{formatDateTime(request.updatedAt)}
							</p>
						</div>
					</div>
				</div>
			</header>

			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<AdminAfterSalesActionsPanel request={request} />

				<section className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
					<Section
						title="Order Context"
						icon={<PackageSearch className="size-4" />}
					>
						<div className="grid gap-3 p-4 text-sm">
							<div className="flex items-center justify-between gap-3">
								<Link
									href={`/orders/${request.orderId}`}
									className="font-semibold text-[#1d7053]"
								>
									{request.orderNo}
								</Link>
								<StatusBadge status={request.order.orderStatus} />
							</div>
							<p className="text-[#65736b]">
								Payment {request.order.paymentStatus} / Fulfillment{" "}
								{request.order.fulfillmentStatus}
							</p>
							<p className="font-semibold">
								{formatCurrency(
									request.order.totalAmount,
									request.order.currency,
								)}
							</p>
							<p className="text-xs text-[#65736b]">
								Buyer {request.order.userId ?? request.order.guestToken ?? "-"}
							</p>
						</div>
					</Section>

					<Section
						title="Request Reason"
						icon={<RotateCcw className="size-4" />}
					>
						<div className="grid gap-3 p-4 text-sm">
							<p className="font-semibold">{request.reason}</p>
							<p className="text-[#65736b]">
								Created {formatDateTime(request.createdAt)}
							</p>
						</div>
					</Section>
				</section>

				<Section
					title="Requested Items"
					icon={<PackageSearch className="size-4" />}
					count={request.items.length}
				>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[820px] border-collapse text-left text-sm">
							<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
								<tr>
									<th className="px-4 py-3 font-bold">Item</th>
									<th className="px-4 py-3 font-bold">SKU</th>
									<th className="px-4 py-3 font-bold">Qty</th>
									<th className="px-4 py-3 font-bold">Requested</th>
									<th className="px-4 py-3 font-bold">Approved</th>
								</tr>
							</thead>
							<tbody>
								{request.items.map((item) => (
									<tr
										key={item.afterSalesItemId}
										className="border-t border-[#edf1ef]"
									>
										<td className="px-4 py-3">
											<p className="font-semibold">
												{item.productTitle ?? shortId(item.orderItemId)}
											</p>
											<p className="text-xs text-[#65736b]">
												{shortId(item.orderItemId)}
											</p>
										</td>
										<td className="px-4 py-3">
											<p className="font-semibold">{item.skuCode ?? "-"}</p>
											<p className="text-xs text-[#65736b]">
												{item.skuTitle ?? "-"}
											</p>
										</td>
										<td className="px-4 py-3 font-mono">{item.quantity}</td>
										<td className="px-4 py-3">
											{formatCurrency(item.requestedAmount, request.currency)}
										</td>
										<td className="px-4 py-3">
											{formatCurrency(item.approvedAmount, request.currency)}
										</td>
									</tr>
								))}
								{request.items.length === 0 && (
									<tr>
										<td
											colSpan={5}
											className="px-4 py-8 text-center text-sm text-[#65736b]"
										>
											No request items are available.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</Section>

				<section className="grid gap-5 xl:grid-cols-2">
					<Section
						title="Payment Refunds"
						icon={<CircleDollarSign className="size-4" />}
						count={request.refunds.length}
					>
						<div className="grid gap-3 p-4">
							{request.refunds.map((refund) => (
								<div
									key={refund.refundId}
									className="grid gap-2 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3"
								>
									<div className="flex items-center justify-between gap-3">
										<span className="font-semibold">{refund.refundNo}</span>
										<StatusBadge status={refund.status} />
									</div>
									<p className="text-sm font-semibold">
										{formatCurrency(refund.amount, refund.currency)}
									</p>
									<p className="font-mono text-xs text-[#65736b]">
										{refund.providerRefundId ?? refund.idempotencyKey}
									</p>
								</div>
							))}
							{request.refunds.length === 0 && (
								<EmptyState message="No payment refunds are linked yet." />
							)}
						</div>
					</Section>

					<Section
						title="After-sales Logs"
						icon={<ClipboardList className="size-4" />}
						count={request.logs.length}
					>
						<div className="grid gap-3 p-4">
							{request.logs.map((log) => (
								<div
									key={log.afterSalesLogId}
									className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3"
								>
									<div className="flex items-center justify-between gap-3">
										<p className="font-semibold">{log.action}</p>
										<p className="text-xs text-[#65736b]">
											{formatDateTime(log.createdAt)}
										</p>
									</div>
									<p className="mt-1 text-sm text-[#65736b]">
										{log.fromStatus ?? "-"} {"->"} {log.toStatus ?? "-"} /{" "}
										{log.operatorType}
									</p>
									{log.note ? (
										<p className="mt-1 text-sm text-[#425149]">{log.note}</p>
									) : null}
								</div>
							))}
							{request.logs.length === 0 && (
								<EmptyState message="No after-sales logs are available." />
							)}
						</div>
					</Section>
				</section>
			</main>
		</div>
	);
}
