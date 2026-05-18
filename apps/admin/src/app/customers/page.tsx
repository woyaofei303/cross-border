import Link from "next/link";
import { BadgeDollarSign, MapPin, UserRound, Users } from "lucide-react";
import { AdminHeaderSwitchPanel } from "@/components/AdminHeaderSwitchPanel";
import { AdminPagination, AdminQueryPanel } from "@/components/AdminListControls";
import {
	customerStatusClassName,
	formatCustomerMoney,
	loadAdminCustomers,
	normalizeCustomerScopeType,
	selectedCustomerScopeIdForSite,
	shortCustomerId,
} from "@/lib/admin-customers";
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

type CustomersPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstSearchParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function normalizeCustomerStatus(value: string | string[] | undefined) {
	const raw = firstSearchParam(value);

	return raw === "active" || raw === "disabled" || raw === "blocked"
		? raw
		: "";
}

function StatusBadge({ status }: { status: string }) {
	return (
		<span
			className={`inline-flex h-7 items-center rounded-sm border px-2 text-xs font-bold ${customerStatusClassName(
				status,
			)}`}
		>
			{status}
		</span>
	);
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
			<div className="admin-metric-label">
				{icon}
				<p>{label}</p>
			</div>
			<p className="admin-metric-value">{value}</p>
		</div>
	);
}

