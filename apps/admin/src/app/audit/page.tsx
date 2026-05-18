import Link from "next/link";
import { ClipboardList, Fingerprint, Search, ShieldCheck } from "lucide-react";
import { AdminHeaderSwitchPanel } from "@/components/AdminHeaderSwitchPanel";
import { AdminPagination, AdminQueryPanel } from "@/components/AdminListControls";
import {
	formatAuditDateTime,
	loadAdminAuditLogs,
	shortAuditId,
} from "@/lib/admin-audit";
import {
	buildAdminListPath,
	normalizePage,
	normalizePageSize,
	paginateRows,
} from "@/lib/admin-list-controls";
import {
	loadSiteManagementData,
	type AdminScopeType,
} from "@/lib/admin-sites";

type AuditPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstSearchParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function normalizeScopeType(value: string | string[] | undefined): AdminScopeType {
	const raw = firstSearchParam(value);

	if (
		raw === "global" ||
		raw === "vertical" ||
		raw === "brand" ||
		raw === "site"
	) {
		return raw;
	}

	return "global";
}

function selectedScopeIdForSite(
	scopeType: AdminScopeType,
	site: Awaited<ReturnType<typeof loadSiteManagementData>>["sites"][number],
) {
	if (scopeType === "site") {
		return site.siteId;
	}

	if (scopeType === "vertical") {
		return site.verticalId;
	}

	if (scopeType === "brand") {
		return site.brandId;
	}

	return undefined;
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

export default async function AdminAuditPage({ searchParams }: AuditPageProps) {
	const params = await searchParams;
	const siteData = await loadSiteManagementData();
	const selectedSite =
		siteData.sites.find((site) => site.siteId === firstSearchParam(params.siteId)) ??
		siteData.sites[0];
	const scopeType = normalizeScopeType(params.scopeType);
	const scopeId =
		firstSearchParam(params.scopeId) ??
		(selectedSite ? selectedScopeIdForSite(scopeType, selectedSite) : undefined);
	const query = firstSearchParam(params.query);
	const action = firstSearchParam(params.action);
	const resourceType = firstSearchParam(params.resourceType);
	const page = normalizePage(params.page);
	const pageSize = normalizePageSize(params.pageSize);
	const auditLogs = await loadAdminAuditLogs({
		scopeType,
		...(scopeId ? { scopeId } : {}),
		...(query ? { query } : {}),
		...(action ? { action } : {}),
		...(resourceType ? { resourceType } : {}),
		limit: 100,
	});
	const adminActions = auditLogs.filter((log) => log.actorType === "admin");
	const pagination = paginateRows(auditLogs, { page, pageSize });
	const baseListParams = {
		scopeType,
		...(scopeId ? { scopeId } : {}),
		...(selectedSite ? { siteId: selectedSite.siteId } : {}),
		limit: 100,
		...(query ? { query } : {}),
		...(action ? { action } : {}),
		...(resourceType ? { resourceType } : {}),
		pageSize,
	};

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
							<h1 className="mt-1 text-2xl font-semibold">Audit Trail</h1>
							<p className="mt-1 max-w-2xl text-sm text-[#65736b]">
								Scoped audit logs for high-risk admin and system actions.
							</p>
						</div>
						<div className="grid justify-items-end gap-2">
							<AdminHeaderSwitchPanel
								className="lg:min-w-[520px]"
								groups={[
									{
										label: "Site",
										options: siteData.sites.map((site) => ({
											key: site.siteId,
											label: site.siteName,
											active: site.siteId === selectedSite?.siteId,
											href: buildAdminListPath("/audit", {
												scopeType,
												...(selectedScopeIdForSite(scopeType, site)
													? {
															scopeId: selectedScopeIdForSite(scopeType, site),
														}
													: {}),
												siteId: site.siteId,
												limit: 100,
												...(query ? { query } : {}),
												...(action ? { action } : {}),
												...(resourceType ? { resourceType } : {}),
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
												href: buildAdminListPath("/audit", {
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
													...(query ? { query } : {}),
													...(action ? { action } : {}),
													...(resourceType ? { resourceType } : {}),
													pageSize,
												}),
											}),
										),
									},
								]}
							/>
							<Link
								href="/rbac"
								className="inline-flex h-10 items-center justify-center rounded-sm border border-[#d9e1dc] bg-white px-3 text-sm font-bold text-[#425149] hover:border-[#1d7053]"
							>
								RBAC Scope
							</Link>
						</div>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<Metric
							icon={<ClipboardList className="size-4" />}
							label="Audit Rows"
							value={auditLogs.length}
						/>
						<Metric
							icon={<ShieldCheck className="size-4" />}
							label="Admin Actions"
							value={adminActions.length}
						/>
						<Metric
							icon={<Fingerprint className="size-4" />}
							label="Scope"
							value={scopeType}
						/>
						<Metric
							icon={<Search className="size-4" />}
							label="Query"
							value={query ?? "all"}
						/>
					</div>
				</div>
			</header>

			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
					<div className="border-b border-[#d9e1dc] px-4 py-3">
						<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
							Audit Log
						</p>
						<h2 className="mt-1 text-base font-semibold">
							{scopeType} {scopeId ? `/ ${shortAuditId(scopeId)}` : ""}
						</h2>
					</div>
					<AdminQueryPanel
						action="/audit"
						clearHref={buildAdminListPath("/audit", {
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
								placeholder: "actor, action, resource, request id",
							},
							{
								name: "action",
								label: "Action",
								type: "search",
								value: action,
								placeholder: "admin_scope.assign",
							},
							{
								name: "resourceType",
								label: "Resource",
								type: "search",
								value: resourceType,
								placeholder: "admin_user, order, payment",
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
						<table className="w-full min-w-[1160px] border-collapse text-left text-sm">
							<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
								<tr>
									<th className="px-4 py-3 font-bold">Action</th>
									<th className="px-4 py-3 font-bold">Resource</th>
									<th className="px-4 py-3 font-bold">Actor</th>
									<th className="px-4 py-3 font-bold">Scope</th>
									<th className="px-4 py-3 font-bold">Request</th>
									<th className="px-4 py-3 font-bold">Created</th>
								</tr>
							</thead>
							<tbody>
								{pagination.rows.map((log) => (
									<tr key={log.auditLogId} className="border-t border-[#edf1ef]">
										<td className="px-4 py-3">
											<p className="font-semibold">{log.action}</p>
											<p className="text-xs text-[#65736b]">
												{shortAuditId(log.auditLogId)}
											</p>
										</td>
										<td className="px-4 py-3">
											<p className="font-semibold">{log.resourceType}</p>
											<p className="text-xs text-[#65736b]">
												{log.resourceId ?? "-"}
											</p>
										</td>
										<td className="px-4 py-3">
											<p className="font-semibold">{log.actorType}</p>
											<p className="text-xs text-[#65736b]">
												{shortAuditId(log.actorId)}
											</p>
										</td>
										<td className="px-4 py-3 text-xs text-[#65736b]">
											<p>site {shortAuditId(log.siteId)}</p>
											<p>vertical {shortAuditId(log.verticalId)}</p>
											<p>brand {shortAuditId(log.brandId)}</p>
										</td>
										<td className="px-4 py-3 text-xs text-[#65736b]">
											<p>{log.requestId ?? "-"}</p>
											<p>{log.ipAddress ?? "-"}</p>
										</td>
										<td className="px-4 py-3 text-[#65736b]">
											{formatAuditDateTime(log.createdAt)}
										</td>
									</tr>
								))}
								{pagination.rows.length === 0 ? (
									<tr>
										<td colSpan={6} className="px-4 py-8 text-center text-[#65736b]">
											No audit logs are visible for this scope.
										</td>
									</tr>
								) : null}
							</tbody>
						</table>
					</div>
					<AdminPagination
						end={pagination.end}
						page={pagination.page}
						pageSize={pagination.pageSize}
						params={baseListParams}
						pathname="/audit"
						start={pagination.start}
						total={pagination.total}
						totalPages={pagination.totalPages}
					/>
				</section>
			</main>
		</div>
	);
}
