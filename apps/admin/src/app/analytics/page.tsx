import Link from "next/link";
import { BarChart3, CircleDollarSign, PackageSearch, Users } from "lucide-react";
import { AdminHeaderSwitchPanel } from "@/components/AdminHeaderSwitchPanel";
import {
	buildAdminAnalyticsPath,
	filterAnalyticsRows,
	formatDashboardMoney,
	normalizeDashboardScopeType,
	selectedDashboardScopeIdForSite,
	sumMoney,
} from "@/lib/admin-dashboard";
import { loadSiteManagementData } from "@/lib/admin-sites";

type AnalyticsPageProps = {
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

export default async function AdminAnalyticsPage({
	searchParams,
}: AnalyticsPageProps) {
	const params = await searchParams;
	const data = await loadSiteManagementData();
	const selectedSite =
		data.sites.find((site) => site.siteId === firstSearchParam(params.siteId)) ??
		data.sites[0];
	const scopeType = normalizeDashboardScopeType(params.scopeType);
	const dailySales = selectedSite
		? filterAnalyticsRows(data.analytics.dailySales, scopeType, selectedSite)
		: [];
	const channelPerformance = selectedSite
		? filterAnalyticsRows(
				data.analytics.channelPerformance,
				scopeType,
				selectedSite,
			)
		: [];
	const productPerformance = selectedSite
		? filterAnalyticsRows(
				data.analytics.productPerformance,
				scopeType,
				selectedSite,
			)
		: [];
	const customerLtv = selectedSite
		? filterAnalyticsRows(data.analytics.customerLtv, scopeType, selectedSite)
		: [];
	const currency = selectedSite?.defaultCurrency ?? "USD";

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
							<h1 className="mt-1 text-2xl font-semibold">Analytics</h1>
							<p className="mt-1 max-w-2xl text-sm text-[#65736b]">
								Scoped sales, channel, product and customer LTV projections.
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
											href: buildAdminAnalyticsPath({
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
												href: buildAdminAnalyticsPath({
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
								href="/operations"
								className="inline-flex h-10 items-center justify-center rounded-sm border border-[#d9e1dc] bg-white px-3 text-sm font-bold text-[#425149] hover:border-[#1d7053]"
							>
								Operations
							</Link>
						</div>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<Metric
							icon={<CircleDollarSign className="size-4" />}
							label="GMV"
							value={formatDashboardMoney(
								String(sumMoney(dailySales, "gmvAmount")),
								currency,
							)}
						/>
						<Metric
							icon={<BarChart3 className="size-4" />}
							label="Orders"
							value={dailySales.reduce((sum, row) => sum + row.orderCount, 0)}
						/>
						<Metric
							icon={<PackageSearch className="size-4" />}
							label="Products"
							value={productPerformance.length}
						/>
						<Metric
							icon={<Users className="size-4" />}
							label="Customers"
							value={customerLtv.length}
						/>
					</div>
				</div>
			</header>

			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<section className="grid gap-5 xl:grid-cols-2">
					<div className="rounded-sm border border-[#d9e1dc] bg-white p-4">
						<h2 className="text-base font-semibold">Daily Sales</h2>
						<div className="mt-3 grid gap-2">
							{dailySales.map((row) => (
								<div
									key={`${row.scopeType}-${row.scopeKey}-${row.statDate}`}
									className="flex items-center justify-between rounded-sm border border-[#edf1ef] p-3 text-sm"
								>
									<span>{row.statDate}</span>
									<span className="font-semibold">
										{`${formatDashboardMoney(row.gmvAmount, row.currency)} / ${
											row.orderCount
										} orders`}
									</span>
								</div>
							))}
							{dailySales.length === 0 ? (
								<p className="rounded-sm border border-dashed border-[#c9d3cd] p-4 text-sm text-[#65736b]">
									No projected daily sales are available for this scope.
								</p>
							) : null}
						</div>
					</div>

					<div className="rounded-sm border border-[#d9e1dc] bg-white p-4">
						<h2 className="text-base font-semibold">Channel Performance</h2>
						<div className="mt-3 grid gap-2">
							{channelPerformance.map((row) => (
								<div
									key={`${row.statDate}-${row.channelCode}-${row.scopeKey}`}
									className="flex items-center justify-between rounded-sm border border-[#edf1ef] p-3 text-sm"
								>
									<span>{row.channelCode}</span>
									<span className="font-semibold">
										{formatDashboardMoney(row.netSalesAmount, row.currency)}
									</span>
								</div>
							))}
							{channelPerformance.length === 0 ? (
								<p className="rounded-sm border border-dashed border-[#c9d3cd] p-4 text-sm text-[#65736b]">
									No channel rows are available for this scope.
								</p>
							) : null}
						</div>
					</div>

					<div className="rounded-sm border border-[#d9e1dc] bg-white p-4">
						<h2 className="text-base font-semibold">Product Performance</h2>
						<div className="mt-3 grid gap-2">
							{productPerformance.map((row) => (
								<div
									key={`${row.productId}-${row.skuId}-${row.scopeKey}`}
									className="flex items-center justify-between rounded-sm border border-[#edf1ef] p-3 text-sm"
								>
									<span>{row.skuId.slice(0, 8)}</span>
									<span className="font-semibold">
										{`${row.unitsSold} units / ${formatDashboardMoney(
											row.gmvAmount,
											row.currency,
										)}`}
									</span>
								</div>
							))}
							{productPerformance.length === 0 ? (
								<p className="rounded-sm border border-dashed border-[#c9d3cd] p-4 text-sm text-[#65736b]">
									No product projection rows are available for this scope.
								</p>
							) : null}
						</div>
					</div>

					<div className="rounded-sm border border-[#d9e1dc] bg-white p-4">
						<h2 className="text-base font-semibold">Customer LTV</h2>
						<div className="mt-3 grid gap-2">
							{customerLtv.map((row) => (
								<div
									key={`${row.customerIdentityType}-${row.customerIdentityKey}-${row.scopeKey}`}
									className="flex items-center justify-between rounded-sm border border-[#edf1ef] p-3 text-sm"
								>
									<span>{row.customerIdentityKey.slice(0, 12)}</span>
									<span className="font-semibold">
										{`${row.orderCount} orders / ${formatDashboardMoney(
											row.netSalesAmount,
											row.currency,
										)}`}
									</span>
								</div>
							))}
							{customerLtv.length === 0 ? (
								<p className="rounded-sm border border-dashed border-[#c9d3cd] p-4 text-sm text-[#65736b]">
									No customer LTV rows are available for this scope.
								</p>
							) : null}
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
