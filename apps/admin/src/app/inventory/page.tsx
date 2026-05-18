import Link from "next/link";
import { ArrowRightLeft, Boxes, LockKeyhole, Warehouse } from "lucide-react";
import { AdminHeaderSwitchPanel } from "@/components/AdminHeaderSwitchPanel";
import { AdminPagination, AdminQueryPanel } from "@/components/AdminListControls";
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
	formatDateTime,
	getSiteForInventoryItem,
	inventoryStatusClassName,
	loadAdminInventoryOperations,
	normalizeInventoryScopeType,
	selectedInventoryScopeIdForSite,
	shortId,
} from "@/lib/admin-inventory";

type InventoryPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstSearchParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function StatusBadge({ status }: { status: string }) {
	return (
		<span
			className={`inline-flex h-7 items-center rounded-sm border px-2 text-xs font-bold ${inventoryStatusClassName(
				status,
			)}`}
		>
			{status}
		</span>
	);
}

function QuantityChange({
	before,
	after,
}: {
	before: number;
	after: number;
}) {
	return (
		<span className="font-mono text-xs">
			{before} {"->"} {after}
		</span>
	);
}

export default async function AdminInventoryPage({
	searchParams,
}: InventoryPageProps) {
	const params = await searchParams;
	const data = await loadSiteManagementData();
	const selectedSite =
		data.sites.find((site) => site.siteId === firstSearchParam(params.siteId)) ??
		data.sites[0];
	const scopeType = normalizeInventoryScopeType(params.scopeType);
	const scopeId =
		firstSearchParam(params.scopeId) ??
		(selectedSite
			? selectedInventoryScopeIdForSite(scopeType, selectedSite)
			: undefined);
	const query = normalizeQuery(params.query);
	const lockStatus = firstSearchParam(params.lockStatus) ?? "";
	const movementType = firstSearchParam(params.movementType) ?? "";
	const dateFrom = normalizeQuery(params.dateFrom);
	const dateTo = normalizeQuery(params.dateTo);
	const page = normalizePage(params.page);
	const pageSize = normalizePageSize(params.pageSize);
	const inventoryData = await loadAdminInventoryOperations({
		scopeType,
		...(scopeId ? { scopeId } : {}),
		limit: 100,
	});
	const filteredBalances = inventoryData.inventoryBalances.filter((balance) => {
		const site = getSiteForInventoryItem(data.sites, balance);

		return (
			isWithinDateRange(balance.updatedAt, dateFrom, dateTo) &&
			hasTextMatch(
				[
					balance.skuCode,
					balance.skuTitle,
					balance.productTitle,
					balance.warehouseCode,
					balance.warehouseName,
					site?.siteName,
					site?.verticalCode,
					site?.brandCode,
				],
				query,
			)
		);
	});
	const filteredLocks = inventoryData.inventoryLocks.filter(
		(lock) =>
			(!lockStatus || lock.status === lockStatus) &&
			isWithinDateRange(lock.createdAt, dateFrom, dateTo) &&
			hasTextMatch(
				[
					lock.orderNo,
					lock.orderId,
					lock.skuCode,
					lock.warehouseCode,
					lock.status,
					lock.idempotencyKey,
				],
				query,
			),
	);
	const filteredTransactions = inventoryData.inventoryTransactions.filter(
		(transaction) =>
			(!movementType || transaction.type === movementType) &&
			isWithinDateRange(transaction.createdAt, dateFrom, dateTo) &&
			hasTextMatch(
				[
					transaction.type,
					transaction.orderNo,
					transaction.skuCode,
					transaction.warehouseCode,
					transaction.idempotencyKey,
				],
				query,
			),
	);
	const balancePagination = paginateRows(filteredBalances, { page, pageSize });
	const lockPagination = paginateRows(filteredLocks, { page, pageSize });
	const transactionPagination = paginateRows(filteredTransactions, {
		page,
		pageSize,
	});
	const totalAvailable = filteredBalances.reduce(
		(total, balance) => total + balance.availableQty,
		0,
	);
	const totalLocked = filteredBalances.reduce(
		(total, balance) => total + balance.lockedQty,
		0,
	);
	const activeLocks = filteredLocks.filter(
		(lock) => lock.status === "locked",
	);
	const baseListParams = {
		scopeType,
		...(scopeId ? { scopeId } : {}),
		...(selectedSite ? { siteId: selectedSite.siteId } : {}),
		limit: 100,
		...(query ? { query } : {}),
		...(lockStatus ? { lockStatus } : {}),
		...(movementType ? { movementType } : {}),
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
							<h1 className="mt-1 text-2xl font-semibold">Inventory</h1>
							<p className="mt-1 max-w-2xl text-sm text-[#65736b]">
								Scoped SKU balances, locks and stock movement traceability.
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
										href: buildAdminListPath("/inventory", {
											scopeType,
											...(selectedInventoryScopeIdForSite(scopeType, site)
												? {
														scopeId: selectedInventoryScopeIdForSite(
															scopeType,
															site,
														),
													}
												: {}),
											siteId: site.siteId,
											limit: 100,
											...(query ? { query } : {}),
											...(lockStatus ? { lockStatus } : {}),
											...(movementType ? { movementType } : {}),
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
											href: buildAdminListPath("/inventory", {
												scopeType: option,
												...(selectedSite &&
												selectedInventoryScopeIdForSite(option, selectedSite)
													? {
															scopeId: selectedInventoryScopeIdForSite(
																option,
																selectedSite,
															),
														}
													: {}),
												...(selectedSite ? { siteId: selectedSite.siteId } : {}),
												limit: 100,
												...(query ? { query } : {}),
												...(lockStatus ? { lockStatus } : {}),
												...(movementType ? { movementType } : {}),
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
								<Warehouse className="size-4" />
								<p className="text-xs font-bold uppercase tracking-[0.14em]">
									SKU Balances
								</p>
							</div>
							<p className="mt-2 text-2xl font-semibold">
								{filteredBalances.length}
							</p>
						</div>
						<div className="admin-metric-card p-4">
							<div className="flex items-center gap-2 text-[#1d7053]">
								<Boxes className="size-4" />
								<p className="text-xs font-bold uppercase tracking-[0.14em]">
									Available Units
								</p>
							</div>
							<p className="mt-2 text-2xl font-semibold">{totalAvailable}</p>
						</div>
						<div className="admin-metric-card p-4">
							<div className="flex items-center gap-2 text-[#1d7053]">
								<LockKeyhole className="size-4" />
								<p className="text-xs font-bold uppercase tracking-[0.14em]">
									Locked Units
								</p>
							</div>
							<p className="mt-2 text-2xl font-semibold">{totalLocked}</p>
						</div>
						<div className="admin-metric-card p-4">
							<div className="flex items-center gap-2 text-[#1d7053]">
								<ArrowRightLeft className="size-4" />
								<p className="text-xs font-bold uppercase tracking-[0.14em]">
									Transactions
								</p>
							</div>
							<p className="mt-2 text-2xl font-semibold">
								{filteredTransactions.length}
							</p>
						</div>
					</div>
				</div>
			</header>

			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
					<div className="border-b border-[#d9e1dc] px-4 py-3">
						<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
							Inventory Balances
						</p>
						<h2 className="mt-1 text-base font-semibold">
							{scopeType} {scopeId ? `/ ${shortId(scopeId)}` : ""}
						</h2>
					</div>
					<AdminQueryPanel
						action="/inventory"
						clearHref={buildAdminListPath("/inventory", {
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
								placeholder: "SKU, product, warehouse, order",
							},
							{
								name: "lockStatus",
								label: "Lock Status",
								type: "select",
								value: lockStatus,
								options: [
									{ label: "All", value: "" },
									{ label: "Locked", value: "locked" },
									{ label: "Released", value: "released" },
									{ label: "Deducted", value: "deducted" },
									{ label: "Expired", value: "expired" },
								],
							},
							{
								name: "movementType",
								label: "Movement",
								type: "select",
								value: movementType,
								options: [
									{ label: "All", value: "" },
									{ label: "Lock", value: "lock" },
									{ label: "Release", value: "release" },
									{ label: "Deduct", value: "deduct" },
									{ label: "Adjust", value: "adjust" },
									{ label: "Initial", value: "initial" },
									{ label: "Return Restock", value: "return_restock" },
								],
							},
							{
								name: "dateFrom",
								label: "Date From",
								type: "date",
								value: dateFrom,
							},
							{
								name: "dateTo",
								label: "Date To",
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
									<th className="px-4 py-3 font-bold">SKU</th>
									<th className="px-4 py-3 font-bold">Site</th>
									<th className="px-4 py-3 font-bold">Warehouse</th>
									<th className="px-4 py-3 font-bold">Available</th>
									<th className="px-4 py-3 font-bold">Locked</th>
									<th className="px-4 py-3 font-bold">Physical</th>
									<th className="px-4 py-3 font-bold">Inbound</th>
									<th className="px-4 py-3 font-bold">Safety</th>
									<th className="px-4 py-3 font-bold">Updated</th>
								</tr>
							</thead>
							<tbody>
								{balancePagination.rows.map((balance) => {
									const site = getSiteForInventoryItem(data.sites, balance);

									return (
										<tr
											key={`${balance.skuId}:${balance.warehouseId}`}
											className="border-t border-[#edf1ef]"
										>
											<td className="px-4 py-3">
												<p className="font-semibold">{balance.skuCode}</p>
												<p className="text-xs text-[#65736b]">
													{balance.skuTitle ?? balance.productTitle}
												</p>
											</td>
											<td className="px-4 py-3">
												<p className="font-medium">
													{site?.siteName ?? shortId(balance.siteId)}
												</p>
												<p className="text-xs text-[#65736b]">
													{site?.verticalCode ?? shortId(balance.verticalId)}
												</p>
											</td>
											<td className="px-4 py-3">
												<p className="font-semibold">{balance.warehouseCode}</p>
												<p className="text-xs text-[#65736b]">
													{balance.warehouseName}
												</p>
											</td>
											<td className="px-4 py-3 font-mono">
												{balance.availableQty}
											</td>
											<td className="px-4 py-3 font-mono">
												{balance.lockedQty}
											</td>
											<td className="px-4 py-3 font-mono">
												{balance.physicalQty}
											</td>
											<td className="px-4 py-3 font-mono">
												{balance.inboundQty}
											</td>
											<td className="px-4 py-3 font-mono">
												{balance.safetyQty}
											</td>
											<td className="px-4 py-3 text-xs text-[#65736b]">
												{formatDateTime(balance.updatedAt)}
											</td>
										</tr>
									);
								})}
								{balancePagination.total === 0 && (
									<tr>
										<td
											colSpan={9}
											className="px-4 py-10 text-center text-sm text-[#65736b]"
										>
											No inventory balances are visible for this scope.
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
					<AdminPagination
						end={balancePagination.end}
						page={balancePagination.page}
						pageSize={balancePagination.pageSize}
						params={baseListParams}
						pathname="/inventory"
						start={balancePagination.start}
						total={balancePagination.total}
						totalPages={balancePagination.totalPages}
					/>
				</section>

				<section className="grid gap-5 xl:grid-cols-[1fr_1.25fr]">
					<div className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
						<div className="border-b border-[#d9e1dc] px-4 py-3">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								Inventory Locks
							</p>
							<h2 className="mt-1 text-base font-semibold">
								Active locks: {activeLocks.length}
							</h2>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full min-w-[900px] border-collapse text-left text-sm">
								<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
									<tr>
										<th className="px-4 py-3 font-bold">Order</th>
										<th className="px-4 py-3 font-bold">SKU</th>
										<th className="px-4 py-3 font-bold">Status</th>
										<th className="px-4 py-3 font-bold">Qty</th>
										<th className="px-4 py-3 font-bold">Expiry</th>
										<th className="px-4 py-3 font-bold">Idempotency</th>
									</tr>
								</thead>
								<tbody>
									{lockPagination.rows.map((lock) => (
										<tr
											key={lock.inventoryLockId}
											className="border-t border-[#edf1ef]"
										>
											<td className="px-4 py-3">
												<Link
													href={`/orders/${lock.orderId}`}
													className="font-semibold text-[#1d7053]"
												>
													{lock.orderNo ?? shortId(lock.orderId)}
												</Link>
												<p className="text-xs text-[#65736b]">
													{formatDateTime(lock.createdAt)}
												</p>
											</td>
											<td className="px-4 py-3">
												<p className="font-semibold">
													{lock.skuCode ?? shortId(lock.skuId)}
												</p>
												<p className="text-xs text-[#65736b]">
													{lock.warehouseCode ?? shortId(lock.warehouseId)}
												</p>
											</td>
											<td className="px-4 py-3">
												<StatusBadge status={lock.status} />
											</td>
											<td className="px-4 py-3 font-mono">{lock.quantity}</td>
											<td className="px-4 py-3">
												<p className="text-xs text-[#65736b]">
													expires {formatDateTime(lock.expiresAt)}
												</p>
												<p className="text-xs text-[#65736b]">
													released {formatDateTime(lock.releasedAt)}
												</p>
												<p className="text-xs text-[#65736b]">
													deducted {formatDateTime(lock.deductedAt)}
												</p>
											</td>
											<td className="px-4 py-3 font-mono text-xs">
												{lock.idempotencyKey}
											</td>
										</tr>
									))}
									{lockPagination.total === 0 && (
										<tr>
											<td
												colSpan={6}
												className="px-4 py-8 text-center text-sm text-[#65736b]"
											>
												No inventory locks are visible for this scope.
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
						<AdminPagination
							end={lockPagination.end}
							page={lockPagination.page}
							pageSize={lockPagination.pageSize}
							params={baseListParams}
							pathname="/inventory"
							start={lockPagination.start}
							total={lockPagination.total}
							totalPages={lockPagination.totalPages}
						/>
					</div>

					<div className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
						<div className="border-b border-[#d9e1dc] px-4 py-3">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								Inventory Transactions
							</p>
							<h2 className="mt-1 text-base font-semibold">
								Before and after stock movements
							</h2>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full min-w-[1040px] border-collapse text-left text-sm">
								<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
									<tr>
										<th className="px-4 py-3 font-bold">Movement</th>
										<th className="px-4 py-3 font-bold">SKU</th>
										<th className="px-4 py-3 font-bold">Order</th>
										<th className="px-4 py-3 font-bold">Available</th>
										<th className="px-4 py-3 font-bold">Locked</th>
										<th className="px-4 py-3 font-bold">Physical</th>
										<th className="px-4 py-3 font-bold">Idempotency</th>
									</tr>
								</thead>
								<tbody>
									{transactionPagination.rows.map((transaction) => (
										<tr
											key={transaction.inventoryTransactionId}
											className="border-t border-[#edf1ef]"
										>
											<td className="px-4 py-3">
												<p>
													<StatusBadge status={transaction.type} />
												</p>
												<p className="mt-1 text-xs text-[#65736b]">
													Qty {transaction.quantity} /{" "}
													{formatDateTime(transaction.createdAt)}
												</p>
											</td>
											<td className="px-4 py-3">
												<p className="font-semibold">
													{transaction.skuCode ?? shortId(transaction.skuId)}
												</p>
												<p className="text-xs text-[#65736b]">
													{transaction.warehouseCode ??
														shortId(transaction.warehouseId)}
												</p>
											</td>
											<td className="px-4 py-3">
												{transaction.orderId ? (
													<Link
														href={`/orders/${transaction.orderId}`}
														className="font-semibold text-[#1d7053]"
													>
														{transaction.orderNo ?? shortId(transaction.orderId)}
													</Link>
												) : (
													<span className="text-[#65736b]">-</span>
												)}
											</td>
											<td className="px-4 py-3">
												<QuantityChange
													before={transaction.beforeAvailable}
													after={transaction.afterAvailable}
												/>
											</td>
											<td className="px-4 py-3">
												<QuantityChange
													before={transaction.beforeLocked}
													after={transaction.afterLocked}
												/>
											</td>
											<td className="px-4 py-3">
												<QuantityChange
													before={transaction.beforePhysical}
													after={transaction.afterPhysical}
												/>
											</td>
											<td className="px-4 py-3 font-mono text-xs">
												{transaction.idempotencyKey}
											</td>
										</tr>
									))}
									{transactionPagination.total === 0 && (
										<tr>
											<td
												colSpan={7}
												className="px-4 py-8 text-center text-sm text-[#65736b]"
											>
												No inventory transactions are visible for this scope.
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
							pathname="/inventory"
							start={transactionPagination.start}
							total={transactionPagination.total}
							totalPages={transactionPagination.totalPages}
						/>
					</div>
				</section>
			</main>
		</div>
	);
}
