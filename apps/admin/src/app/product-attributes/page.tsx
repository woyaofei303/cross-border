import Link from "next/link";
import { Layers3, ListChecks, SlidersHorizontal } from "lucide-react";
import { AdminHeaderSwitchPanel } from "@/components/AdminHeaderSwitchPanel";
import {
	AdminPagination,
	AdminQueryPanel,
	AdminResourceTable,
} from "@/components/AdminListControls";
import { AdminProductAttributeActionsPanel } from "@/components/AdminProductAttributeActionsPanel";
import {
	buildAdminListPath,
	hasTextMatch,
	normalizePage,
	normalizePageSize,
	normalizeQuery,
	paginateRows,
} from "@/lib/admin-list-controls";
import {
	loadAdminProductAttributes,
	productAttributeStatusClassName,
	shortId,
} from "@/lib/admin-product-attributes";
import { loadSiteManagementData } from "@/lib/admin-sites";

type ProductAttributesPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstSearchParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function StatusBadge({ status }: { status: string }) {
	return (
		<span
			className={`inline-flex h-7 items-center rounded-sm border px-2 text-xs font-bold ${productAttributeStatusClassName(
				status,
			)}`}
		>
			{status}
		</span>
	);
}

export default async function AdminProductAttributesPage({
	searchParams,
}: ProductAttributesPageProps) {
	const params = await searchParams;
	const query = normalizeQuery(params.query);
	const statusFilter = firstSearchParam(params.status) ?? "";
	const typeFilter = firstSearchParam(params.type) ?? "";
	const page = normalizePage(params.page);
	const pageSize = normalizePageSize(params.pageSize);
	const data = await loadSiteManagementData();
	const selectedSite =
		data.sites.find((site) => site.siteId === firstSearchParam(params.siteId)) ??
		data.sites[0];
	const verticalId = firstSearchParam(params.verticalId) ?? selectedSite?.verticalId;
	const attributes = await loadAdminProductAttributes({
		...(verticalId ? { verticalId } : {}),
	});
	const filteredAttributes = attributes.filter((attribute) => {
		const matchesText = hasTextMatch(
			[
				attribute.code,
				attribute.name,
				attribute.type,
				attribute.status,
				...attribute.options.map((option) => option.label),
				...attribute.options.map((option) => option.value),
			],
			query,
		);
		const matchesStatus = statusFilter ? attribute.status === statusFilter : true;
		const matchesType = typeFilter ? attribute.type === typeFilter : true;

		return matchesText && matchesStatus && matchesType;
	});
	const pagination = paginateRows(filteredAttributes, {
		page,
		pageSize,
	});
	const selectedVertical = data.verticals.find(
		(vertical) => vertical.id === verticalId,
	);
	const filterableCount = attributes.filter((attribute) => attribute.filterable).length;
	const searchableCount = attributes.filter((attribute) => attribute.searchable).length;

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
							<h1 className="mt-1 text-2xl font-semibold">
								Vertical Attributes
							</h1>
							<p className="mt-1 max-w-3xl text-sm text-[#65736b]">
								Dynamic catalog attributes define which fields appear in product
								editing, storefront filters and search facets for this vertical.
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
										href: buildAdminListPath("/product-attributes", {
											siteId: site.siteId,
											verticalId: site.verticalId,
											...(query ? { query } : {}),
											...(statusFilter ? { status: statusFilter } : {}),
											...(typeFilter ? { type: typeFilter } : {}),
											pageSize,
										}),
									})),
								},
								{
									label: "Vertical",
									options: data.verticals.map((vertical) => ({
										key: vertical.id,
										label: vertical.name,
										active: vertical.id === verticalId,
										href: buildAdminListPath("/product-attributes", {
											...(selectedSite ? { siteId: selectedSite.siteId } : {}),
											verticalId: vertical.id,
											...(query ? { query } : {}),
											...(statusFilter ? { status: statusFilter } : {}),
											...(typeFilter ? { type: typeFilter } : {}),
											pageSize,
										}),
									})),
								},
							]}
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<div className="admin-metric-card p-4">
							<div className="admin-metric-label">
								<Layers3 className="size-4" />
								<p>Vertical</p>
							</div>
							<p className="admin-metric-value text-lg">
								{selectedVertical?.name ?? shortId(verticalId)}
							</p>
						</div>
						<div className="admin-metric-card p-4">
							<div className="admin-metric-label">
								<ListChecks className="size-4" />
								<p>Fields</p>
							</div>
							<p className="admin-metric-value">{attributes.length}</p>
						</div>
						<div className="admin-metric-card p-4">
							<div className="admin-metric-label">
								<SlidersHorizontal className="size-4" />
								<p>Filterable</p>
							</div>
							<p className="admin-metric-value">{filterableCount}</p>
						</div>
						<div className="admin-metric-card p-4">
							<div className="admin-metric-label">
								<SlidersHorizontal className="size-4" />
								<p>Searchable</p>
							</div>
							<p className="admin-metric-value">{searchableCount}</p>
						</div>
					</div>
				</div>
			</header>

			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
					<div className="border-b border-[#d9e1dc] px-4 py-3">
						<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
							Attribute Search
						</p>
						<h2 className="mt-1 text-base font-semibold">
							Filter editable fields before changing form and storefront facets.
						</h2>
					</div>
					<AdminQueryPanel
						action="/product-attributes"
						clearHref={buildAdminListPath("/product-attributes", {
							...(selectedSite ? { siteId: selectedSite.siteId } : {}),
							...(verticalId ? { verticalId } : {}),
						})}
						fields={[
							{
								name: "query",
								label: "Search",
								type: "search",
								value: query,
								placeholder: "code, name, option",
							},
							{
								name: "status",
								label: "Status",
								type: "select",
								value: statusFilter,
								options: [
									{ label: "All", value: "" },
									{ label: "Active", value: "active" },
									{ label: "Inactive", value: "inactive" },
									{ label: "Archived", value: "archived" },
								],
							},
							{
								name: "type",
								label: "Type",
								type: "select",
								value: typeFilter,
								options: [
									{ label: "All", value: "" },
									{ label: "Text", value: "text" },
									{ label: "Number", value: "number" },
									{ label: "Boolean", value: "boolean" },
									{ label: "Select", value: "select" },
									{ label: "Multiselect", value: "multiselect" },
									{ label: "JSON", value: "json" },
								],
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
							...(selectedSite ? { siteId: selectedSite.siteId } : {}),
							...(verticalId ? { verticalId } : {}),
						}}
					/>
				</section>

				{verticalId ? (
					<AdminProductAttributeActionsPanel
						verticalId={verticalId}
						attributes={pagination.rows}
						totalAttributes={filteredAttributes.length}
					/>
				) : null}

				<AdminResourceTable
					columns={[
						{
							key: "attribute",
							header: "Attribute",
							cell: (attribute) => (
								<>
									<p className="font-semibold">{attribute.name}</p>
									<p className="text-xs text-[#65736b]">
										sort {attribute.sortOrder}
									</p>
								</>
							),
						},
						{
							key: "code",
							header: "Code",
							className: "font-medium",
							cell: (attribute) => attribute.code,
						},
						{
							key: "type",
							header: "Type",
							cell: (attribute) => attribute.type,
						},
						{
							key: "status",
							header: "Status",
							cell: (attribute) => <StatusBadge status={attribute.status} />,
						},
						{
							key: "flags",
							header: "Flags",
							className: "text-xs text-[#65736b]",
							cell: (attribute) =>
								[
									attribute.required ? "required" : undefined,
									attribute.searchable ? "searchable" : undefined,
									attribute.filterable ? "filterable" : undefined,
								]
									.filter(Boolean)
									.join(", ") || "optional",
						},
						{
							key: "options",
							header: "Options",
							className: "text-[#425149]",
							cell: (attribute) =>
								attribute.options.length > 0
									? attribute.options.map((option) => option.label).join(", ")
									: "-",
						},
					]}
					emptyMessage="No attributes are configured for this vertical."
					minWidth={900}
					pagination={
						<AdminPagination
							end={pagination.end}
							page={pagination.page}
							pageSize={pagination.pageSize}
							params={{
								...(selectedSite ? { siteId: selectedSite.siteId } : {}),
								...(verticalId ? { verticalId } : {}),
								query,
								status: statusFilter,
								type: typeFilter,
							}}
							pathname="/product-attributes"
							start={pagination.start}
							total={pagination.total}
							totalPages={pagination.totalPages}
						/>
					}
					rowKey={(attribute) => attribute.id}
					rows={pagination.rows}
					subtitle={selectedVertical?.code ?? shortId(verticalId)}
					title="Attribute Definitions"
				/>
			</main>
		</div>
	);
}
