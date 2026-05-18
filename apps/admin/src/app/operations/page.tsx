import Link from "next/link";
import { AlertTriangle, ClipboardList, CreditCard, Warehouse } from "lucide-react";
import { AdminHeaderSwitchPanel } from "@/components/AdminHeaderSwitchPanel";
import {
	buildAdminOperationsPath,
	filterDimensionRows,
	formatDashboardDate,
	normalizeDashboardScopeType,
	selectedDashboardScopeIdForSite,
} from "@/lib/admin-dashboard";
import { loadSiteManagementData } from "@/lib/admin-sites";

type OperationsPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstSearchParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function Metric({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: string | number;
}) {
	return (
		<div className="admin-metric-card p-4">
			<div className="flex items-center gap-2 text-[#1d7053]">
				{icon}
				<p className="text-xs font-bold uppercase tracking-[0.14em]">
					{label}
				</p>
			</div>
			<p className="mt-2 text-2xl font-semibold">{value}</p>
		</div>
	);
}

function RiskList<T>({
	title,
	rows,
	render,
}: {
	title: string;
	rows: T[];
	render: (row: T) => React.ReactNode;
}) {
	return (
		<section className="rounded-sm border border-[#d9e1dc] bg-white p-4">
			<h2 className="text-base font-semibold">{title}</h2>
			<div className="mt-3 grid gap-2">
				{rows.slice(0, 12).map((row, index) => (
					<div
						key={index}
						className="rounded-sm border border-[#edf1ef] p-3 text-sm"
					>
						{render(row)}
					</div>
				))}
				{rows.length === 0 ? (
					<p className="rounded-sm border border-dashed border-[#c9d3cd] p-4 text-sm text-[#65736b]">
						No risk rows are visible for this scope.
					</p>
				) : null}
			</div>
		</section>
	);
}

