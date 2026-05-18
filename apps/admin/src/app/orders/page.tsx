import Link from "next/link";
import {
	ArrowUpRight,
	BadgeDollarSign,
	Boxes,
	ClipboardList,
	Globe2,
	Search,
	ShieldCheck,
	Truck,
} from "lucide-react";
import {
	AdminPagination,
	AdminQueryPanel,
	AdminResourceTable,
} from "@/components/AdminListControls";
import { AdminHeaderSwitchPanel } from "@/components/AdminHeaderSwitchPanel";
import {
	buildAdminListPath,
	hasTextMatch,
	isWithinDateRange,
	normalizePage,
	normalizePageSize,
	normalizeQuery,
	paginateRows,
} from "@/lib/admin-list-controls";
import { loadSiteManagementData } from "@/lib/admin-sites";
import {
	formatCurrency,
	formatDateTime,
	getSiteForOrder,
	loadAdminOrders,
	normalizeOrderScopeType,
	orderStatusClassName,
	selectedScopeIdForSite,
	shortId,
} from "@/lib/admin-orders";

type OrdersPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstSearchParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

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

export default async function AdminOrdersPage({
	searchParams,
}: OrdersPageProps) {
	const params = await searchParams;
	const query = normalizeQuery(params.query);
	const orderStatusFilter = firstSearchParam(params.orderStatus) ?? "";
	const paymentStatusFilter = firstSearchParam(params.paymentStatus) ?? "";
	const fulfillmentStatusFilter = firstSearchParam(params.fulfillmentStatus) ?? "";
	const dateFrom = firstSearchParam(params.dateFrom) ?? "";
	const dateTo = firstSearchParam(params.dateTo) ?? "";
	const page = normalizePage(params.page);
	const pageSize = normalizePageSize(params.pageSize);
	const data = await loadSiteManagementData();
	const selectedSite =
		data.sites.find((site) => site.siteId === firstSearchParam(params.siteId)) ??
		data.sites[0];
	const scopeType = normalizeOrderScopeType(params.scopeType);
	const scopeId =
		firstSearchParam(params.scopeId) ??
		(selectedSite ? selectedScopeIdForSite(scopeType, selectedSite) : undefined);
	const orders = await loadAdminOrders({
		scopeType,
		...(scopeId ? { scopeId } : {}),
		limit: 100,
	});
	const filteredOrders = orders.filter((order) => {
		const site = getSiteForOrder(data, order);
		const matchesText = hasTextMatch(
			[
				order.orderNo,
				order.orderId,
				order.userId,
				order.guestToken,
				order.latestPaymentOrder?.paymentNo,
				site?.siteName,
				site?.verticalCode,
			],
			query,
		);
		const matchesOrderStatus = orderStatusFilter
			? order.orderStatus === orderStatusFilter
			: true;
		const matchesPaymentStatus = paymentStatusFilter
			? order.paymentStatus === paymentStatusFilter
			: true;
		const matchesFulfillmentStatus = fulfillmentStatusFilter
			? order.fulfillmentStatus === fulfillmentStatusFilter
			: true;

		return (
			matchesText &&
			matchesOrderStatus &&
			matchesPaymentStatus &&
			matchesFulfillmentStatus &&
			isWithinDateRange(order.createdAt, dateFrom, dateTo)
		);
	});
	const pagination = paginateRows(filteredOrders, { page, pageSize });
	const paidOrderCount = filteredOrders.filter(
		(order) => order.paymentStatus === "paid",
	).length;
	const activeLockRiskCount = filteredOrders.filter((order) =>
		["pending_payment", "payment_processing"].includes(order.orderStatus),
	).length;
	const orderTotal = filteredOrders.reduce(
		(total, order) => total + Number(order.totalAmount),
		0,
	);
	const currency = orders[0]?.currency ?? selectedSite?.defaultCurrency ?? "USD";

	return (
		<div className="min-h-screen bg-[#f5f7f8] text-[#17221b]">
			<header className="border-b border-[#d9e1dc] bg-white">
				<div className="flex w-full flex-col gap-4 px-4 py-5 md:px-6">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<Link
								href="/"
								className="text-xs font-bold uppercase tracking-[0.16em] text-[#1d7053]"
							>
								Commerce OS Admin
							</Link>
							<h1 className="mt-1 text-2xl font-semibold">Orders</h1>
							<p className="mt-1 max-w-2xl text-sm text-[#65736b]">
								Scoped operational list for order, payment, fulfillment and
								aftersales state.
							</p>
						</div>
						<AdminHeaderSwitchPanel
							className="lg:min-w-[520px]"
							groups={[
								{
									label: "Site",
									options: data.sites.map((site) => ({
										key: site.siteId,
										label: site.siteName,
										active: site.siteId === selectedSite?.siteId,
										href: buildAdminListPath("/orders", {
											scopeType,
											...(selectedScopeIdForSite(scopeType, site)
												? {
														scopeId: selectedScopeIdForSite(scopeType, site),
													}
												: {}),
											limit: 100,
											siteId: site.siteId,
											query,
											orderStatus: orderStatusFilter,
											paymentStatus: paymentStatusFilter,
											fulfillmentStatus: fulfillmentStatusFilter,
											dateFrom,
											dateTo,
											pageSize,
										}),
									})),
								},
								{
									label: "Data Scope",
									options: (["global", "vertical", "brand", "site"] as const).map(
										(option) => ({
											key: option,
											label: option,
											active: scopeType === option,
											href: buildAdminListPath("/orders", {
												scopeType: option,
												...(selectedSite &&
												selectedScopeIdForSite(option, selectedSite)
													? {
															scopeId: selectedScopeIdForSite(
																option,
																selectedSite,
															),
														}
													: {}),
												...(selectedSite ? { siteId: selectedSite.siteId } : {}),
												limit: 100,
												query,
												orderStatus: orderStatusFilter,
												paymentStatus: paymentStatusFilter,
												fulfillmentStatus: fulfillmentStatusFilter,
												dateFrom,
												dateTo,
												pageSize,
											}),
										}),
									),
								},
							]}
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<div className="admin-metric-card p-4">
							<div className="flex items-center gap-2 text-[#1d7053]">
								<ClipboardList className="size-4" />
								<p className="text-xs font-bold uppercase tracking-[0.14em]">
									Orders
								</p>
							</div>
							<p className="mt-2 text-2xl font-semibold">{filteredOrders.length}</p>
						</div>
						<div className="admin-metric-card p-4">
							<div className="flex items-center gap-2 text-[#1d7053]">
								<BadgeDollarSign className="size-4" />
								<p className="text-xs font-bold uppercase tracking-[0.14em]">
									Paid
								</p>
							</div>
							<p className="mt-2 text-2xl font-semibold">{paidOrderCount}</p>
						</div>
						<div className="admin-metric-card p-4">
							<div className="flex items-center gap-2 text-[#1d7053]">
								<ShieldCheck className="size-4" />
								<p className="text-xs font-bold uppercase tracking-[0.14em]">
									Open Payment
								</p>
							</div>
							<p className="mt-2 text-2xl font-semibold">{activeLockRiskCount}</p>
						</div>
						<div className="admin-metric-card p-4">
							<div className="flex items-center gap-2 text-[#1d7053]">
								<Globe2 className="size-4" />
								<p className="text-xs font-bold uppercase tracking-[0.14em]">
									Total
								</p>
							</div>
							<p className="mt-2 text-2xl font-semibold">
								{formatCurrency(orderTotal, currency)}
							</p>
						</div>
					</div>
				</div>
			</header>

			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<AdminResourceTable
					columns={[
						{
							key: "order",
							header: "Order",
							cell: (order) => (
								<>
									<p className="font-semibold">{order.orderNo}</p>
									<p className="text-xs text-[#65736b]">
										{formatDateTime(order.createdAt)}
									</p>
								</>
							),
						},
						{
							key: "site",
							header: "Site",
							cell: (order) => {
								const site = getSiteForOrder(data, order);

								return (
									<>
										<p className="font-medium">
											{site?.siteName ?? shortId(order.siteId)}
										</p>
										<p className="text-xs text-[#65736b]">
											{site?.verticalCode ?? shortId(order.verticalId)}
										</p>
									</>
								);
							},
						},
						{
							key: "payment",
							header: "Payment",
							cell: (order) => (
								<div className="grid gap-1">
									<StatusBadge status={order.paymentStatus} />
									<p className="text-xs text-[#65736b]">
										{order.latestPaymentOrder?.paymentNo ?? "no payment"}
									</p>
								</div>
							),
						},
						{
							key: "fulfillment",
							header: "Fulfillment",
							cell: (order) => (
								<div className="grid gap-1">
									<StatusBadge status={order.fulfillmentStatus} />
									<p className="text-xs text-[#65736b]">{order.orderStatus}</p>
								</div>
							),
						},
						{
							key: "aftersales",
							header: "Aftersales",
							cell: (order) => <StatusBadge status={order.aftersalesStatus} />,
						},
						{
							key: "total",
							header: "Total",
							className: "font-semibold",
							cell: (order) => formatCurrency(order.totalAmount, order.currency),
						},
						{
							key: "records",
							header: "Records",
							cell: (order) => (
								<div className="flex items-center gap-3 text-xs text-[#65736b]">
									<span className="inline-flex items-center gap-1">
										<Boxes className="size-3.5" />
										{order.itemCount}
									</span>
									<span className="inline-flex items-center gap-1">
										<Truck className="size-3.5" />
										{order.statusLogCount}
									</span>
								</div>
							),
						},
						{
							key: "open",
							header: "Open",
							cell: (order) => (
								<Link
									href={`/orders/${order.orderId}`}
									className="inline-flex h-9 items-center gap-2 rounded-sm bg-[#1d7053] px-3 text-sm font-semibold text-white"
								>
									Detail
									<ArrowUpRight className="size-4" />
								</Link>
							),
						},
					]}
					emptyMessage="No orders are visible for the selected admin scope."
					minWidth={1040}
					pagination={
						<AdminPagination
							end={pagination.end}
							page={pagination.page}
							pageSize={pagination.pageSize}
							params={{
								scopeType,
								...(scopeId ? { scopeId } : {}),
								...(selectedSite ? { siteId: selectedSite.siteId } : {}),
								limit: 100,
								query,
								orderStatus: orderStatusFilter,
								paymentStatus: paymentStatusFilter,
								fulfillmentStatus: fulfillmentStatusFilter,
								dateFrom,
								dateTo,
							}}
							pathname="/orders"
							start={pagination.start}
							total={pagination.total}
							totalPages={pagination.totalPages}
						/>
					}
					queryPanel={
						<AdminQueryPanel
							action="/orders"
							clearHref={buildAdminListPath("/orders", {
								scopeType,
								...(scopeId ? { scopeId } : {}),
								...(selectedSite ? { siteId: selectedSite.siteId } : {}),
								limit: 100,
							})}
							fields={[
								{
									name: "query",
									label: "Search",
									type: "search",
									value: query,
									placeholder: "order no, payment no, buyer",
								},
								{
									name: "orderStatus",
									label: "Order Status",
									type: "select",
									value: orderStatusFilter,
									options: [
										{ label: "All", value: "" },
										{ label: "Pending Payment", value: "pending_payment" },
										{ label: "Payment Processing", value: "payment_processing" },
										{ label: "Paid", value: "paid" },
										{ label: "Confirmed", value: "confirmed" },
										{ label: "Fulfilled", value: "fulfilled" },
										{ label: "Completed", value: "completed" },
										{ label: "Cancelled", value: "cancelled" },
										{ label: "Closed", value: "closed" },
									],
								},
								{
									name: "paymentStatus",
									label: "Payment",
									type: "select",
									value: paymentStatusFilter,
									options: [
										{ label: "All", value: "" },
										{ label: "Unpaid", value: "unpaid" },
										{ label: "Processing", value: "processing" },
										{ label: "Paid", value: "paid" },
										{ label: "Failed", value: "failed" },
										{ label: "Partially Refunded", value: "partially_refunded" },
										{ label: "Refunded", value: "refunded" },
										{ label: "Chargeback", value: "chargeback" },
									],
								},
								{
									name: "fulfillmentStatus",
									label: "Fulfillment",
									type: "select",
									value: fulfillmentStatusFilter,
									options: [
										{ label: "All", value: "" },
										{ label: "Unfulfilled", value: "unfulfilled" },
										{ label: "Pending", value: "pending" },
										{ label: "Shipped", value: "shipped" },
										{ label: "Partially Shipped", value: "partially_shipped" },
										{ label: "Delivered", value: "delivered" },
										{ label: "Failed", value: "failed" },
									],
								},
								{
									name: "dateFrom",
									label: "Created From",
									type: "date",
									value: dateFrom,
								},
								{
									name: "dateTo",
									label: "Created To",
									type: "date",
									value: dateTo,
								},
								{
									name: "pageSize",
									label: "Rows",
									type: "select",
									value: String(pageSize),
									options: [
										{ label: "10", value: "10" },
										{ label: "20", value: "20" },
										{ label: "50", value: "50" },
									],
								},
							]}
							hiddenFields={{
								scopeType,
								...(scopeId ? { scopeId } : {}),
								...(selectedSite ? { siteId: selectedSite.siteId } : {}),
								limit: 100,
							}}
						/>
					}
					rowKey={(order) => order.orderId}
					rows={pagination.rows}
					subtitle={
						<span className="inline-flex items-center gap-2">
							{scopeType} {scopeId ? `/ ${shortId(scopeId)}` : ""}
							<span className="inline-flex h-8 items-center gap-2 rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] px-2 text-xs font-semibold text-[#65736b]">
								<Search className="size-4" />
								Backend-scoped query
							</span>
						</span>
					}
					title="Scoped Results"
				/>
			</main>
		</div>
	);
}
