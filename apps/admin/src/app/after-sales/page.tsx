import Link from "next/link";
import { CircleDollarSign, RotateCcw, ShieldCheck, TicketCheck } from "lucide-react";
import { AdminHeaderSwitchPanel } from "@/components/AdminHeaderSwitchPanel";
import { AdminPagination, AdminQueryPanel } from "@/components/AdminListControls";
import { loadSiteManagementData } from "@/lib/admin-sites";
import {
	afterSalesStatusClassName,
	formatCurrency,
	formatDateTime,
	getSiteForAfterSales,
	loadAdminAfterSalesRequests,
	normalizeAfterSalesScopeType,
	selectedAfterSalesScopeIdForSite,
	shortId,
} from "@/lib/admin-aftersales";
import {
	buildAdminListPath,
	hasTextMatch,
	isWithinDateRange,
	normalizePage,
	normalizePageSize,
	normalizeQuery,
	paginateRows,
} from "@/lib/admin-list-controls";

type AfterSalesPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstSearchParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function normalizeAfterSalesFilter(value: string | string[] | undefined) {
	return firstSearchParam(value)?.trim() ?? "";
}

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

export default async function AdminAfterSalesPage({
	searchParams,
}: AfterSalesPageProps) {
	const params = await searchParams;
	const data = await loadSiteManagementData();
	const selectedSite =
		data.sites.find((site) => site.siteId === firstSearchParam(params.siteId)) ??
		data.sites[0];
	const scopeType = normalizeAfterSalesScopeType(params.scopeType);
	const scopeId =
		firstSearchParam(params.scopeId) ??
		(selectedSite
			? selectedAfterSalesScopeIdForSite(scopeType, selectedSite)
			: undefined);
	const query = normalizeQuery(params.query);
	const status = normalizeAfterSalesFilter(params.status);
	const type = normalizeAfterSalesFilter(params.type);
	const dateFrom = normalizeQuery(params.dateFrom);
	const dateTo = normalizeQuery(params.dateTo);
	const page = normalizePage(params.page);
	const pageSize = normalizePageSize(params.pageSize);
	const requests = await loadAdminAfterSalesRequests({
		scopeType,
		...(scopeId ? { scopeId } : {}),
		limit: 100,
	});
	const filteredRequests = requests.filter((request) => {
		const site = getSiteForAfterSales(data.sites, request);

		return (
			(!status || request.status === status) &&
			(!type || request.type === type) &&
			isWithinDateRange(request.createdAt, dateFrom, dateTo) &&
			hasTextMatch(
				[
					request.requestNo,
					request.orderNo,
					request.reason,
					request.status,
					request.type,
					request.latestRefundStatus,
					request.userId,
					request.guestToken,
					site?.siteName,
					site?.verticalCode,
					site?.brandCode,
				],
				query,
			)
		);
	});
	const pagination = paginateRows(filteredRequests, { page, pageSize });
	const reviewableRequests = filteredRequests.filter((request) =>
		["requested", "reviewing"].includes(request.status),
	);
	const refundingRequests = filteredRequests.filter((request) =>
		["refunding", "returning", "received"].includes(request.status),
	);
	const completedRequests = filteredRequests.filter((request) =>
		["completed", "rejected", "closed"].includes(request.status),
	);
	const currency =
		filteredRequests[0]?.currency ?? selectedSite?.defaultCurrency ?? "USD";
	const requestedAmount = filteredRequests.reduce(
		(total, request) => total + Number(request.requestedAmount ?? "0"),
		0,
	);
	const baseListParams = {
		scopeType,
		...(scopeId ? { scopeId } : {}),
		...(selectedSite ? { siteId: selectedSite.siteId } : {}),
		limit: 100,
		...(query ? { query } : {}),
		...(status ? { status } : {}),
		...(type ? { type } : {}),
		...(dateFrom ? { dateFrom } : {}),
		...(dateTo ? { dateTo } : {}),
		pageSize,
	};

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
							<h1 className="mt-1 text-2xl font-semibold">After-sales</h1>
							<p className="mt-1 max-w-2xl text-sm text-[#65736b]">
								Scoped refund and return requests with order context and refund
								money movement.
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
										href: buildAdminListPath("/after-sales", {
											scopeType,
											...(selectedAfterSalesScopeIdForSite(scopeType, site)
												? {
														scopeId: selectedAfterSalesScopeIdForSite(
															scopeType,
															site,
														),
													}
												: {}),
											siteId: site.siteId,
											limit: 100,
											...(query ? { query } : {}),
											...(status ? { status } : {}),
											...(type ? { type } : {}),
											...(dateFrom ? { dateFrom } : {}),
											...(dateTo ? { dateTo } : {}),
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
											href: buildAdminListPath("/after-sales", {
												scopeType: option,
												...(selectedSite &&
												selectedAfterSalesScopeIdForSite(option, selectedSite)
													? {
															scopeId: selectedAfterSalesScopeIdForSite(
																option,
																selectedSite,
															),
														}
													: {}),
												...(selectedSite ? { siteId: selectedSite.siteId } : {}),
												limit: 100,
												...(query ? { query } : {}),
												...(status ? { status } : {}),
												...(type ? { type } : {}),
												...(dateFrom ? { dateFrom } : {}),
												...(dateTo ? { dateTo } : {}),
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
								<RotateCcw className="size-4" />
								<p className="text-xs font-bold uppercase tracking-[0.14em]">
									Requests
								</p>
							</div>
							<p className="mt-2 text-2xl font-semibold">{filteredRequests.length}</p>
						</div>
						<div className="admin-metric-card p-4">
							<div className="flex items-center gap-2 text-[#1d7053]">
								<TicketCheck className="size-4" />
								<p className="text-xs font-bold uppercase tracking-[0.14em]">
									Reviewable
								</p>
							</div>
							<p className="mt-2 text-2xl font-semibold">
								{reviewableRequests.length}
							</p>
						</div>
						<div className="admin-metric-card p-4">
							<div className="flex items-center gap-2 text-[#1d7053]">
								<CircleDollarSign className="size-4" />
								<p className="text-xs font-bold uppercase tracking-[0.14em]">
									Requested
								</p>
							</div>
							<p className="mt-2 text-2xl font-semibold">
								{formatCurrency(requestedAmount, currency)}
							</p>
						</div>
						<div className="admin-metric-card p-4">
							<div className="flex items-center gap-2 text-[#1d7053]">
								<ShieldCheck className="size-4" />
								<p className="text-xs font-bold uppercase tracking-[0.14em]">
									Closed
								</p>
							</div>
							<p className="mt-2 text-2xl font-semibold">
								{completedRequests.length}
							</p>
						</div>
					</div>
				</div>
			</header>

			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
					<div className="border-b border-[#d9e1dc] px-4 py-3">
						<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
							After-sales Requests
						</p>
						<h2 className="mt-1 text-base font-semibold">
							{scopeType} {scopeId ? `/ ${shortId(scopeId)}` : ""}
						</h2>
					</div>
					<AdminQueryPanel
						action="/after-sales"
						clearHref={buildAdminListPath("/after-sales", {
							scopeType,
							...(scopeId ? { scopeId } : {}),
							...(selectedSite ? { siteId: selectedSite.siteId } : {}),
							limit: 100,
							pageSize,
						})}
						fields={[
							{
								name: "query",
								label: "Search",
								type: "search",
								value: query,
								placeholder: "Request no, order no, reason, buyer",
							},
							{
								name: "status",
								label: "Status",
								type: "select",
								value: status,
								options: [
									{ label: "All", value: "" },
									{ label: "Requested", value: "requested" },
									{ label: "Reviewing", value: "reviewing" },
									{ label: "Approved", value: "approved" },
									{ label: "Refunding", value: "refunding" },
									{ label: "Completed", value: "completed" },
									{ label: "Rejected", value: "rejected" },
									{ label: "Closed", value: "closed" },
								],
							},
							{
								name: "type",
								label: "Type",
								type: "select",
								value: type,
								options: [
									{ label: "All", value: "" },
									{ label: "Refund Only", value: "refund_only" },
									{ label: "Return Refund", value: "return_refund" },
									{ label: "Exchange", value: "exchange" },
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
					<div className="overflow-x-auto">
						<table className="w-full min-w-[1180px] border-collapse text-left text-sm">
							<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
								<tr>
									<th className="px-4 py-3 font-bold">Request</th>
									<th className="px-4 py-3 font-bold">Order</th>
									<th className="px-4 py-3 font-bold">Site</th>
									<th className="px-4 py-3 font-bold">Status</th>
									<th className="px-4 py-3 font-bold">Amount</th>
									<th className="px-4 py-3 font-bold">Reason</th>
									<th className="px-4 py-3 font-bold">Refund</th>
								</tr>
							</thead>
							<tbody>
								{pagination.rows.map((request) => {
									const site = getSiteForAfterSales(data.sites, request);

									return (
										<tr
											key={request.afterSalesRequestId}
											className="border-t border-[#edf1ef]"
										>
											<td className="px-4 py-3">
												<Link
													href={`/after-sales/${request.afterSalesRequestId}`}
													className="font-semibold text-[#1d7053]"
												>
													{request.requestNo}
												</Link>
												<p className="text-xs text-[#65736b]">
													{request.type} / {formatDateTime(request.createdAt)}
												</p>
											</td>
											<td className="px-4 py-3">
												<Link
													href={`/orders/${request.orderId}`}
													className="font-semibold text-[#1d7053]"
												>
													{request.orderNo}
												</Link>
												<p className="text-xs text-[#65736b]">
													{request.orderStatus} / {request.paymentStatus}
												</p>
											</td>
											<td className="px-4 py-3">
												<p className="font-medium">
													{site?.siteName ?? shortId(request.siteId)}
												</p>
												<p className="text-xs text-[#65736b]">
													{site?.verticalCode ?? shortId(request.verticalId)}
												</p>
											</td>
											<td className="px-4 py-3">
												<StatusBadge status={request.status} />
											</td>
											<td className="px-4 py-3 font-semibold">
												{formatCurrency(
													request.requestedAmount,
													request.currency,
												)}
											</td>
											<td className="max-w-[280px] px-4 py-3 text-[#425149]">
												{request.reason}
											</td>
											<td className="px-4 py-3">
												{request.latestRefundStatus ? (
													<StatusBadge status={request.latestRefundStatus} />
												) : (
													<span className="text-[#65736b]">-</span>
												)}
											</td>
										</tr>
									);
								})}
								{pagination.total === 0 && (
									<tr>
										<td
											colSpan={7}
											className="px-4 py-10 text-center text-sm text-[#65736b]"
										>
											No after-sales requests are visible for this scope.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
					<AdminPagination
						end={pagination.end}
						page={pagination.page}
						pageSize={pagination.pageSize}
						params={baseListParams}
						pathname="/after-sales"
						start={pagination.start}
						total={pagination.total}
						totalPages={pagination.totalPages}
					/>
				</section>

				<section className="grid gap-5 xl:grid-cols-2">
					<div className="rounded-sm border border-[#d9e1dc] bg-white p-4">
						<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
							Active Work
						</p>
						<p className="mt-2 text-sm text-[#425149]">
							{reviewableRequests.length} reviewable requests and{" "}
							{refundingRequests.length} refunding or return-related requests are
							visible in this scope.
						</p>
					</div>
					<div className="rounded-sm border border-[#d9e1dc] bg-white p-4">
						<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
							Control Rule
						</p>
						<p className="mt-2 text-sm text-[#425149]">
							Approval creates a payment refund record; only marking that refund
							succeeded changes payment status and closes after-sales.
						</p>
					</div>
				</section>
			</main>
		</div>
	);
}
