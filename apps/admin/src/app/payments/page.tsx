import Link from "next/link";
import {
	BadgeDollarSign,
	CreditCard,
	ShieldCheck,
	Webhook,
} from "lucide-react";
import { AdminHeaderSwitchPanel } from "@/components/AdminHeaderSwitchPanel";
import { AdminPagination, AdminQueryPanel } from "@/components/AdminListControls";
import { AdminPaymentPipelinePanel } from "@/components/AdminPaymentPipelinePanel";
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
	getSiteForPayment,
	loadAdminPaymentOperations,
	normalizePaymentScopeType,
	paymentStatusClassName,
	selectedPaymentScopeIdForSite,
	shortId,
} from "@/lib/admin-payments";

type PaymentsPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstSearchParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function StatusBadge({ status }: { status: string }) {
	return (
		<span
			className={`inline-flex h-7 items-center rounded-sm border px-2 text-xs font-bold ${paymentStatusClassName(
				status,
			)}`}
		>
			{status}
		</span>
	);
}

export default async function AdminPaymentsPage({
	searchParams,
}: PaymentsPageProps) {
	const params = await searchParams;
	const data = await loadSiteManagementData();
	const selectedSite =
		data.sites.find((site) => site.siteId === firstSearchParam(params.siteId)) ??
		data.sites[0];
	const scopeType = normalizePaymentScopeType(params.scopeType);
	const scopeId =
		firstSearchParam(params.scopeId) ??
		(selectedSite
			? selectedPaymentScopeIdForSite(scopeType, selectedSite)
			: undefined);
	const query = normalizeQuery(params.query);
	const paymentStatus = firstSearchParam(params.paymentStatus) ?? "";
	const webhookStatus = firstSearchParam(params.webhookStatus) ?? "";
	const dateFrom = normalizeQuery(params.dateFrom);
	const dateTo = normalizeQuery(params.dateTo);
	const page = normalizePage(params.page);
	const pageSize = normalizePageSize(params.pageSize);
	const paymentData = await loadAdminPaymentOperations({
		scopeType,
		...(scopeId ? { scopeId } : {}),
		limit: 100,
	});
	const filteredPaymentOrders = paymentData.paymentOrders.filter((payment) => {
		const site = getSiteForPayment(data.sites, payment);

		return (
			(!paymentStatus || payment.status === paymentStatus) &&
			isWithinDateRange(payment.createdAt, dateFrom, dateTo) &&
			hasTextMatch(
				[
					payment.paymentNo,
					payment.orderNo,
					payment.channelCode,
					payment.status,
					payment.idempotencyKey,
					payment.latestWebhookEventId,
					payment.latestWebhookStatus,
					site?.siteName,
					site?.verticalCode,
					site?.brandCode,
				],
				query,
			)
		);
	});
	const filteredTransactions = paymentData.paymentTransactions.filter(
		(transaction) =>
			(!paymentStatus || transaction.status === paymentStatus) &&
			isWithinDateRange(transaction.createdAt, dateFrom, dateTo) &&
			hasTextMatch(
				[
					transaction.providerTransactionId,
					transaction.channelCode,
					transaction.transactionType,
					transaction.paymentNo,
					transaction.orderNo,
					transaction.status,
				],
				query,
			),
	);
	const filteredWebhooks = paymentData.paymentWebhooks.filter(
		(webhook) =>
			(!webhookStatus || webhook.status === webhookStatus) &&
			isWithinDateRange(webhook.receivedAt, dateFrom, dateTo) &&
			hasTextMatch(
				[
					webhook.providerEventId,
					webhook.eventType,
					webhook.orderNo,
					webhook.paymentNo,
					webhook.status,
					webhook.errorMessage,
				],
				query,
			),
	);
	const paymentPagination = paginateRows(filteredPaymentOrders, {
		page,
		pageSize,
	});
	const transactionPagination = paginateRows(filteredTransactions, {
		page,
		pageSize,
	});
	const webhookPagination = paginateRows(filteredWebhooks, {
		page,
		pageSize,
	});
	const succeededPayments = filteredPaymentOrders.filter(
		(payment) => payment.status === "succeeded",
	);
	const failedWebhooks = filteredWebhooks.filter(
		(webhook) => webhook.status === "failed" || webhook.status === "dead_letter",
	);
	const openWebhooks = filteredWebhooks.filter((webhook) =>
		["received", "processing"].includes(webhook.status),
	);
	const currency =
		filteredPaymentOrders[0]?.currency ??
		selectedSite?.defaultCurrency ??
		"USD";
	const succeededAmount = succeededPayments.reduce(
		(total, payment) => total + Number(payment.amount),
		0,
	);
	const baseListParams = {
		scopeType,
		...(scopeId ? { scopeId } : {}),
		...(selectedSite ? { siteId: selectedSite.siteId } : {}),
		limit: 100,
		...(query ? { query } : {}),
		...(paymentStatus ? { paymentStatus } : {}),
		...(webhookStatus ? { webhookStatus } : {}),
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
							<h1 className="mt-1 text-2xl font-semibold">Payments</h1>
							<p className="mt-1 max-w-2xl text-sm text-[#65736b]">
								Payment orders, transactions, webhook processing and commerce
								pipeline operations.
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
										href: buildAdminListPath("/payments", {
											scopeType,
											...(selectedPaymentScopeIdForSite(scopeType, site)
												? {
														scopeId: selectedPaymentScopeIdForSite(
															scopeType,
															site,
														),
													}
												: {}),
											siteId: site.siteId,
											limit: 100,
											...(query ? { query } : {}),
											...(paymentStatus ? { paymentStatus } : {}),
											...(webhookStatus ? { webhookStatus } : {}),
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
											href: buildAdminListPath("/payments", {
												scopeType: option,
												...(selectedSite &&
												selectedPaymentScopeIdForSite(option, selectedSite)
													? {
															scopeId: selectedPaymentScopeIdForSite(
																option,
																selectedSite,
															),
														}
													: {}),
												...(selectedSite ? { siteId: selectedSite.siteId } : {}),
												limit: 100,
												...(query ? { query } : {}),
												...(paymentStatus ? { paymentStatus } : {}),
												...(webhookStatus ? { webhookStatus } : {}),
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
								<CreditCard className="size-4" />
								<p className="text-xs font-bold uppercase tracking-[0.14em]">
									Payment Orders
								</p>
							</div>
							<p className="mt-2 text-2xl font-semibold">
								{filteredPaymentOrders.length}
							</p>
						</div>
						<div className="admin-metric-card p-4">
							<div className="flex items-center gap-2 text-[#1d7053]">
								<BadgeDollarSign className="size-4" />
								<p className="text-xs font-bold uppercase tracking-[0.14em]">
									Succeeded
								</p>
							</div>
							<p className="mt-2 text-2xl font-semibold">
								{formatCurrency(succeededAmount, currency)}
							</p>
						</div>
						<div className="admin-metric-card p-4">
							<div className="flex items-center gap-2 text-[#1d7053]">
								<Webhook className="size-4" />
								<p className="text-xs font-bold uppercase tracking-[0.14em]">
									Open Webhooks
								</p>
							</div>
							<p className="mt-2 text-2xl font-semibold">{openWebhooks.length}</p>
						</div>
						<div className="admin-metric-card p-4">
							<div className="flex items-center gap-2 text-[#1d7053]">
								<ShieldCheck className="size-4" />
								<p className="text-xs font-bold uppercase tracking-[0.14em]">
									Failed Webhooks
								</p>
							</div>
							<p className="mt-2 text-2xl font-semibold">{failedWebhooks.length}</p>
						</div>
					</div>
				</div>
			</header>

			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<AdminPaymentPipelinePanel initialLimit={50} />

				<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
					<div className="border-b border-[#d9e1dc] px-4 py-3">
						<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
							Payment Orders
						</p>
						<h2 className="mt-1 text-base font-semibold">
							{scopeType} {scopeId ? `/ ${shortId(scopeId)}` : ""}
						</h2>
					</div>
					<AdminQueryPanel
						action="/payments"
						clearHref={buildAdminListPath("/payments", {
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
								placeholder: "Payment no, order no, idempotency",
							},
							{
								name: "paymentStatus",
								label: "Payment Status",
								type: "select",
								value: paymentStatus,
								options: [
									{ label: "All", value: "" },
									{ label: "Created", value: "created" },
									{ label: "Processing", value: "processing" },
									{ label: "Succeeded", value: "succeeded" },
									{ label: "Failed", value: "failed" },
									{ label: "Cancelled", value: "cancelled" },
									{ label: "Expired", value: "expired" },
								],
							},
							{
								name: "webhookStatus",
								label: "Webhook Status",
								type: "select",
								value: webhookStatus,
								options: [
									{ label: "All", value: "" },
									{ label: "Received", value: "received" },
									{ label: "Processing", value: "processing" },
									{ label: "Processed", value: "processed" },
									{ label: "Failed", value: "failed" },
									{ label: "Dead Letter", value: "dead_letter" },
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
						<table className="w-full min-w-[1120px] border-collapse text-left text-sm">
							<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
								<tr>
									<th className="px-4 py-3 font-bold">Payment</th>
									<th className="px-4 py-3 font-bold">Order</th>
									<th className="px-4 py-3 font-bold">Site</th>
									<th className="px-4 py-3 font-bold">Status</th>
									<th className="px-4 py-3 font-bold">Amount</th>
									<th className="px-4 py-3 font-bold">Idempotency</th>
									<th className="px-4 py-3 font-bold">Webhook</th>
								</tr>
							</thead>
							<tbody>
								{paymentPagination.rows.map((payment) => {
									const site = getSiteForPayment(data.sites, payment);

									return (
										<tr
											key={payment.paymentOrderId}
											className="border-t border-[#edf1ef]"
										>
											<td className="px-4 py-3">
												<p className="font-semibold">{payment.paymentNo}</p>
												<p className="text-xs text-[#65736b]">
													{payment.channelCode} / {shortId(payment.paymentOrderId)}
												</p>
											</td>
											<td className="px-4 py-3">
												<Link
													href={`/orders/${payment.orderId}`}
													className="font-semibold text-[#1d7053]"
												>
													{payment.orderNo}
												</Link>
												<p className="text-xs text-[#65736b]">
													{formatDateTime(payment.createdAt)}
												</p>
											</td>
											<td className="px-4 py-3">
												<p className="font-medium">
													{site?.siteName ?? shortId(payment.siteId)}
												</p>
												<p className="text-xs text-[#65736b]">
													{site?.verticalCode ?? shortId(payment.verticalId)}
												</p>
											</td>
											<td className="px-4 py-3">
												<StatusBadge status={payment.status} />
											</td>
											<td className="px-4 py-3 font-semibold">
												{formatCurrency(payment.amount, payment.currency)}
											</td>
											<td className="px-4 py-3 font-mono text-xs">
												{payment.idempotencyKey}
											</td>
											<td className="px-4 py-3">
												<p className="font-mono text-xs">
													{payment.latestWebhookEventId ?? "-"}
												</p>
												{payment.latestWebhookStatus ? (
													<p className="mt-1">
														<StatusBadge status={payment.latestWebhookStatus} />
													</p>
												) : null}
											</td>
										</tr>
									);
								})}
								{paymentPagination.total === 0 && (
									<tr>
										<td
											colSpan={7}
											className="px-4 py-10 text-center text-sm text-[#65736b]"
										>
											No payment orders are visible for this scope.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
					<AdminPagination
						end={paymentPagination.end}
						page={paymentPagination.page}
						pageSize={paymentPagination.pageSize}
						params={baseListParams}
						pathname="/payments"
						start={paymentPagination.start}
						total={paymentPagination.total}
						totalPages={paymentPagination.totalPages}
					/>
				</section>

				<section className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
					<div className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
						<div className="border-b border-[#d9e1dc] px-4 py-3">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								Payment Transactions
							</p>
							<h2 className="mt-1 text-base font-semibold">
								Provider captures and failures
							</h2>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full min-w-[760px] border-collapse text-left text-sm">
								<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
									<tr>
										<th className="px-4 py-3 font-bold">Provider</th>
										<th className="px-4 py-3 font-bold">Payment</th>
										<th className="px-4 py-3 font-bold">Status</th>
										<th className="px-4 py-3 font-bold">Amount</th>
									</tr>
								</thead>
								<tbody>
									{transactionPagination.rows.map((transaction) => (
										<tr
											key={transaction.paymentTransactionId}
											className="border-t border-[#edf1ef]"
										>
											<td className="px-4 py-3">
												<p className="font-mono text-xs">
													{transaction.providerTransactionId}
												</p>
												<p className="text-xs text-[#65736b]">
													{transaction.channelCode} / {transaction.transactionType}
												</p>
											</td>
											<td className="px-4 py-3">
												<p className="font-semibold">{transaction.paymentNo}</p>
												<p className="text-xs text-[#65736b]">
													{transaction.orderNo}
												</p>
											</td>
											<td className="px-4 py-3">
												<StatusBadge status={transaction.status} />
											</td>
											<td className="px-4 py-3 font-semibold">
												{formatCurrency(transaction.amount, transaction.currency)}
											</td>
										</tr>
									))}
									{transactionPagination.total === 0 && (
										<tr>
											<td
												colSpan={4}
												className="px-4 py-8 text-center text-sm text-[#65736b]"
											>
												No payment transactions are visible for this scope.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
						<AdminPagination
							end={transactionPagination.end}
							page={transactionPagination.page}
							pageSize={transactionPagination.pageSize}
							params={baseListParams}
							pathname="/payments"
							start={transactionPagination.start}
							total={transactionPagination.total}
							totalPages={transactionPagination.totalPages}
						/>
					</div>

					<div className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
						<div className="border-b border-[#d9e1dc] px-4 py-3">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								Payment Webhooks
							</p>
							<h2 className="mt-1 text-base font-semibold">
								Provider event idempotency
							</h2>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full min-w-[900px] border-collapse text-left text-sm">
								<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
									<tr>
										<th className="px-4 py-3 font-bold">Provider Event</th>
										<th className="px-4 py-3 font-bold">Order</th>
										<th className="px-4 py-3 font-bold">Status</th>
										<th className="px-4 py-3 font-bold">Processed</th>
										<th className="px-4 py-3 font-bold">Error</th>
									</tr>
								</thead>
								<tbody>
									{webhookPagination.rows.map((webhook) => (
										<tr
											key={webhook.webhookEventId}
											className="border-t border-[#edf1ef]"
										>
											<td className="px-4 py-3">
												<p className="font-mono text-xs">{webhook.providerEventId}</p>
												<p className="text-xs text-[#65736b]">
													{webhook.eventType} / duplicates {webhook.duplicateCount}
												</p>
											</td>
											<td className="px-4 py-3">
												<p className="font-semibold">
													{webhook.orderNo ?? webhook.paymentNo ?? "-"}
												</p>
												<p className="text-xs text-[#65736b]">
													{webhook.paymentOrderId
														? shortId(webhook.paymentOrderId)
														: "unmatched"}
												</p>
											</td>
											<td className="px-4 py-3">
												<StatusBadge status={webhook.status} />
											</td>
											<td className="px-4 py-3">
												<p className="text-xs text-[#65736b]">
													{formatDateTime(webhook.processedAt)}
												</p>
												<p className="text-xs text-[#65736b]">
													received {formatDateTime(webhook.receivedAt)}
												</p>
											</td>
											<td className="px-4 py-3 text-xs text-[#65736b]">
												{webhook.errorMessage ?? "-"}
											</td>
										</tr>
									))}
									{webhookPagination.total === 0 && (
										<tr>
											<td
												colSpan={5}
												className="px-4 py-8 text-center text-sm text-[#65736b]"
											>
												No payment webhooks are visible for this scope.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
						<AdminPagination
							end={webhookPagination.end}
							page={webhookPagination.page}
							pageSize={webhookPagination.pageSize}
							params={baseListParams}
							pathname="/payments"
							start={webhookPagination.start}
							total={webhookPagination.total}
							totalPages={webhookPagination.totalPages}
						/>
					</div>
				</section>
			</main>
		</div>
	);
}