export default async function AdminCustomersPage({
	searchParams,
}: CustomersPageProps) {
	const params = await searchParams;
	const data = await loadSiteManagementData();
	const selectedSite =
		data.sites.find((site) => site.siteId === firstSearchParam(params.siteId)) ??
		data.sites[0];
	const scopeType = normalizeCustomerScopeType(params.scopeType);
	const scopeId =
		firstSearchParam(params.scopeId) ??
		(selectedSite
			? selectedCustomerScopeIdForSite(scopeType, selectedSite)
			: undefined);
	const query = normalizeQuery(params.query);
	const status = normalizeCustomerStatus(params.status);
	const dateFrom = normalizeQuery(params.dateFrom);
	const dateTo = normalizeQuery(params.dateTo);
	const page = normalizePage(params.page);
	const pageSize = normalizePageSize(params.pageSize);
	const customers = await loadAdminCustomers({
		scopeType,
		...(scopeId ? { scopeId } : {}),
		limit: 100,
	});
	const filteredCustomers = customers.filter(
		(customer) =>
			(!status || customer.status === status) &&
			isWithinDateRange(customer.createdAt, dateFrom, dateTo) &&
			hasTextMatch(
				[
					customer.nickname,
					customer.email,
					customer.phone,
					customer.guestToken,
					customer.membershipLevel,
					customer.globalUser?.email,
					customer.globalUser?.phone,
					customer.defaultAddress?.fullName,
					customer.defaultAddress?.countryCode,
					customer.defaultAddress?.city,
					customer.defaultAddress?.phone,
					customer.siteCustomerId,
				],
				query,
			),
	);
	const pagination = paginateRows(filteredCustomers, { page, pageSize });
	const customersWithAddress = filteredCustomers.filter(
		(customer) => customer.defaultAddress,
	).length;
	const totalOrders = filteredCustomers.reduce(
		(sum, customer) => sum + customer.orderCount,
		0,
	);
	const baseListParams = {
		scopeType,
		...(scopeId ? { scopeId } : {}),
		...(selectedSite ? { siteId: selectedSite.siteId } : {}),
		...(query ? { query } : {}),
		...(status ? { status } : {}),
		...(dateFrom ? { dateFrom } : {}),
		...(dateTo ? { dateTo } : {}),
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
							<h1 className="mt-1 text-2xl font-semibold">Site Customers</h1>
							<p className="mt-1 max-w-2xl text-sm text-[#65736b]">
								Scoped customer profiles, default addresses and order value.
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
										href: buildAdminListPath("/customers", {
											scopeType,
											...(selectedCustomerScopeIdForSite(scopeType, site)
												? {
														scopeId: selectedCustomerScopeIdForSite(
															scopeType,
															site,
														),
													}
												: {}),
											siteId: site.siteId,
											...(query ? { query } : {}),
											...(status ? { status } : {}),
											...(dateFrom ? { dateFrom } : {}),
											...(dateTo ? { dateTo } : {}),
											pageSize,
										}),
									})),
								},
								{
									label: "Data Scope",
									options: (["global", "vertical", "brand", "site"] as const).map(
										(scopeOption) => {
											const optionScopeId = selectedSite
												? selectedCustomerScopeIdForSite(
														scopeOption,
														selectedSite,
													)
												: undefined;

											return {
												key: scopeOption,
												label: scopeOption,
												active: scopeType === scopeOption,
												href: buildAdminListPath("/customers", {
													scopeType: scopeOption,
													...(optionScopeId ? { scopeId: optionScopeId } : {}),
													...(selectedSite ? { siteId: selectedSite.siteId } : {}),
													...(query ? { query } : {}),
													...(status ? { status } : {}),
													...(dateFrom ? { dateFrom } : {}),
													...(dateTo ? { dateTo } : {}),
													pageSize,
												}),
											};
										},
									),
								},
							]}
						/>
					</div>

					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<Metric
							icon={<Users className="size-4" />}
							label="Customers"
							value={filteredCustomers.length}
						/>
						<Metric
							icon={<MapPin className="size-4" />}
							label="With Address"
							value={customersWithAddress}
						/>
						<Metric
							icon={<UserRound className="size-4" />}
							label="Orders"
							value={totalOrders}
						/>
						<Metric
							icon={<BadgeDollarSign className="size-4" />}
							label="Scope"
							value={scopeType}
						/>
					</div>
				</div>
			</header>

			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
					<div className="flex flex-col gap-2 border-b border-[#d9e1dc] px-4 py-3 md:flex-row md:items-center md:justify-between">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								Customer Profiles
							</p>
							<h2 className="mt-1 text-base font-semibold">
								{selectedSite?.siteName ?? "Global"}
							</h2>
						</div>
					</div>
					<AdminQueryPanel
						action="/customers"
						clearHref={buildAdminListPath("/customers", {
							scopeType,
							...(scopeId ? { scopeId } : {}),
							...(selectedSite ? { siteId: selectedSite.siteId } : {}),
							pageSize,
						})}
						fields={[
							{
								name: "query",
								label: "Search",
								type: "search",
								value: query,
								placeholder: "Email, phone, name, guest token",
							},
							{
								name: "status",
								label: "Status",
								type: "select",
								value: status,
								options: [
									{ label: "All", value: "" },
									{ label: "Active", value: "active" },
									{ label: "Disabled", value: "disabled" },
									{ label: "Blocked", value: "blocked" },
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
						}}
					/>

					<div className="overflow-x-auto">
						<table className="w-full min-w-[1040px] border-collapse text-left text-sm">
							<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
								<tr>
									<th className="px-4 py-3 font-bold">Customer</th>
									<th className="px-4 py-3 font-bold">Scope</th>
									<th className="px-4 py-3 font-bold">Status</th>
									<th className="px-4 py-3 font-bold">Orders</th>
									<th className="px-4 py-3 font-bold">Spend</th>
									<th className="px-4 py-3 font-bold">Default Address</th>
								</tr>
							</thead>
							<tbody>
								{pagination.rows.map((customer) => (
									<tr
										key={customer.siteCustomerId}
										className="border-t border-[#edf1ef]"
									>
										<td className="px-4 py-3">
											<p className="font-semibold">
												{customer.nickname ??
													customer.email ??
													customer.guestToken ??
													shortCustomerId(customer.siteCustomerId)}
											</p>
											<p className="text-xs text-[#65736b]">
												{customer.email ?? "No email"}
											</p>
											<p className="mt-1 text-xs text-[#65736b]">
												global {shortCustomerId(customer.globalUserId)}
											</p>
										</td>
										<td className="px-4 py-3 text-xs text-[#65736b]">
											<p>site {shortCustomerId(customer.siteId)}</p>
											<p>vertical {shortCustomerId(customer.verticalId)}</p>
											<p>brand {shortCustomerId(customer.brandId)}</p>
										</td>
										<td className="px-4 py-3">
											<StatusBadge status={customer.status} />
										</td>
										<td className="px-4 py-3 font-semibold">
											{customer.orderCount}
										</td>
										<td className="px-4 py-3 font-semibold">
											{formatCustomerMoney(
												customer.lifetimeSpend,
												customer.currency ?? selectedSite?.defaultCurrency ?? "USD",
											)}
										</td>
										<td className="px-4 py-3 text-[#425149]">
											{customer.defaultAddress ? (
												<div>
													<p className="font-semibold">
														{customer.defaultAddress.fullName}
													</p>
													<p className="text-xs text-[#65736b]">
														{customer.defaultAddress.addressLine1},{" "}
														{customer.defaultAddress.city}
													</p>
												</div>
											) : (
												<span className="text-xs text-[#65736b]">No address</span>
											)}
										</td>
									</tr>
								))}
								{pagination.total === 0 ? (
									<tr>
										<td
											colSpan={6}
											className="px-4 py-8 text-center text-sm text-[#65736b]"
										>
											No site customers are visible for this scope.
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
						pathname="/customers"
						start={pagination.start}
						total={pagination.total}
						totalPages={pagination.totalPages}
					/>
				</section>
			</main>
		</div>
	);
}
