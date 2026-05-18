"use client";

import {
	Alert,
	Badge,
	Button,
	Card,
	Col,
	Flex,
	Progress,
	Row,
	Segmented,
	Select,
	Space,
	Statistic,
	Table,
	Tag,
	Typography,
} from "antd";
import {
	Activity,
	AlertTriangle,
	ArrowUpRight,
	Boxes,
	CircleDollarSign,
	CreditCard,
	PackageSearch,
	ShieldAlert,
	ShoppingCart,
	Truck,
	Warehouse,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useAdminI18n } from "@/components/AdminAppFrame";
import {
	filterAnalyticsRows,
	filterDimensionRows,
	formatDashboardMoney,
	sumMoney,
} from "@/lib/admin-dashboard";
import { getAdminScopeMessageKey } from "@/lib/admin-i18n";
import {
	type AdminOperationsData,
	type AdminScopeType,
	type AdminSiteManagementData,
	type AnalyticsScopeType,
	canSelectAdminScope,
	findSelectedSite,
} from "@/lib/admin-sites";

type AdminDashboardProps = {
	data: AdminSiteManagementData;
};

type RiskAlertRow = {
	key: string;
	title: string;
	description: string;
	severity: "error" | "warning" | "success";
	href: string;
};

function parseAmount(value: string | undefined) {
	const amount = Number(value ?? "0");

	return Number.isFinite(amount) ? amount : 0;
}

function trendPoints(values: number[], width: number, height: number) {
	const max = Math.max(...values, 1);

	return values
		.map((value, index) => {
			const x =
				values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
			const y = height - (value / max) * height;

			return `${x},${y}`;
		})
		.join(" ");
}

function SalesTrend({
	rows,
	currency,
	emptyText,
	title,
}: {
	rows: Array<{ statDate: string; netSalesAmount: string; currency: string }>;
	currency: string;
	emptyText: string;
	title: string;
}) {
	const chartRows = [...rows].sort((first, second) =>
		first.statDate.localeCompare(second.statDate),
	);
	const values = chartRows.map((row) => parseAmount(row.netSalesAmount));
	const points = trendPoints(values, 620, 180);
	const max = Math.max(...values, 1);

	return (
		<div className="grid gap-3">
			<div className="h-[220px] rounded-sm border border-[#e5ece8] bg-[#f8faf9] p-4">
				<svg viewBox="0 0 620 190" className="h-full w-full" role="img">
					<title>{title}</title>
					<line x1="0" x2="620" y1="180" y2="180" stroke="#d9e1dc" />
					<polyline
						points={points}
						fill="none"
						stroke="#1d7053"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="4"
					/>
					{values.map((value, index) => {
						const x =
							values.length === 1
								? 310
								: (index / Math.max(values.length - 1, 1)) * 620;
						const y = 180 - (value / max) * 180;

						return (
							<circle
								key={`${chartRows[index]?.statDate}-${value}`}
								cx={x}
								cy={y}
								r="5"
								fill="#f3c969"
								stroke="#1d7053"
								strokeWidth="3"
							/>
						);
					})}
				</svg>
			</div>
			<div className="grid gap-2">
				{chartRows.slice(-7).map((row) => (
					<div
						key={row.statDate}
						className="flex items-center justify-between text-sm"
					>
						<span className="text-[#65736b]">{row.statDate}</span>
						<span className="font-semibold">
							{formatDashboardMoney(row.netSalesAmount, row.currency ?? currency)}
						</span>
					</div>
				))}
				{chartRows.length === 0 ? (
					<Typography.Text type="secondary">{emptyText}</Typography.Text>
				) : null}
			</div>
		</div>
	);
}

