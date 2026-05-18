"use client";

import {
	Activity,
	AlertTriangle,
	BarChart3,
	CheckCircle2,
	CircleDollarSign,
	PackageSearch,
	Play,
	RefreshCw,
	Search,
	ShoppingCart,
	TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAdminI18n } from "@/components/AdminAppFrame";
import { getAdminScopeMessageKey } from "@/lib/admin-i18n";
import {
	type AdminSite,
	type AdminScope,
	type AdminSiteManagementData,
	type AnalyticsScopeType,
	type ProcessCommercePipelineResponse,
	type ProcessPendingAnalyticsEventsResponse,
	type ProjectAnalyticsEventResponse,
	canSelectAdminScope,
	countSitesByStatus,
	findSelectedSite,
} from "@/lib/admin-sites";

type AdminShellProps = {
	data: AdminSiteManagementData;
};

function statusClassName(status: AdminSite["status"]) {
	if (status === "active") {
		return "border-[#bbdfcc] bg-[#eef8f1] text-[#1d7053]";
	}

	if (status === "inactive") {
		return "border-[#e5dac0] bg-[#fff8e6] text-[#8a5a13]";
	}

	return "border-[#e8c8c1] bg-[#fff1ee] text-[#a43b24]";
}

function Metric({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	return (
		<div className="rounded-sm border border-[#d9e1dc] bg-white p-4">
			<p className="text-xs font-bold uppercase tracking-[0.18em] text-[#65736b]">
				{label}
			</p>
			<p className="mt-2 text-2xl font-semibold text-[#17221b]">{value}</p>
		</div>
	);
}

function Pill({ children }: { children: React.ReactNode }) {
	return (
		<span className="inline-flex h-7 items-center rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] px-2 text-xs font-semibold text-[#425149]">
			{children}
		</span>
	);
}

function formatAdminScope(scope: AdminScope) {
	return scope.scopeId
		? `${scope.scopeType}: ${scope.scopeId}`
		: scope.scopeType;
}

const analyticsScopeOptions: Array<{
	value: AnalyticsScopeType;
	label: string;
}> = [
	{ value: "global", label: "Global" },
	{ value: "vertical", label: "Vertical" },
	{ value: "brand", label: "Brand" },
	{ value: "site", label: "Site" },
];

function parseAmount(value: string | undefined): number {
	const amount = Number(value ?? "0");

	return Number.isFinite(amount) ? amount : 0;
}

function formatCurrency(value: number, currency: string) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
	}).format(value);
}

function getAnalyticsScopeKey(
	scopeType: AnalyticsScopeType,
	selectedSite: AdminSite,
) {
	if (scopeType === "global") {
		return "global";
	}

	if (scopeType === "vertical") {
		return selectedSite.verticalId;
	}

	if (scopeType === "brand") {
		return selectedSite.brandId;
	}

	return selectedSite.siteId;
}

function filterByAnalyticsScope<T extends { scopeType: string; scopeKey: string }>(
	rows: T[],
	scopeType: AnalyticsScopeType,
	scopeKey: string,
) {
	return rows.filter(
		(row) => row.scopeType === scopeType && row.scopeKey === scopeKey,
	);
}

function filterByDimensionScope<
	T extends { siteId?: string; verticalId?: string; brandId?: string },
>(rows: T[], scopeType: AnalyticsScopeType, selectedSite: AdminSite) {
	if (scopeType === "global") {
		return rows;
	}

	if (scopeType === "vertical") {
		return rows.filter((row) => row.verticalId === selectedSite.verticalId);
	}

	if (scopeType === "brand") {
		return rows.filter((row) => row.brandId === selectedSite.brandId);
	}

	return rows.filter((row) => row.siteId === selectedSite.siteId);
}

function EmptyTableRow({
	colSpan,
	message = "No analytics data is available for this scope.",
}: {
	colSpan: number;
	message?: string;
}) {
	return (
		<tr>
			<td colSpan={colSpan} className="px-4 py-6 text-center text-[#65736b]">
				{message}
			</td>
		</tr>
	);
}

function shortId(value: string | undefined) {
	return value ? value.slice(0, 8) : "-";
}

function formatDateTime(value: string | undefined) {
	if (!value) {
		return "-";
	}

	return value.slice(0, 16).replace("T", " ");
}

function operationStatusClassName(status: string) {
	if (
		[
			"processed",
			"paid",
			"succeeded",
			"deducted",
			"released",
			"completed",
			"fulfilled",
		].includes(status)
	) {
		return "border-[#bbdfcc] bg-[#eef8f1] text-[#1d7053]";
	}

	if (["failed", "dead_letter", "chargeback", "cancelled", "expired"].includes(status)) {
		return "border-[#e8c8c1] bg-[#fff1ee] text-[#a43b24]";
	}

	if (["processing", "locked", "pending", "pending_payment"].includes(status)) {
		return "border-[#e5dac0] bg-[#fff8e6] text-[#8a5a13]";
	}

	return "border-[#d9e1dc] bg-[#f5f7f8] text-[#425149]";
}

function StatusBadge({ status }: { status: string }) {
	return (
		<span
			className={`inline-flex h-7 items-center rounded-sm border px-2 text-xs font-bold ${operationStatusClassName(
				status,
			)}`}
		>
			{status}
		</span>
	);
}

type AnalyticsOperationState = "idle" | "running" | "succeeded" | "failed";

type AnalyticsOperationResult = {
	title: string;
	summary: string;
	details: Array<{
		label: string;
		value: string | number;
	}>;
	results?: ProcessPendingAnalyticsEventsResponse["results"];
};

async function postAdminJson<T>(pathname: string, body: unknown): Promise<T> {
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
		throw new Error(payload.message ?? `Admin request failed: ${pathname}`);
	}

	return payload as T;
}

function normalizeBatchLimit(value: string) {
	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed < 1 || parsed > 200) {
		throw new Error("Batch limit must be an integer from 1 to 200.");
	}

	return parsed;
}