export default async function AdminOperationsPage({
	searchParams,
}: OperationsPageProps) {
	const params = await searchParams;
	const data = await loadSiteManagementData();
	const selectedSite =
		data.sites.find((site) => site.siteId === firstSearchParam(params.siteId)) ??
		data.sites[0];
	const scopeType = normalizeDashboardScopeType(params.scopeType);
	const orders = selectedSite
		? filterDimensionRows(data.operations.orders, scopeType, selectedSite)
		: [];
	const webhooks = selectedSite
		? filterDimensionRows(
				data.operations.paymentWebhooks,
				scopeType,
				selectedSite,
			)
		: [];
	const locks = selectedSite
		? filterDimensionRows(data.operations.inventoryLocks, scopeType, selectedSite)
		: [];
	const transactions = selectedSite
		? filterDimensionRows(
				data.operations.inventoryTransactions,
				scopeType,
				selectedSite,
			)
		: [];
	const afterSales = selectedSite
		? filterDimensionRows(
				data.operations.afterSalesRequests,
				scopeType,
				selectedSite,
			)
		: [];
	const refunds = selectedSite
		? filterDimensionRows(data.operations.paymentRefunds, scopeType, selectedSite)
		: [];
	const auditLogs = selectedSite
		? filterDimensionRows(data.operations.auditLogs, scopeType, selectedSite)
		: [];

	return (
		<div className="min-h-screen bg-[#f5f7f8] text-[#17221b]">
			<header className="border-b border-[#d9e1dc] bg-white">
				<div className="grid w-full gap-4 px-4 py-5 md:px-6">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<Link
								href="/"
								className="text-xs font-bold uppercase tracking-[0.16em] text-[#1d7053]"
							>
								Commerce OS Admin
							</Link>
							<h1 className="mt-1 text-2xl font-semibold">Operations</h1>
							<p className="mt-1 max-w-2xl text-sm text-[#65736b]">
								Scoped operational risk across orders, payments, inventory,
								after-sales and audit logs.
							</p>
						</div>
						<div className="grid justify-items-end gap-2">
							<AdminHeaderSwitchPanel
								className="lg:min-w-[520px]"
								groups={[
									{
										label: "Site",
										options: data.sites.map((site) => ({
											key: site.siteId,
											label: site.siteName,
											active: site.siteId === selectedSite?.siteId,
											href: buildAdminOperationsPath({
												scopeType,
												...(selectedDashboardScopeIdForSite(scopeType, site)
													? {
															scopeId: selectedDashboardScopeIdForSite(
																scopeType,
																site,
															),
														}
													: {}),
												siteId: site.siteId,
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
												href: buildAdminOperationsPath({
													scopeType: option,
													...(selectedSite &&
													selectedDashboardScopeIdForSite(option, selectedSite)
														? {
																scopeId: selectedDashboardScopeIdForSite(
																	option,
																	selectedSite,
																),
															}
														: {}),
													...(selectedSite ? { siteId: selectedSite.siteId } : {}),
												}),
											}),
										),
									},
								]}
							/>
							<Link
								href="/analytics"
								className="inline-flex h-10 items-center justify-center rounded-sm border border-[#d9e1dc] bg-white px-3 text-sm font-bold text-[#425149] hover:border-[#1d7053]"
							>
								Analytics
							</Link>
						</div>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<Metric
							icon={<ClipboardList className="size-4" />}
							label="Orders"
							value={orders.length}
						/>
						<Metric
							icon={<CreditCard className="size-4" />}
							label="Webhooks"
							value={webhooks.length}
						/>
						<Metric
							icon={<Warehouse className="size-4" />}
							label="Inventory"
							value={locks.length + transactions.length}
						/>
						<Metric
							icon={<AlertTriangle className="size-4" />}
							label="Audit"
							value={auditLogs.length}
						/>
					</div>
				</div>
			</header>

			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<div className="grid gap-5 xl:grid-cols-2">
					<RiskList
						title="Orders"
						rows={orders}
						render={(row) => (
							<div className="flex items-center justify-between gap-3">
								<span className="font-semibold">{row.orderNo}</span>
								<span className="text-xs text-[#65736b]">
									{row.orderStatus} / {row.paymentStatus} /{" "}
									{row.fulfillmentStatus}
								</span>
							</div>
						)}
					/>
					<RiskList
						title="Payment Webhooks"
						rows={webhooks}
						render={(row) => (
							<div className="flex items-center justify-between gap-3">
								<span className="font-semibold">{row.providerEventId}</span>
								<span className="text-xs text-[#65736b]">{row.status}</span>
							</div>
						)}
					/>
					<RiskList
						title="Inventory Locks"
						rows={locks}
						render={(row) => (
							<div className="flex items-center justify-between gap-3">
								<span className="font-semibold">{row.skuId.slice(0, 8)}</span>
								<span className="text-xs text-[#65736b]">
									{`${row.status} / qty ${row.quantity}`}
								</span>
							</div>
						)}
					/>
					<RiskList
						title="Inventory Transactions"
						rows={transactions}
						render={(row) => (
							<div className="flex items-center justify-between gap-3">
								<span className="font-semibold">{row.type}</span>
								<span className="text-xs text-[#65736b]">
									{row.beforeAvailable} {"->"} {row.afterAvailable}
								</span>
							</div>
						)}
					/>
					<RiskList
						title="After-sales Requests"
						rows={afterSales}
						render={(row) => (
							<div className="flex items-center justify-between gap-3">
								<span className="font-semibold">{row.requestNo}</span>
								<span className="text-xs text-[#65736b]">{row.status}</span>
							</div>
						)}
					/>
					<RiskList
						title="Refunds"
						rows={refunds}
						render={(row) => (
							<div className="flex items-center justify-between gap-3">
								<span className="font-semibold">{row.refundNo}</span>
								<span className="text-xs text-[#65736b]">{row.status}</span>
							</div>
						)}
					/>
					<RiskList
						title="Audit Logs"
						rows={auditLogs}
						render={(row) => (
							<div className="flex items-center justify-between gap-3">
								<span className="font-semibold">{row.action}</span>
								<span className="text-xs text-[#65736b]">
									{formatDashboardDate(row.createdAt)}
								</span>
							</div>
						)}
					/>
				</div>
			</main>
		</div>
	);
}