function ChannelBars({
	rows,
	currency,
	emptyText,
}: {
	rows: Array<{ channelCode: string; netSalesAmount: string; currency: string }>;
	currency: string;
	emptyText: string;
}) {
	const totals = rows.reduce<Record<string, { channel: string; total: number }>>(
		(accumulator, row) => {
			const current = accumulator[row.channelCode] ?? {
				channel: row.channelCode,
				total: 0,
			};

			current.total += parseAmount(row.netSalesAmount);
			accumulator[row.channelCode] = current;

			return accumulator;
		},
		{},
	);
	const items = Object.values(totals).sort((first, second) => second.total - first.total);
	const max = Math.max(...items.map((item) => item.total), 1);

	return (
		<div className="grid gap-4">
			{items.map((item) => (
				<div key={item.channel} className="grid gap-2">
					<div className="flex items-center justify-between gap-3 text-sm">
						<span className="font-semibold">{item.channel}</span>
						<span className="text-[#65736b]">
							{formatDashboardMoney(String(item.total), currency)}
						</span>
					</div>
					<Progress
						percent={Math.round((item.total / max) * 100)}
						showInfo={false}
						strokeColor="#1d7053"
						trailColor="#edf1ef"
					/>
				</div>
			))}
			{items.length === 0 ? (
				<Typography.Text type="secondary">{emptyText}</Typography.Text>
			) : null}
		</div>
	);
}

function StatCard({
	title,
	value,
	prefix,
	footer,
	status,
}: {
	title: string;
	value: string | number;
	prefix: React.ReactNode;
	footer?: string;
	status?: "success" | "warning" | "error";
}) {
	const color =
		status === "error" ? "#a43b24" : status === "warning" ? "#8a5a13" : "#1d7053";

	return (
		<Card size="small" className="h-full">
			<Statistic
				title={
					<Space size={8}>
						<span style={{ color }}>{prefix}</span>
						<span>{title}</span>
					</Space>
				}
				value={value}
				valueStyle={{ color: "#17221b", fontWeight: 700 }}
			/>
			{footer ? (
				<Typography.Text type="secondary" className="mt-2 block text-xs">
					{footer}
				</Typography.Text>
			) : null}
		</Card>
	);
}

function buildRiskAlerts(input: {
	operations: AdminOperationsData;
	scopeType: AdminScopeType;
	site: AdminSiteManagementData["sites"][number];
	locale: "en-US" | "zh-CN";
}): RiskAlertRow[] {
	const { operations, scopeType, site, locale } = input;
	const zh = locale === "zh-CN";
	const webhooks = filterDimensionRows(
		operations.paymentWebhooks,
		scopeType,
		site,
	);
	const locks = filterDimensionRows(operations.inventoryLocks, scopeType, site);
	const orders = filterDimensionRows(operations.orders, scopeType, site);
	const afterSales = filterDimensionRows(
		operations.afterSalesRequests,
		scopeType,
		site,
	);
	const failedWebhooks = webhooks.filter((webhook) =>
		["failed", "dead_letter"].includes(webhook.status),
	);
	const paidUnfulfilled = orders.filter(
		(order) =>
			order.paymentStatus === "paid" &&
			["unfulfilled", "pending"].includes(order.fulfillmentStatus),
	);
	const activeLocks = locks.filter((lock) => lock.status === "locked");
	const pendingAfterSales = afterSales.filter((request) =>
		["requested", "reviewing", "refunding"].includes(request.status),
	);

	return [
		{
			key: "webhooks",
			title: zh ? "支付回调风险" : "Payment webhook risk",
			description: zh
				? `${failedWebhooks.length} 个失败支付回调需要检查。`
				: `${failedWebhooks.length} failed webhook events need review.`,
			severity: failedWebhooks.length > 0 ? "error" : "success",
			href: "/payments",
		},
		{
			key: "fulfillment",
			title: zh ? "已支付待履约订单" : "Paid unfulfilled orders",
			description: zh
				? `${paidUnfulfilled.length} 个已支付订单仍待履约。`
				: `${paidUnfulfilled.length} paid orders are still waiting for fulfillment.`,
			severity: paidUnfulfilled.length > 0 ? "warning" : "success",
			href: "/fulfillment",
		},
		{
			key: "inventory",
			title: zh ? "活跃库存锁" : "Active inventory locks",
			description: zh
				? `${activeLocks.length} 个库存锁当前仍处于锁定状态。`
				: `${activeLocks.length} inventory locks are currently active.`,
			severity: activeLocks.length > 0 ? "warning" : "success",
			href: "/inventory",
		},
		{
			key: "aftersales",
			title: zh ? "售后待处理" : "Pending after-sales",
			description: zh
				? `${pendingAfterSales.length} 个售后申请待处理。`
				: `${pendingAfterSales.length} after-sales requests are pending.`,
			severity: pendingAfterSales.length > 0 ? "warning" : "success",
			href: "/after-sales",
		},
	];
}