export function AdminShell({ data }: AdminShellProps) {
	const { locale, t } = useAdminI18n();
	const [selectedSiteId, setSelectedSiteId] = useState(data.sites[0]?.siteId ?? "");
	const [analyticsScopeType, setAnalyticsScopeType] =
		useState<AnalyticsScopeType>(() => {
			return (
				analyticsScopeOptions.find((option) =>
					canSelectAdminScope(data.access.scopes, option.value),
				)?.value ?? "site"
			);
		});
	const [analyticsBatchLimit, setAnalyticsBatchLimit] = useState("20");
	const [analyticsEventId, setAnalyticsEventId] = useState("");
	const [analyticsOperationState, setAnalyticsOperationState] =
		useState<AnalyticsOperationState>("idle");
	const [analyticsOperationResult, setAnalyticsOperationResult] =
		useState<AnalyticsOperationResult | null>(null);
	const [analyticsOperationError, setAnalyticsOperationError] = useState("");
	const selectedSite = useMemo(
		() => findSelectedSite(data.sites, selectedSiteId),
		[data.sites, selectedSiteId],
	);
	const currentVertical = data.verticals.find(
		(vertical) => vertical.id === selectedSite.verticalId,
	);
	const currentBrand = data.brands.find(
		(brand) => brand.id === selectedSite.brandId,
	);
	const workspaceScopeOptions = analyticsScopeOptions.map((option) => ({
		...option,
		label: t(getAdminScopeMessageKey(option.value)),
		enabled: canSelectAdminScope(data.access.scopes, option.value),
	}));
	const selectedScopeName = t(getAdminScopeMessageKey(analyticsScopeType));
	const scopeViewTitle =
		locale === "zh-CN"
			? `${selectedSite.siteName} 的${selectedScopeName}数据视图`
			: `${selectedScopeName} data view for ${selectedSite.siteName}`;
	const formatRowCount = (count: number) =>
		locale === "zh-CN" ? `${count} 行` : `${count} rows`;
	const selectedVerticalAttributes = data.productAttributes.filter(
		(attribute) => attribute.verticalId === selectedSite.verticalId,
	);
	const analyticsScopeKey = getAnalyticsScopeKey(
		analyticsScopeType,
		selectedSite,
	);
	const dailySales = useMemo(
		() =>
			filterByAnalyticsScope(
				data.analytics.dailySales,
				analyticsScopeType,
				analyticsScopeKey,
			),
		[data.analytics.dailySales, analyticsScopeType, analyticsScopeKey],
	);
	const channelPerformance = useMemo(
		() =>
			filterByAnalyticsScope(
				data.analytics.channelPerformance,
				analyticsScopeType,
				analyticsScopeKey,
			),
		[data.analytics.channelPerformance, analyticsScopeType, analyticsScopeKey],
	);
	const productPerformance = useMemo(
		() =>
			filterByAnalyticsScope(
				data.analytics.productPerformance,
				analyticsScopeType,
				analyticsScopeKey,
			),
		[data.analytics.productPerformance, analyticsScopeType, analyticsScopeKey],
	);
	const customerLtv = useMemo(
		() =>
			filterByAnalyticsScope(
				data.analytics.customerLtv,
				analyticsScopeType,
				analyticsScopeKey,
			),
		[data.analytics.customerLtv, analyticsScopeType, analyticsScopeKey],
	);
	const operationOrders = useMemo(
		() =>
			filterByDimensionScope(
				data.operations.orders,
				analyticsScopeType,
				selectedSite,
			),
		[data.operations.orders, analyticsScopeType, selectedSite],
	);
	const operationPaymentWebhooks = useMemo(
		() =>
			filterByDimensionScope(
				data.operations.paymentWebhooks,
				analyticsScopeType,
				selectedSite,
			),
		[data.operations.paymentWebhooks, analyticsScopeType, selectedSite],
	);
	const operationInventoryLocks = useMemo(
		() =>
			filterByDimensionScope(
				data.operations.inventoryLocks,
				analyticsScopeType,
				selectedSite,
			),
		[data.operations.inventoryLocks, analyticsScopeType, selectedSite],
	);
	const operationInventoryTransactions = useMemo(
		() =>
			filterByDimensionScope(
				data.operations.inventoryTransactions,
				analyticsScopeType,
				selectedSite,
			),
		[data.operations.inventoryTransactions, analyticsScopeType, selectedSite],
	);
	const operationAfterSalesRequests = useMemo(
		() =>
			filterByDimensionScope(
				data.operations.afterSalesRequests,
				analyticsScopeType,
				selectedSite,
			),
		[data.operations.afterSalesRequests, analyticsScopeType, selectedSite],
	);
	const operationPaymentRefunds = useMemo(
		() =>
			filterByDimensionScope(
				data.operations.paymentRefunds,
				analyticsScopeType,
				selectedSite,
			),
		[data.operations.paymentRefunds, analyticsScopeType, selectedSite],
	);
	const operationAuditLogs = useMemo(
		() =>
			filterByDimensionScope(
				data.operations.auditLogs,
				analyticsScopeType,
				selectedSite,
			),
		[data.operations.auditLogs, analyticsScopeType, selectedSite],
	);
	const analyticsCurrency =
		dailySales[0]?.currency ??
		channelPerformance[0]?.currency ??
		productPerformance[0]?.currency ??
		customerLtv[0]?.currency ??
		selectedSite.defaultCurrency;
	const netSalesAmount = dailySales.reduce(
		(total, row) => total + parseAmount(row.netSalesAmount),
		0,
	);
	const paidOrderCount = dailySales.reduce(
		(total, row) => total + row.paidOrderCount,
		0,
	);
	const refundAmount = dailySales.reduce(
		(total, row) => total + parseAmount(row.refundAmount),
		0,
	);
	const chargebackAmount = dailySales.reduce(
		(total, row) => total + parseAmount(row.chargebackAmount),
		0,
	);
	const averageOrderValue =
		paidOrderCount > 0 ? netSalesAmount / paidOrderCount : 0;
	const processingOrderCount = operationOrders.filter(
		(order) =>
			order.orderStatus === "payment_processing" ||
			order.paymentStatus === "processing",
	).length;
	const unfulfilledPaidOrderCount = operationOrders.filter(
		(order) =>
			order.paymentStatus === "paid" &&
			["unfulfilled", "pending"].includes(order.fulfillmentStatus),
	).length;
	const failedWebhookCount = operationPaymentWebhooks.filter((webhook) =>
		["failed", "dead_letter"].includes(webhook.status),
	).length;
	const activeInventoryLockCount = operationInventoryLocks.filter(
		(lock) => lock.status === "locked",
	).length;
	const pendingAfterSalesCount = operationAfterSalesRequests.filter((request) =>
		["requested", "reviewing", "refunding"].includes(request.status),
	).length;
	const adminOperationLogCount = operationAuditLogs.filter(
		(log) => log.source === "admin_operation",
	).length;

	async function handleProcessPendingAnalytics() {
		setAnalyticsOperationState("running");
		setAnalyticsOperationError("");

		try {
			const limit = normalizeBatchLimit(analyticsBatchLimit);
			const result =
				await postAdminJson<ProcessPendingAnalyticsEventsResponse>(
					"/api/admin/analytics/process-pending",
					{ limit },
				);

			setAnalyticsOperationResult({
				title: "Pending Outbox",
				summary: `${result.processed} processed, ${result.failed} failed`,
				details: [
					{ label: "Claimed", value: result.claimed },
					{ label: "Processed", value: result.processed },
					{ label: "Already", value: result.alreadyProcessed },
					{ label: "Ignored", value: result.ignored },
					{ label: "Failed", value: result.failed },
				],
				results: result.results,
			});
			setAnalyticsOperationState(
				result.failed > 0 ? "failed" : "succeeded",
			);
		} catch (error) {
			setAnalyticsOperationResult(null);
			setAnalyticsOperationError(
				error instanceof Error ? error.message : "Analytics operation failed.",
			);
			setAnalyticsOperationState("failed");
		}
	}

	async function handleProjectAnalyticsEvent() {
		setAnalyticsOperationState("running");
		setAnalyticsOperationError("");

		try {
			const eventId = analyticsEventId.trim();

			if (!eventId) {
				throw new Error("Event ID is required.");
			}

			const result = await postAdminJson<ProjectAnalyticsEventResponse>(
				"/api/admin/analytics/project-order-paid",
				{ eventId },
			);

			setAnalyticsOperationResult({
				title: "Manual Projection",
				summary: result.reason ?? result.status,
				details: [
					{ label: "Event", value: eventId.slice(0, 8) },
					{ label: "Status", value: result.status },
				],
				results: [{ eventId, ...result }],
			});
			setAnalyticsOperationState(
				result.status === "failed" ? "failed" : "succeeded",
			);
		} catch (error) {
			setAnalyticsOperationResult(null);
			setAnalyticsOperationError(
				error instanceof Error ? error.message : "Analytics operation failed.",
			);
			setAnalyticsOperationState("failed");
		}
	}

	async function handleProcessCommercePipeline() {
		setAnalyticsOperationState("running");
		setAnalyticsOperationError("");

		try {
			const limit = normalizeBatchLimit(analyticsBatchLimit);
			const result = await postAdminJson<ProcessCommercePipelineResponse>(
				"/api/admin/operations/process-pending-commerce",
				{ limit },
			);
			const failed =
				result.paymentWebhooks.failed +
				result.paymentSucceededEvents.failed +
				result.analyticsEvents.failed;
			const processed =
				result.paymentWebhooks.processed +
				result.paymentSucceededEvents.processed +
				result.analyticsEvents.processed;
			const claimed =
				result.paymentWebhooks.claimed +
				result.paymentSucceededEvents.claimed +
				result.analyticsEvents.claimed;
			const results = [
				...result.paymentWebhooks.results,
				...result.paymentSucceededEvents.results,
				...result.analyticsEvents.results,
			].map((item) => ({
				eventId: item.id,
				status: item.status as ProcessPendingAnalyticsEventsResponse["results"][number]["status"],
				...(item.reason ? { reason: item.reason } : {}),
				...(item.errorMessage ? { errorMessage: item.errorMessage } : {}),
			}));

			setAnalyticsOperationResult({
				title: "Commerce Pipeline",
				summary: `${processed} processed, ${failed} failed`,
				details: [
					{ label: "Claimed", value: claimed },
					{ label: "Webhooks", value: result.paymentWebhooks.processed },
					{
						label: "Paid Events",
						value: result.paymentSucceededEvents.processed,
					},
					{ label: "Analytics", value: result.analyticsEvents.processed },
					{ label: "Failed", value: failed },
				],
				results,
			});
			setAnalyticsOperationState(failed > 0 ? "failed" : "succeeded");
		} catch (error) {
			setAnalyticsOperationResult(null);
			setAnalyticsOperationError(
				error instanceof Error
					? error.message
					: "Commerce pipeline operation failed.",
			);
			setAnalyticsOperationState("failed");
		}
	}

	return (
		<div className="min-h-screen bg-[#f5f7f8] text-[#17221b]">
			<header className="sticky top-0 z-30 flex min-h-16 flex-col gap-3 border-b border-[#d9e1dc] bg-white/92 px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between md:px-6">
						<div className="min-w-0">
							<p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1d7053]">
								{t("header.eyebrow")}
							</p>
							<h1 className="truncate text-xl font-semibold text-[#17221b]">
								{t("header.titlePrefix")} / {selectedScopeName}{" "}
								{t("header.scopeSuffix")}
							</h1>
						</div>
						<div className="flex flex-col gap-2 lg:flex-row lg:items-center">
							<div className="admin-pill-switch">
								{workspaceScopeOptions.map((option) => (
									<button
										key={option.value}
										type="button"
										onClick={() => setAnalyticsScopeType(option.value)}
										disabled={!option.enabled}
										className={
											analyticsScopeType === option.value ? "is-active" : undefined
										}
									>
										{option.label}
									</button>
								))}
							</div>
							<label className="relative">
								<span className="sr-only">{t("search.srOnly")}</span>
								<Search className="absolute left-3 top-3 size-4 text-[#65736b]" />
								<input
									readOnly
									value={t("search.placeholder")}
									className="h-10 w-full rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] pl-9 pr-3 text-sm font-medium text-[#65736b] sm:w-64"
								/>
							</label>
							<label className="grid gap-1">
								<span className="sr-only">{t("siteSwitcher.srOnly")}</span>
								<select
									value={selectedSite.siteId}
									onChange={(event) => setSelectedSiteId(event.target.value)}
									className="h-10 rounded-sm border border-[#b8c8c0] bg-white px-3 text-sm font-semibold text-[#17221b]"
								>
									{data.sites.map((site) => (
										<option key={site.siteId} value={site.siteId}>
											{site.siteName}
										</option>
									))}
								</select>
							</label>
						</div>
					</header>

					<main className="grid w-full gap-5 px-4 py-5 md:px-6">
						<section className="grid gap-4 md:grid-cols-4">
							<Metric label={t("nav.sites")} value={data.sites.length} />
							<Metric
								label={t("label.active")}
								value={countSitesByStatus(data.sites, "active")}
							/>
							<Metric label={t("nav.verticals")} value={data.verticals.length} />
							<Metric label={t("nav.brands")} value={data.brands.length} />
						</section>

						<section
							id="module-workbench"
							className="grid gap-4 rounded-sm border border-[#d9e1dc] bg-white p-4"
						>
							<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
								<div>
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										Workspace Scope
									</p>
									<h2 className="mt-1 text-base font-semibold">
										{scopeViewTitle}
									</h2>
								</div>
								<div className="flex flex-wrap gap-2">
									<Pill>{data.access.source}</Pill>
									<Pill>{selectedSite.domain}</Pill>
								</div>
							</div>
							<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
								<div className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-4">
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										Scope
									</p>
									<p className="mt-2 font-semibold">{selectedScopeName}</p>
									<p className="mt-1 text-xs text-[#65736b]">
										Key: {analyticsScopeKey}
									</p>
								</div>
								<div className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-4">
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										Site
									</p>
									<p className="mt-2 font-semibold">{selectedSite.siteName}</p>
									<p className="mt-1 text-xs text-[#65736b]">
										{selectedSite.siteCode}
									</p>
								</div>
								<div className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-4">
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										Vertical
									</p>
									<p className="mt-2 font-semibold">
										{currentVertical?.name ?? selectedSite.verticalName}
									</p>
									<p className="mt-1 text-xs text-[#65736b]">
										{selectedSite.verticalCode}
									</p>
								</div>
								<div className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-4">
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										Brand
									</p>
									<p className="mt-2 font-semibold">
										{currentBrand?.name ?? selectedSite.brandName}
									</p>
									<p className="mt-1 text-xs text-[#65736b]">
										{selectedSite.brandCode}
									</p>
								</div>
							</div>
						</section>

						<section
							id="analytics"
							className="grid gap-4 rounded-sm border border-[#d9e1dc] bg-white p-4"
						>
							<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
								<div>
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										Analytics
									</p>
									<h2 className="mt-1 text-base font-semibold">
										Commerce Performance
									</h2>
								</div>
								<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
									{workspaceScopeOptions.map((option) => (
										<button
											key={option.value}
											type="button"
											onClick={() => setAnalyticsScopeType(option.value)}
											disabled={!option.enabled}
											className={`h-9 rounded-sm border px-3 text-sm font-semibold ${
												analyticsScopeType === option.value
													? "border-[#1d7053] bg-[#1d7053] text-white"
													: "border-[#d9e1dc] bg-[#f5f7f8] text-[#425149] hover:border-[#9db3a8]"
											} disabled:cursor-not-allowed disabled:border-[#d9e1dc] disabled:text-[#a8b4ae]`}
										>
											{option.label}
										</button>
									))}
								</div>
							</div>

							<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
								<div className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-4">
									<div className="flex items-center gap-2 text-[#1d7053]">
										<CircleDollarSign className="size-4" />
										<p className="text-xs font-bold uppercase tracking-[0.14em]">
											Net Sales
										</p>
									</div>
									<p className="mt-2 text-2xl font-semibold">
										{formatCurrency(netSalesAmount, analyticsCurrency)}
									</p>
								</div>
								<div className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-4">
									<div className="flex items-center gap-2 text-[#1d7053]">
										<ShoppingCart className="size-4" />
										<p className="text-xs font-bold uppercase tracking-[0.14em]">
											Paid Orders
										</p>
									</div>
									<p className="mt-2 text-2xl font-semibold">
										{paidOrderCount}
									</p>
								</div>
								<div className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-4">
									<div className="flex items-center gap-2 text-[#1d7053]">
										<TrendingUp className="size-4" />
										<p className="text-xs font-bold uppercase tracking-[0.14em]">
											AOV
										</p>
									</div>
									<p className="mt-2 text-2xl font-semibold">
										{formatCurrency(averageOrderValue, analyticsCurrency)}
									</p>
								</div>
								<div className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-4">
									<div className="flex items-center gap-2 text-[#1d7053]">
										<BarChart3 className="size-4" />
										<p className="text-xs font-bold uppercase tracking-[0.14em]">
											Risk Amount
										</p>
									</div>
									<p className="mt-2 text-2xl font-semibold">
										{formatCurrency(
											refundAmount + chargebackAmount,
											analyticsCurrency,
										)}
									</p>
								</div>
							</div>

							<div className="grid gap-4 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-4 xl:grid-cols-[1fr_1fr_360px]">
								<form
									className="grid gap-3"
									onSubmit={(event) => {
										event.preventDefault();
										void handleProcessPendingAnalytics();
									}}
								>
									<div className="flex items-center gap-2 text-[#1d7053]">
										<Activity className="size-4" />
										<h3 className="text-sm font-semibold">Outbox Batch</h3>
									</div>
									<label className="grid gap-1 text-sm">
										<span className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
											Limit
										</span>
										<input
											type="number"
											min="1"
											max="200"
											value={analyticsBatchLimit}
											onChange={(event) =>
												setAnalyticsBatchLimit(event.target.value)
											}
											className="h-10 rounded-sm border border-[#d9e1dc] bg-white px-3 font-medium text-[#17221b]"
										/>
									</label>
									<button
										type="submit"
										disabled={analyticsOperationState === "running"}
										className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-[#1d7053] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#9db3a8]"
									>
										<Play className="size-4" />
										Process Pending
									</button>
								</form>

								<form
									className="grid gap-3"
									onSubmit={(event) => {
										event.preventDefault();
										void handleProjectAnalyticsEvent();
									}}
								>
									<div className="flex items-center gap-2 text-[#1d7053]">
										<RefreshCw className="size-4" />
										<h3 className="text-sm font-semibold">Project Event</h3>
									</div>
									<label className="grid gap-1 text-sm">
										<span className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
											OrderPaid Event ID
										</span>
										<input
											value={analyticsEventId}
											onChange={(event) =>
												setAnalyticsEventId(event.target.value)
											}
											placeholder="00000000-0000-4000-8000-000000000000"
											className="h-10 rounded-sm border border-[#d9e1dc] bg-white px-3 font-medium text-[#17221b]"
										/>
									</label>
									<button
										type="submit"
										disabled={analyticsOperationState === "running"}
										className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-[#1d7053] bg-white px-3 text-sm font-semibold text-[#1d7053] disabled:cursor-not-allowed disabled:border-[#9db3a8] disabled:text-[#9db3a8]"
									>
										<RefreshCw className="size-4" />
										Project One
									</button>
								</form>

								<div className="grid gap-3 rounded-sm border border-[#d9e1dc] bg-white p-3">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-2">
											{analyticsOperationState === "failed" ? (
												<AlertTriangle className="size-4 text-[#a43b24]" />
											) : (
												<CheckCircle2 className="size-4 text-[#1d7053]" />
											)}
											<h3 className="text-sm font-semibold">Refresh Status</h3>
										</div>
										<button
											type="button"
											onClick={() => window.location.reload()}
											className="inline-flex size-8 items-center justify-center rounded-sm border border-[#d9e1dc] text-[#425149] hover:border-[#9db3a8]"
											aria-label="Refresh analytics data"
										>
											<RefreshCw className="size-4" />
										</button>
									</div>
									{analyticsOperationState === "running" && (
										<p className="text-sm font-medium text-[#65736b]">
											Processing analytics events...
										</p>
									)}
									{analyticsOperationError && (
										<p className="text-sm font-medium text-[#a43b24]">
											{analyticsOperationError}
										</p>
									)}
									{analyticsOperationResult ? (
										<div className="grid gap-3">
											<div>
												<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
													{analyticsOperationResult.title}
												</p>
												<p className="mt-1 text-sm font-semibold">
													{analyticsOperationResult.summary}
												</p>
											</div>
											<div className="grid grid-cols-2 gap-2">
												{analyticsOperationResult.details.map((detail) => (
													<div
														key={detail.label}
														className="rounded-sm bg-[#f5f7f8] px-2 py-2"
													>
														<p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#65736b]">
															{detail.label}
														</p>
														<p className="mt-1 truncate text-sm font-semibold">
															{detail.value}
														</p>
													</div>
												))}
											</div>
											{analyticsOperationResult.results &&
												analyticsOperationResult.results.length > 0 && (
													<div className="grid gap-1 text-xs text-[#65736b]">
														{analyticsOperationResult.results
															.slice(0, 3)
															.map((result) => (
																<p
																	key={result.eventId}
																	className="truncate"
																	title={result.errorMessage ?? result.reason}
																>
																	{result.eventId.slice(0, 8)} -{" "}
																	{result.status}
																</p>
															))}
													</div>
												)}
										</div>
									) : (
										<p className="text-sm text-[#65736b]">
											No analytics operation has run in this session.
										</p>
									)}
								</div>
							</div>

							<div className="grid gap-4 xl:grid-cols-2">
								<div className="overflow-hidden rounded-sm border border-[#d9e1dc]">
									<div className="flex items-center justify-between border-b border-[#d9e1dc] px-4 py-3">
										<h3 className="text-sm font-semibold">Daily Sales</h3>
										<Pill>{formatRowCount(dailySales.length)}</Pill>
									</div>
									<div className="overflow-x-auto">
										<table className="w-full min-w-[620px] border-collapse text-left text-sm">
											<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
												<tr>
													<th className="px-4 py-3 font-bold">Date</th>
													<th className="px-4 py-3 font-bold">Net Sales</th>
													<th className="px-4 py-3 font-bold">Orders</th>
													<th className="px-4 py-3 font-bold">Refunds</th>
												</tr>
											</thead>
											<tbody>
												{dailySales.slice(0, 6).map((row) => (
													<tr
														key={`${row.statDate}-${row.scopeType}-${row.scopeKey}-${row.currency}`}
														className="border-t border-[#edf1ef]"
													>
														<td className="px-4 py-3 font-medium">
															{row.statDate}
														</td>
														<td className="px-4 py-3">
															{formatCurrency(
																parseAmount(row.netSalesAmount),
																row.currency,
															)}
														</td>
														<td className="px-4 py-3">
															{row.paidOrderCount}
														</td>
														<td className="px-4 py-3">
															{formatCurrency(
																parseAmount(row.refundAmount),
																row.currency,
															)}
														</td>
													</tr>
												))}
												{dailySales.length === 0 && <EmptyTableRow colSpan={4} />}
											</tbody>
										</table>
									</div>
								</div>

								<div className="overflow-hidden rounded-sm border border-[#d9e1dc]">
									<div className="flex items-center justify-between border-b border-[#d9e1dc] px-4 py-3">
										<h3 className="text-sm font-semibold">Channels</h3>
										<Pill>{formatRowCount(channelPerformance.length)}</Pill>
									</div>
									<div className="overflow-x-auto">
										<table className="w-full min-w-[620px] border-collapse text-left text-sm">
											<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
												<tr>
													<th className="px-4 py-3 font-bold">Channel</th>
													<th className="px-4 py-3 font-bold">Date</th>
													<th className="px-4 py-3 font-bold">Orders</th>
													<th className="px-4 py-3 font-bold">GMV</th>
												</tr>
											</thead>
											<tbody>
												{channelPerformance.slice(0, 6).map((row) => (
													<tr
														key={`${row.statDate}-${row.scopeType}-${row.scopeKey}-${row.channelCode}-${row.currency}`}
														className="border-t border-[#edf1ef]"
													>
														<td className="px-4 py-3 font-medium">
															{row.channelCode}
														</td>
														<td className="px-4 py-3">{row.statDate}</td>
														<td className="px-4 py-3">{row.orderCount}</td>
														<td className="px-4 py-3">
															{formatCurrency(
																parseAmount(row.gmvAmount),
																row.currency,
															)}
														</td>
													</tr>
												))}
												{channelPerformance.length === 0 && (
													<EmptyTableRow colSpan={4} />
												)}
											</tbody>
										</table>
									</div>
								</div>

								<div className="overflow-hidden rounded-sm border border-[#d9e1dc]">
									<div className="flex items-center justify-between border-b border-[#d9e1dc] px-4 py-3">
										<h3 className="flex items-center gap-2 text-sm font-semibold">
											<PackageSearch className="size-4 text-[#1d7053]" />
											Products
										</h3>
										<Pill>{formatRowCount(productPerformance.length)}</Pill>
									</div>
									<div className="overflow-x-auto">
										<table className="w-full min-w-[700px] border-collapse text-left text-sm">
											<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
												<tr>
													<th className="px-4 py-3 font-bold">Product</th>
													<th className="px-4 py-3 font-bold">SKU</th>
													<th className="px-4 py-3 font-bold">Units</th>
													<th className="px-4 py-3 font-bold">Net Sales</th>
												</tr>
											</thead>
											<tbody>
												{productPerformance.slice(0, 6).map((row) => (
													<tr
														key={`${row.statDate}-${row.scopeType}-${row.scopeKey}-${row.productId}-${row.skuId}`}
														className="border-t border-[#edf1ef]"
													>
														<td className="px-4 py-3 font-medium">
															{row.productId.slice(0, 8)}
														</td>
														<td className="px-4 py-3">
															{row.skuId.slice(0, 8)}
														</td>
														<td className="px-4 py-3">{row.unitsSold}</td>
														<td className="px-4 py-3">
															{formatCurrency(
																parseAmount(row.netSalesAmount),
																row.currency,
															)}
														</td>
													</tr>
												))}
												{productPerformance.length === 0 && (
													<EmptyTableRow colSpan={4} />
												)}
											</tbody>
										</table>
									</div>
								</div>

								<div className="overflow-hidden rounded-sm border border-[#d9e1dc]">
									<div className="flex items-center justify-between border-b border-[#d9e1dc] px-4 py-3">
										<h3 className="text-sm font-semibold">Customer LTV</h3>
										<Pill>{formatRowCount(customerLtv.length)}</Pill>
									</div>
									<div className="overflow-x-auto">
										<table className="w-full min-w-[700px] border-collapse text-left text-sm">
											<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
												<tr>
													<th className="px-4 py-3 font-bold">Customer</th>
													<th className="px-4 py-3 font-bold">Orders</th>
													<th className="px-4 py-3 font-bold">Net Sales</th>
													<th className="px-4 py-3 font-bold">Last Order</th>
												</tr>
											</thead>
											<tbody>
												{customerLtv.slice(0, 6).map((row) => (
													<tr
														key={`${row.scopeType}-${row.scopeKey}-${row.customerIdentityType}-${row.customerIdentityKey}-${row.currency}`}
														className="border-t border-[#edf1ef]"
													>
														<td className="px-4 py-3">
															<p className="font-medium">
																{row.customerIdentityType}
															</p>
															<p className="text-xs text-[#65736b]">
																{row.customerIdentityKey.slice(0, 18)}
															</p>
														</td>
														<td className="px-4 py-3">{row.orderCount}</td>
														<td className="px-4 py-3">
															{formatCurrency(
																parseAmount(row.netSalesAmount),
																row.currency,
															)}
														</td>
														<td className="px-4 py-3">
															{row.lastOrderAt.slice(0, 10)}
														</td>
													</tr>
												))}
												{customerLtv.length === 0 && <EmptyTableRow colSpan={4} />}
											</tbody>
										</table>
									</div>
								</div>
							</div>
						</section>

						<section
							id="risk-ops"
							className="grid gap-4 rounded-sm border border-[#d9e1dc] bg-white p-4"
						>
							<div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
								<div>
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										Risk Ops
									</p>
									<h2 className="mt-1 text-base font-semibold">
										Order, Payment, Inventory Control
									</h2>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<Pill>
										{analyticsScopeType} / {selectedSite.siteName}
									</Pill>
									<button
										type="button"
										onClick={() => {
											void handleProcessCommercePipeline();
										}}
										disabled={analyticsOperationState === "running"}
										className="inline-flex h-9 items-center justify-center gap-2 rounded-sm bg-[#1d7053] px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#9db3a8]"
									>
										<Play className="size-4" />
										Process Pipeline
									</button>
								</div>
							</div>

							<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
								<div className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-4">
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										Processing Orders
									</p>
									<p className="mt-2 text-2xl font-semibold">
										{processingOrderCount}
									</p>
								</div>
								<div className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-4">
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										Paid Unfulfilled
									</p>
									<p className="mt-2 text-2xl font-semibold">
										{unfulfilledPaidOrderCount}
									</p>
								</div>
								<div className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-4">
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										Webhooks Failed
									</p>
									<p className="mt-2 text-2xl font-semibold">
										{failedWebhookCount}
									</p>
								</div>
								<div className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-4">
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										Active Locks
									</p>
									<p className="mt-2 text-2xl font-semibold">
										{activeInventoryLockCount}
									</p>
								</div>
								<div className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-4">
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										Refund Queue
									</p>
									<p className="mt-2 text-2xl font-semibold">
										{pendingAfterSalesCount}
									</p>
								</div>
								<div className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-4">
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										Admin Audits
									</p>
									<p className="mt-2 text-2xl font-semibold">
										{adminOperationLogCount}
									</p>
								</div>
							</div>

							<div className="grid gap-4 xl:grid-cols-2">
								<div className="overflow-hidden rounded-sm border border-[#d9e1dc]">
									<div className="flex items-center justify-between border-b border-[#d9e1dc] px-4 py-3">
										<h3 className="text-sm font-semibold">Orders</h3>
										<Pill>{formatRowCount(operationOrders.length)}</Pill>
									</div>
									<div className="overflow-x-auto">
										<table className="w-full min-w-[780px] border-collapse text-left text-sm">
											<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
												<tr>
													<th className="px-4 py-3 font-bold">Order</th>
													<th className="px-4 py-3 font-bold">Payment</th>
													<th className="px-4 py-3 font-bold">Fulfillment</th>
													<th className="px-4 py-3 font-bold">Total</th>
													<th className="px-4 py-3 font-bold">Logs</th>
												</tr>
											</thead>
											<tbody>
												{operationOrders.slice(0, 8).map((order) => (
													<tr
														key={order.id}
														className="border-t border-[#edf1ef]"
													>
														<td className="px-4 py-3">
															<a
																href={`/orders/${order.id}`}
																className="font-semibold text-[#1d7053] hover:underline"
															>
																{order.orderNo}
															</a>
															<p className="text-xs text-[#65736b]">
																{formatDateTime(order.createdAt)}
															</p>
														</td>
														<td className="px-4 py-3">
															<div className="grid gap-1">
																<StatusBadge status={order.paymentStatus} />
																<p className="text-xs text-[#65736b]">
																	{order.paymentChannelCode ?? "no channel"}
																</p>
															</div>
														</td>
														<td className="px-4 py-3">
															<div className="grid gap-1">
																<StatusBadge status={order.fulfillmentStatus} />
																<StatusBadge status={order.orderStatus} />
															</div>
														</td>
														<td className="px-4 py-3">
															{formatCurrency(
																parseAmount(order.totalAmount),
																order.currency,
															)}
														</td>
														<td className="px-4 py-3">
															{order.statusLogCount} / {order.itemCount}
														</td>
													</tr>
												))}
												{operationOrders.length === 0 && (
													<EmptyTableRow
														colSpan={5}
														message="No scoped order operations are available."
													/>
												)}
											</tbody>
										</table>
									</div>
								</div>

								<div className="overflow-hidden rounded-sm border border-[#d9e1dc]">
									<div className="flex items-center justify-between border-b border-[#d9e1dc] px-4 py-3">
										<h3 className="text-sm font-semibold">Payment Webhooks</h3>
										<Pill>{formatRowCount(operationPaymentWebhooks.length)}</Pill>
									</div>
									<div className="overflow-x-auto">
										<table className="w-full min-w-[820px] border-collapse text-left text-sm">
											<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
												<tr>
													<th className="px-4 py-3 font-bold">Provider Event</th>
													<th className="px-4 py-3 font-bold">Type</th>
													<th className="px-4 py-3 font-bold">Status</th>
													<th className="px-4 py-3 font-bold">Received</th>
												</tr>
											</thead>
											<tbody>
												{operationPaymentWebhooks.slice(0, 8).map((webhook) => (
													<tr
														key={webhook.id}
														className="border-t border-[#edf1ef]"
													>
														<td className="px-4 py-3">
															<p className="font-semibold">
																{webhook.channelCode}
															</p>
															<p className="max-w-[220px] truncate text-xs text-[#65736b]">
																{webhook.providerEventId}
															</p>
														</td>
														<td className="px-4 py-3">
															<p className="max-w-[220px] truncate">
																{webhook.eventType}
															</p>
															<p className="text-xs text-[#65736b]">
																{shortId(webhook.paymentOrderId)}
															</p>
														</td>
														<td className="px-4 py-3">
															<div className="grid gap-1">
																<StatusBadge status={webhook.status} />
																{webhook.errorMessage && (
																	<p className="max-w-[220px] truncate text-xs text-[#a43b24]">
																		{webhook.errorMessage}
																	</p>
																)}
															</div>
														</td>
														<td className="px-4 py-3">
															{formatDateTime(webhook.receivedAt)}
														</td>
													</tr>
												))}
												{operationPaymentWebhooks.length === 0 && (
													<EmptyTableRow
														colSpan={4}
														message="No scoped payment webhook events are available."
													/>
												)}
											</tbody>
										</table>
									</div>
								</div>

								<div className="overflow-hidden rounded-sm border border-[#d9e1dc]">
									<div className="flex items-center justify-between border-b border-[#d9e1dc] px-4 py-3">
										<h3 className="text-sm font-semibold">
											After-sales Requests
										</h3>
										<Pill>{formatRowCount(operationAfterSalesRequests.length)}</Pill>
									</div>
									<div className="overflow-x-auto">
										<table className="w-full min-w-[820px] border-collapse text-left text-sm">
											<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
												<tr>
													<th className="px-4 py-3 font-bold">Request</th>
													<th className="px-4 py-3 font-bold">Order</th>
													<th className="px-4 py-3 font-bold">Type</th>
													<th className="px-4 py-3 font-bold">Amount</th>
													<th className="px-4 py-3 font-bold">Status</th>
												</tr>
											</thead>
											<tbody>
												{operationAfterSalesRequests.slice(0, 8).map((row) => (
													<tr
														key={row.id}
														className="border-t border-[#edf1ef]"
													>
														<td className="px-4 py-3">
															<p className="font-semibold">{row.requestNo}</p>
															<p className="max-w-[220px] truncate text-xs text-[#65736b]">
																{row.reason}
															</p>
														</td>
														<td className="px-4 py-3">
															{row.orderNo ?? shortId(row.orderId)}
														</td>
														<td className="px-4 py-3">
															<StatusBadge status={row.type} />
														</td>
														<td className="px-4 py-3">
															{row.approvedAmount ?? row.requestedAmount ?? "-"}
														</td>
														<td className="px-4 py-3">
															<StatusBadge status={row.status} />
														</td>
													</tr>
												))}
												{operationAfterSalesRequests.length === 0 && (
													<EmptyTableRow
														colSpan={5}
														message="No scoped after-sales requests are available."
													/>
												)}
											</tbody>
										</table>
									</div>
								</div>

								<div className="overflow-hidden rounded-sm border border-[#d9e1dc]">
									<div className="flex items-center justify-between border-b border-[#d9e1dc] px-4 py-3">
										<h3 className="text-sm font-semibold">Payment Refunds</h3>
										<Pill>{formatRowCount(operationPaymentRefunds.length)}</Pill>
									</div>
									<div className="overflow-x-auto">
										<table className="w-full min-w-[820px] border-collapse text-left text-sm">
											<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
												<tr>
													<th className="px-4 py-3 font-bold">Refund</th>
													<th className="px-4 py-3 font-bold">Request</th>
													<th className="px-4 py-3 font-bold">Amount</th>
													<th className="px-4 py-3 font-bold">Status</th>
													<th className="px-4 py-3 font-bold">Created</th>
												</tr>
											</thead>
											<tbody>
												{operationPaymentRefunds.slice(0, 8).map((refund) => (
													<tr
														key={refund.id}
														className="border-t border-[#edf1ef]"
													>
														<td className="px-4 py-3">
															<p className="font-semibold">{refund.refundNo}</p>
															<p className="text-xs text-[#65736b]">
																{refund.providerRefundId ?? "provider pending"}
															</p>
														</td>
														<td className="px-4 py-3">
															{refund.requestNo ?? shortId(refund.requestId)}
														</td>
														<td className="px-4 py-3">
															{formatCurrency(
																parseAmount(refund.amount),
																refund.currency,
															)}
														</td>
														<td className="px-4 py-3">
															<StatusBadge status={refund.status} />
														</td>
														<td className="px-4 py-3">
															{formatDateTime(refund.createdAt)}
														</td>
													</tr>
												))}
												{operationPaymentRefunds.length === 0 && (
													<EmptyTableRow
														colSpan={5}
														message="No scoped payment refunds are available."
													/>
												)}
											</tbody>
										</table>
									</div>
								</div>

								<div className="overflow-hidden rounded-sm border border-[#d9e1dc]">
									<div className="flex items-center justify-between border-b border-[#d9e1dc] px-4 py-3">
										<h3 className="text-sm font-semibold">Inventory Locks</h3>
										<Pill>{formatRowCount(operationInventoryLocks.length)}</Pill>
									</div>
									<div className="overflow-x-auto">
										<table className="w-full min-w-[780px] border-collapse text-left text-sm">
											<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
												<tr>
													<th className="px-4 py-3 font-bold">SKU</th>
													<th className="px-4 py-3 font-bold">Order</th>
													<th className="px-4 py-3 font-bold">Qty</th>
													<th className="px-4 py-3 font-bold">Status</th>
													<th className="px-4 py-3 font-bold">Expires</th>
												</tr>
											</thead>
											<tbody>
												{operationInventoryLocks.slice(0, 8).map((lock) => (
													<tr
														key={lock.id}
														className="border-t border-[#edf1ef]"
													>
														<td className="px-4 py-3">
															<p className="font-semibold">
																{shortId(lock.skuId)}
															</p>
															<p className="text-xs text-[#65736b]">
																{shortId(lock.warehouseId)}
															</p>
														</td>
														<td className="px-4 py-3">{shortId(lock.orderId)}</td>
														<td className="px-4 py-3">{lock.quantity}</td>
														<td className="px-4 py-3">
															<StatusBadge status={lock.status} />
														</td>
														<td className="px-4 py-3">
															{formatDateTime(lock.expiresAt)}
														</td>
													</tr>
												))}
												{operationInventoryLocks.length === 0 && (
													<EmptyTableRow
														colSpan={5}
														message="No scoped inventory locks are available."
													/>
												)}
											</tbody>
										</table>
									</div>
								</div>

								<div className="overflow-hidden rounded-sm border border-[#d9e1dc]">
									<div className="flex items-center justify-between border-b border-[#d9e1dc] px-4 py-3">
										<h3 className="text-sm font-semibold">
											Inventory Transactions
										</h3>
										<Pill>{formatRowCount(operationInventoryTransactions.length)}</Pill>
									</div>
									<div className="overflow-x-auto">
										<table className="w-full min-w-[860px] border-collapse text-left text-sm">
											<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
												<tr>
													<th className="px-4 py-3 font-bold">SKU</th>
													<th className="px-4 py-3 font-bold">Type</th>
													<th className="px-4 py-3 font-bold">Qty</th>
													<th className="px-4 py-3 font-bold">Available</th>
													<th className="px-4 py-3 font-bold">Created</th>
												</tr>
											</thead>
											<tbody>
												{operationInventoryTransactions.slice(0, 8).map((row) => (
													<tr
														key={row.id}
														className="border-t border-[#edf1ef]"
													>
														<td className="px-4 py-3">
															<p className="font-semibold">{shortId(row.skuId)}</p>
															<p className="text-xs text-[#65736b]">
																{shortId(row.orderId)}
															</p>
														</td>
														<td className="px-4 py-3">
															<StatusBadge status={row.type} />
														</td>
														<td className="px-4 py-3">{row.quantity}</td>
														<td className="px-4 py-3">
															{row.beforeAvailable} {"->"} {row.afterAvailable}
														</td>
														<td className="px-4 py-3">
															{formatDateTime(row.createdAt)}
														</td>
													</tr>
												))}
												{operationInventoryTransactions.length === 0 && (
													<EmptyTableRow
														colSpan={5}
														message="No scoped inventory transactions are available."
													/>
												)}
											</tbody>
										</table>
									</div>
								</div>

								<div className="overflow-hidden rounded-sm border border-[#d9e1dc] xl:col-span-2">
									<div className="flex items-center justify-between border-b border-[#d9e1dc] px-4 py-3">
										<h3 className="text-sm font-semibold">Audit Trail</h3>
										<Pill>{formatRowCount(operationAuditLogs.length)}</Pill>
									</div>
									<div className="overflow-x-auto">
										<table className="w-full min-w-[900px] border-collapse text-left text-sm">
											<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
												<tr>
													<th className="px-4 py-3 font-bold">Source</th>
													<th className="px-4 py-3 font-bold">Actor</th>
													<th className="px-4 py-3 font-bold">Action</th>
													<th className="px-4 py-3 font-bold">Resource</th>
													<th className="px-4 py-3 font-bold">Created</th>
												</tr>
											</thead>
											<tbody>
												{operationAuditLogs.slice(0, 8).map((log) => (
													<tr
														key={`${log.source}-${log.id}`}
														className="border-t border-[#edf1ef]"
													>
														<td className="px-4 py-3">
															<StatusBadge status={log.source} />
														</td>
														<td className="px-4 py-3">
															<p className="font-semibold">{log.actorType}</p>
															<p className="text-xs text-[#65736b]">
																{shortId(log.actorId)}
															</p>
														</td>
														<td className="px-4 py-3">
															<p className="max-w-[240px] truncate font-medium">
																{log.action}
															</p>
															<p className="text-xs text-[#65736b]">
																{log.requestId ?? "-"}
															</p>
														</td>
														<td className="px-4 py-3">
															<p>{log.resourceType}</p>
															<p className="text-xs text-[#65736b]">
																{shortId(log.resourceId)}
															</p>
														</td>
														<td className="px-4 py-3">
															{formatDateTime(log.createdAt)}
														</td>
													</tr>
												))}
												{operationAuditLogs.length === 0 && (
													<EmptyTableRow
														colSpan={5}
														message="No scoped audit logs are available."
													/>
												)}
											</tbody>
										</table>
									</div>
								</div>
							</div>
						</section>

						<section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_360px]">
							<div
								id="sites"
								className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white"
							>
								<div className="flex items-center justify-between border-b border-[#d9e1dc] px-4 py-3">
									<h2 className="text-base font-semibold">Sites</h2>
									<span
										className={`rounded-sm border px-2 py-1 text-xs font-bold ${statusClassName(
											selectedSite.status,
										)}`}
									>
										{selectedSite.status}
									</span>
								</div>
								<div className="overflow-x-auto">
									<table className="w-full min-w-[820px] border-collapse text-left text-sm">
										<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
											<tr>
												<th className="px-4 py-3 font-bold">Site</th>
												<th className="px-4 py-3 font-bold">Domain</th>
												<th className="px-4 py-3 font-bold">Vertical</th>
												<th className="px-4 py-3 font-bold">Brand</th>
												<th className="px-4 py-3 font-bold">Default</th>
												<th className="px-4 py-3 font-bold">Status</th>
											</tr>
										</thead>
										<tbody>
											{data.sites.map((site) => (
												<tr
													key={site.siteId}
													className={`border-t border-[#edf1ef] ${
														site.siteId === selectedSite.siteId
															? "bg-[#f0f8f3]"
															: "bg-white"
													}`}
												>
													<td className="px-4 py-3">
														<p className="font-semibold text-[#17221b]">
															{site.siteName}
														</p>
														<p className="text-xs text-[#65736b]">
															{site.siteCode}
														</p>
													</td>
													<td className="px-4 py-3 font-medium text-[#17221b]">
														{site.domain}
													</td>
													<td className="px-4 py-3 text-[#425149]">
														{site.verticalCode}
													</td>
													<td className="px-4 py-3 text-[#425149]">
														{site.brandCode}
													</td>
													<td className="px-4 py-3 text-[#425149]">
														{site.defaultLanguage} / {site.defaultCurrency}
													</td>
													<td className="px-4 py-3">
														<span
															className={`rounded-sm border px-2 py-1 text-xs font-bold ${statusClassName(
																site.status,
															)}`}
														>
															{site.status}
														</span>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>

							<div
								id="site-config"
								className="rounded-sm border border-[#d9e1dc] bg-white"
							>
								<div className="border-b border-[#d9e1dc] px-4 py-3">
									<h2 className="text-base font-semibold">Selected Site</h2>
								</div>
								<div className="grid gap-4 p-4 text-sm">
									<div>
										<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
											Domain
										</p>
										<p className="mt-1 font-semibold">{selectedSite.domain}</p>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div>
											<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
												Vertical
											</p>
											<p className="mt-1 font-semibold">
												{currentVertical?.name ?? selectedSite.verticalName}
											</p>
										</div>
										<div>
											<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
												Brand
											</p>
											<p className="mt-1 font-semibold">
												{currentBrand?.name ?? selectedSite.brandName}
											</p>
										</div>
									</div>
									<div>
										<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
											Theme
										</p>
										<div className="mt-2 flex flex-wrap gap-2">
											<Pill>{selectedSite.config.theme}</Pill>
											<Pill>
												{selectedSite.config.primaryColor ??
													"no primary color"}
											</Pill>
										</div>
									</div>
									<div>
										<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
											Languages
										</p>
										<div className="mt-2 flex flex-wrap gap-2">
											{selectedSite.config.enabledLanguages.map((item) => (
												<Pill key={item}>{item}</Pill>
											))}
										</div>
									</div>
									<div>
										<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
											Currencies
										</p>
										<div className="mt-2 flex flex-wrap gap-2">
											{selectedSite.config.enabledCurrencies.map((item) => (
												<Pill key={item}>{item}</Pill>
											))}
										</div>
									</div>
								</div>
							</div>
						</section>

						<section className="grid gap-5 lg:grid-cols-2">
							<div
								id="verticals"
								className="rounded-sm border border-[#d9e1dc] bg-white"
							>
								<div className="border-b border-[#d9e1dc] px-4 py-3">
									<h2 className="text-base font-semibold">Verticals</h2>
								</div>
								<div className="divide-y divide-[#edf1ef]">
									{data.verticals.map((vertical) => (
										<div
											key={vertical.id}
											className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
										>
											<div>
												<p className="font-semibold">{vertical.name}</p>
												<p className="text-sm text-[#65736b]">
													{vertical.code}
												</p>
											</div>
											<span
												className={`w-fit rounded-sm border px-2 py-1 text-xs font-bold ${statusClassName(
													vertical.status,
												)}`}
											>
												{vertical.status}
											</span>
										</div>
									))}
								</div>
							</div>

							<div
								id="brands"
								className="rounded-sm border border-[#d9e1dc] bg-white"
							>
								<div className="border-b border-[#d9e1dc] px-4 py-3">
									<h2 className="text-base font-semibold">Brands</h2>
								</div>
								<div className="divide-y divide-[#edf1ef]">
									{data.brands.map((brand) => (
										<div
											key={brand.id}
											className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
										>
											<div>
												<p className="font-semibold">{brand.name}</p>
												<p className="text-sm text-[#65736b]">{brand.code}</p>
											</div>
											<span
												className={`w-fit rounded-sm border px-2 py-1 text-xs font-bold ${statusClassName(
													brand.status,
												)}`}
											>
												{brand.status}
											</span>
										</div>
									))}
								</div>
							</div>
						</section>

						<section
							id="rbac-scope"
							className="grid gap-4 rounded-sm border border-[#d9e1dc] bg-white p-4"
						>
							<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										Access Source
									</p>
									<h2 className="mt-1 text-base font-semibold">
										RBAC Scope
									</h2>
								</div>
								<Pill>{data.access.source}</Pill>
							</div>
							<div className="flex flex-wrap gap-2">
								{data.access.scopes.length > 0 ? (
									data.access.scopes.map((scope) => (
										<Pill key={`${scope.scopeType}-${scope.scopeId ?? "all"}`}>
											{formatAdminScope(scope)}
										</Pill>
									))
								) : (
									<Pill>no data scope</Pill>
								)}
							</div>
							<div className="grid gap-2 sm:grid-cols-4">
								{workspaceScopeOptions.map((option) => (
									<div
										key={option.value}
										className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3"
									>
										<p className="font-semibold">
											{t(getAdminScopeMessageKey(option.value))}
										</p>
										<p className="mt-1 text-xs font-medium text-[#65736b]">
											{option.enabled
												? "Selectable for this admin"
												: "Blocked by admin scope"}
										</p>
									</div>
								))}
							</div>
						</section>

						<section
							id="vertical-attributes"
							className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white"
						>
							<div className="flex items-center justify-between border-b border-[#d9e1dc] px-4 py-3">
								<h2 className="text-base font-semibold">
									Vertical Attributes
								</h2>
								<Pill>{selectedVerticalAttributes.length} fields</Pill>
							</div>
							<div className="overflow-x-auto">
								<table className="w-full min-w-[760px] border-collapse text-left text-sm">
									<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
										<tr>
											<th className="px-4 py-3 font-bold">Attribute</th>
											<th className="px-4 py-3 font-bold">Code</th>
											<th className="px-4 py-3 font-bold">Type</th>
											<th className="px-4 py-3 font-bold">Flags</th>
											<th className="px-4 py-3 font-bold">Options</th>
										</tr>
									</thead>
									<tbody>
										{selectedVerticalAttributes.map((attribute) => (
											<tr
												key={attribute.id}
												className="border-t border-[#edf1ef]"
											>
												<td className="px-4 py-3">
													<p className="font-semibold">{attribute.name}</p>
													<p className="text-xs text-[#65736b]">
														sort {attribute.sortOrder}
													</p>
												</td>
												<td className="px-4 py-3 font-medium text-[#17221b]">
													{attribute.code}
												</td>
												<td className="px-4 py-3 text-[#425149]">
													{attribute.type}
												</td>
												<td className="px-4 py-3">
													<div className="flex flex-wrap gap-2">
														{attribute.required && <Pill>required</Pill>}
														{attribute.searchable && <Pill>searchable</Pill>}
														{attribute.filterable && <Pill>filterable</Pill>}
														{!attribute.required &&
															!attribute.searchable &&
															!attribute.filterable && <Pill>optional</Pill>}
													</div>
												</td>
												<td className="px-4 py-3 text-[#425149]">
													{attribute.options.length > 0
														? attribute.options
																.map((option) => option.label)
																.join(", ")
														: "-"}
												</td>
											</tr>
										))}
										{selectedVerticalAttributes.length === 0 && (
											<tr>
												<td
													colSpan={5}
													className="px-4 py-6 text-center text-[#65736b]"
												>
													No attributes are configured for this vertical.
												</td>
											</tr>
										)}
									</tbody>
								</table>
							</div>
						</section>
			</main>
		</div>
	);
}