export function AdminDashboard({ data }: AdminDashboardProps) {
	const { locale, t } = useAdminI18n();
	const copy = (english: string, chinese: string) =>
		locale === "zh-CN" ? chinese : english;
	const [selectedSiteId, setSelectedSiteId] = useState(data.sites[0]?.siteId ?? "");
	const [scopeType, setScopeType] = useState<AnalyticsScopeType>(() => {
		return (
			(["global", "vertical", "brand", "site"] as const).find((option) =>
				canSelectAdminScope(data.access.scopes, option),
			) ?? "site"
		);
	});
	const selectedSite = findSelectedSite(data.sites, selectedSiteId);
	const dailySales = filterAnalyticsRows(
		data.analytics.dailySales,
		scopeType,
		selectedSite,
	);
	const channelPerformance = filterAnalyticsRows(
		data.analytics.channelPerformance,
		scopeType,
		selectedSite,
	);
	const productPerformance = filterAnalyticsRows(
		data.analytics.productPerformance,
		scopeType,
		selectedSite,
	);
	const operationOrders = filterDimensionRows(
		data.operations.orders,
		scopeType,
		selectedSite,
	);
	const operationWebhooks = filterDimensionRows(
		data.operations.paymentWebhooks,
		scopeType,
		selectedSite,
	);
	const operationLocks = filterDimensionRows(
		data.operations.inventoryLocks,
		scopeType,
		selectedSite,
	);
	const operationAfterSales = filterDimensionRows(
		data.operations.afterSalesRequests,
		scopeType,
		selectedSite,
	);
	const currency = dailySales[0]?.currency ?? selectedSite.defaultCurrency;
	const gmv = sumMoney(dailySales, "gmvAmount");
	const netSales = sumMoney(dailySales, "netSalesAmount");
	const refundRisk =
		sumMoney(dailySales, "refundAmount") + sumMoney(dailySales, "chargebackAmount");
	const paidOrders = dailySales.reduce((sum, row) => sum + row.paidOrderCount, 0);
	const aov = paidOrders > 0 ? netSales / paidOrders : 0;
	const failedWebhooks = operationWebhooks.filter((webhook) =>
		["failed", "dead_letter"].includes(webhook.status),
	).length;
	const activeLocks = operationLocks.filter((lock) => lock.status === "locked").length;
	const paidUnfulfilled = operationOrders.filter(
		(order) =>
			order.paymentStatus === "paid" &&
			["unfulfilled", "pending"].includes(order.fulfillmentStatus),
	).length;
	const pendingAfterSales = operationAfterSales.filter((request) =>
		["requested", "reviewing", "refunding"].includes(request.status),
	).length;
	const successWebhooks = operationWebhooks.filter(
		(webhook) => webhook.status === "processed",
	).length;
	const webhookSuccessRate =
		operationWebhooks.length > 0
			? Math.round((successWebhooks / operationWebhooks.length) * 100)
			: 100;
	const riskAlerts = buildRiskAlerts({
		operations: data.operations,
		scopeType,
		site: selectedSite,
		locale,
	});
	const productRanking = [...productPerformance]
		.sort(
			(first, second) =>
				parseAmount(second.netSalesAmount) - parseAmount(first.netSalesAmount),
		)
		.slice(0, 8);
	const scopeOptions = (["global", "vertical", "brand", "site"] as const).map(
		(option) => ({
			label: t(getAdminScopeMessageKey(option)),
			value: option,
			disabled: !canSelectAdminScope(data.access.scopes, option),
		}),
	);

	return (
		<div className="min-h-screen bg-[#f5f7f8] px-4 py-5 text-[#17221b] md:px-6">
			<div className="grid w-full gap-5">
				<section className="admin-dashboard-gradient rounded-sm px-5 py-5 text-white md:px-6">
					<Flex wrap gap={16} align="center" justify="space-between">
						<div>
							<Typography.Text className="text-xs font-bold uppercase tracking-[0.18em] text-[#f3c969]">
								{copy("Commerce OS Dashboard", "Commerce OS 数据大屏")}
							</Typography.Text>
							<Typography.Title level={2} className="!mb-1 !mt-2 !text-white">
								{copy("Operating Dashboard", "运营总览大屏")}
							</Typography.Title>
							<Typography.Text className="text-white/70">
								{copy(
									"Global / vertical / brand / site operating view for",
									"全局 / 垂类 / 品牌 / 站点运营视图：",
								)}{" "}
								{selectedSite.siteName}
							</Typography.Text>
						</div>
						<Space wrap>
							<Segmented
								value={scopeType}
								onChange={(value) => setScopeType(value as AnalyticsScopeType)}
								options={scopeOptions}
							/>
							<Select
								value={selectedSite.siteId}
								onChange={setSelectedSiteId}
								options={data.sites.map((site) => ({
									label: site.siteName,
									value: site.siteId,
								}))}
								style={{ minWidth: 180 }}
							/>
							<Button href="/analytics">{copy("Analytics", "数据分析")}</Button>
							<Button href="/operations">{copy("Operations", "运营风险")}</Button>
						</Space>
					</Flex>
				</section>

				<Row gutter={[16, 16]}>
					<Col xs={24} sm={12} xl={6}>
						<StatCard
							title="GMV"
							value={formatDashboardMoney(String(gmv), currency)}
							prefix={<CircleDollarSign size={16} />}
							footer={copy("Gross merchandise value", "商品交易总额")}
						/>
					</Col>
					<Col xs={24} sm={12} xl={6}>
						<StatCard
							title={copy("Net Sales", "净销售额")}
							value={formatDashboardMoney(String(netSales), currency)}
							prefix={<ArrowUpRight size={16} />}
							footer={copy(
								`${paidOrders} paid orders`,
								`${paidOrders} 个已支付订单`,
							)}
						/>
					</Col>
					<Col xs={24} sm={12} xl={6}>
						<StatCard
							title="AOV"
							value={formatDashboardMoney(String(aov), currency)}
							prefix={<ShoppingCart size={16} />}
							footer={copy("Average paid order value", "已支付订单平均客单价")}
						/>
					</Col>
					<Col xs={24} sm={12} xl={6}>
						<StatCard
							title={copy("Risk Amount", "风险金额")}
							value={formatDashboardMoney(String(refundRisk), currency)}
							prefix={<ShieldAlert size={16} />}
							footer={copy("Refund + chargeback amount", "退款和拒付金额")}
							status={refundRisk > 0 ? "warning" : "success"}
						/>
					</Col>
				</Row>

				<Row gutter={[16, 16]}>
					<Col xs={24} sm={12} xl={6}>
						<StatCard
							title={copy("Webhook Success", "回调成功率")}
							value={`${webhookSuccessRate}%`}
							prefix={<CreditCard size={16} />}
							footer={copy(
								`${failedWebhooks} failed webhooks`,
								`${failedWebhooks} 个失败回调`,
							)}
							status={failedWebhooks > 0 ? "error" : "success"}
						/>
					</Col>
					<Col xs={24} sm={12} xl={6}>
						<StatCard
							title={copy("Paid Unfulfilled", "已支付待履约")}
							value={paidUnfulfilled}
							prefix={<Truck size={16} />}
							footer={copy("Paid orders waiting fulfillment", "已支付待履约订单")}
							status={paidUnfulfilled > 0 ? "warning" : "success"}
						/>
					</Col>
					<Col xs={24} sm={12} xl={6}>
						<StatCard
							title={copy("Active Locks", "锁定中库存")}
							value={activeLocks}
							prefix={<Warehouse size={16} />}
							footer={copy("Inventory locks currently active", "当前活跃库存锁")}
							status={activeLocks > 0 ? "warning" : "success"}
						/>
					</Col>
					<Col xs={24} sm={12} xl={6}>
						<StatCard
							title={copy("After-sales Pending", "售后待处理")}
							value={pendingAfterSales}
							prefix={<AlertTriangle size={16} />}
							footer={copy("Requests waiting review", "等待审核的申请")}
							status={pendingAfterSales > 0 ? "warning" : "success"}
						/>
					</Col>
				</Row>

				<Row gutter={[16, 16]}>
					<Col xs={24} xl={14}>
						<Card
							title={
								<Space>
									<Activity size={16} color="#1d7053" />
									<span>{copy("Recent Sales Trend", "近期销售趋势")}</span>
								</Space>
							}
							extra={<Tag color="green">{copy("Last 7 rows", "最近 7 行")}</Tag>}
						>
							<SalesTrend
								rows={dailySales.slice(-7)}
								currency={currency}
								title={copy("Sales trend", "销售趋势")}
								emptyText={copy(
									"No projected daily sales are available for this scope.",
									"当前范围暂无每日销售投影。",
								)}
							/>
						</Card>
					</Col>
					<Col xs={24} xl={10}>
						<Card
							title={
								<Space>
									<CreditCard size={16} color="#1d7053" />
									<span>{copy("Channel Distribution", "渠道分布")}</span>
								</Space>
							}
						>
							<ChannelBars
								rows={channelPerformance}
								currency={currency}
								emptyText={copy(
									"No channel rows are available for this scope.",
									"当前范围暂无渠道数据。",
								)}
							/>
						</Card>
					</Col>
				</Row>

				<Row gutter={[16, 16]}>
					<Col xs={24} xl={14}>
						<Card
							title={
								<Space>
									<PackageSearch size={16} color="#1d7053" />
									<span>{copy("Product Sales Ranking", "商品销售排行")}</span>
								</Space>
							}
						>
							<Table
								size="small"
								rowKey={(row) => `${row.productId}-${row.skuId}-${row.scopeKey}`}
								pagination={false}
								dataSource={productRanking}
								columns={[
									{
										title: copy("Product", "商品"),
										dataIndex: "productId",
										render: (value: string) => value.slice(0, 8),
									},
									{
										title: "SKU",
										dataIndex: "skuId",
										render: (value: string) => value.slice(0, 8),
									},
									{
										title: copy("Units", "件数"),
										dataIndex: "unitsSold",
										align: "right" as const,
									},
									{
										title: copy("Net Sales", "净销售额"),
										dataIndex: "netSalesAmount",
										align: "right" as const,
										render: (value: string, row) =>
											formatDashboardMoney(value, row.currency),
									},
								]}
							/>
						</Card>
					</Col>
					<Col xs={24} xl={10}>
						<Card
							title={
								<Space>
									<AlertTriangle size={16} color="#a43b24" />
									<span>{copy("Risk Alerts", "风险提醒")}</span>
								</Space>
							}
						>
							<div className="grid gap-3">
								{riskAlerts.map((item) => (
									<Alert
										key={item.key}
										type={item.severity}
										showIcon
										message={
											<Flex justify="space-between" gap={12} align="center">
												<span>{item.title}</span>
												<Link href={item.href}>
													<Badge
														status="processing"
														text={copy("Open", "打开")}
													/>
												</Link>
											</Flex>
										}
										description={item.description}
									/>
								))}
							</div>
						</Card>
					</Col>
				</Row>

				<Row gutter={[16, 16]}>
					<Col xs={24} md={8}>
						<Card>
							<Flex gap={12} align="center">
								<Boxes size={22} color="#1d7053" />
								<div>
									<Typography.Text type="secondary">
										{copy("Sites", "站点管理")}
									</Typography.Text>
									<Typography.Title level={4} className="!mb-0 !mt-1">
										{data.sites.length}
									</Typography.Title>
								</div>
							</Flex>
						</Card>
					</Col>
					<Col xs={24} md={8}>
						<Card>
							<Flex gap={12} align="center">
								<PackageSearch size={22} color="#1d7053" />
								<div>
									<Typography.Text type="secondary">
										{copy("Vertical Attributes", "垂类属性")}
									</Typography.Text>
									<Typography.Title level={4} className="!mb-0 !mt-1">
										{data.productAttributes.length}
									</Typography.Title>
								</div>
							</Flex>
						</Card>
					</Col>
					<Col xs={24} md={8}>
						<Card>
							<Flex gap={12} align="center">
								<Activity size={22} color="#1d7053" />
								<div>
									<Typography.Text type="secondary">
										{copy("Audit Rows", "审计行")}
									</Typography.Text>
									<Typography.Title level={4} className="!mb-0 !mt-1">
										{data.operations.auditLogs.length}
									</Typography.Title>
								</div>
							</Flex>
						</Card>
					</Col>
				</Row>
			</div>
		</div>
	);
}
