import Link from "next/link";
import { Boxes, FolderTree, PackageSearch, Tags } from "lucide-react";
import { AdminCategoryActionsPanel } from "@/components/AdminCategoryActionsPanel";
import { AdminHeaderSwitchPanel } from "@/components/AdminHeaderSwitchPanel";
import { AdminPagination, AdminQueryPanel } from "@/components/AdminListControls";
import {
	buildAdminListPath,
	hasTextMatch,
	normalizePage,
	normalizePageSize,
	normalizeQuery,
	paginateRows,
} from "@/lib/admin-list-controls";
import {
	buildAdminProductsPath,
	formatCurrency,
	formatDateTime,
	getSiteForProduct,
	loadAdminProductCategories,
	loadAdminProducts,
	normalizeProductScopeType,
	normalizeProductStatus,
	productStatusClassName,
	selectedProductScopeIdForSite,
	shortId,
} from "@/lib/admin-products";
import { loadSiteManagementData } from "@/lib/admin-sites";

type ProductsPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstSearchParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function StatusBadge({ status }: { status: string }) {
	return (
		<span
			className={`inline-flex h-7 items-center justify-center rounded-sm border px-2 text-xs font-bold ${productStatusClassName(
				status,
			)}`}
		>
			{status}
		</span>
	);
}

function statusLabel(status: "all" | "draft" | "active" | "inactive" | "archived") {
	const labels: Record<typeof status, string> = {
		all: "All",
		draft: "Draft",
		active: "Active",
		inactive: "Inactive",
		archived: "Archived",
	};

	return labels[status];
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

export default async function AdminProductsPage({
	searchParams,
}: ProductsPageProps) {
	const params = await searchParams;
	const data = await loadSiteManagementData();
	const selectedSite =
		data.sites.find((site) => site.siteId === firstSearchParam(params.siteId)) ??
		data.sites[0];
	const scopeType = normalizeProductScopeType(params.scopeType);
	const scopeId =
		firstSearchParam(params.scopeId) ??
		(selectedSite
			? selectedProductScopeIdForSite(scopeType, selectedSite)
			: undefined);
	const normalizedStatus = normalizeProductStatus(params.status);
	const query = normalizeQuery(params.query);
	const page = normalizePage(params.page);
	const pageSize = normalizePageSize(params.pageSize);
	const catalogQuery = {
		scopeType,
		...(scopeId ? { scopeId } : {}),
		limit: 100,
		...(normalizedStatus ? { status: normalizedStatus } : {}),
	} satisfies Parameters<typeof loadAdminProducts>[0];
	const [products, categories] = await Promise.all([
		loadAdminProducts(catalogQuery),
		loadAdminProductCategories({
			scopeType,
			...(scopeId ? { scopeId } : {}),
			limit: 100,
		}),
	]);
	const filteredProducts = products.filter((product) => {
		const site = getSiteForProduct(data.sites, product);

		return hasTextMatch(
			[
				product.title,
				product.spuCode,
				product.slug,
				product.categoryName,
				product.status,
				site?.siteName,
				site?.verticalCode,
				site?.brandCode,
			],
			query,
		);
	});
	const pagination = paginateRows(filteredProducts, { page, pageSize });
	const activeProducts = filteredProducts.filter(
		(product) => product.status === "active",
	);
	const totalSkus = filteredProducts.reduce(
		(total, product) => total + product.skuCount,
		0,
	);
	const totalAvailable = filteredProducts.reduce(
		(total, product) => total + product.availableQty,
		0,
	);
	const baseListParams = {
		scopeType,
		...(scopeId ? { scopeId } : {}),
		...(selectedSite ? { siteId: selectedSite.siteId } : {}),
		limit: 100,
		...(normalizedStatus ? { status: normalizedStatus } : {}),
		...(query ? { query } : {}),
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
							<h1 className="mt-1 text-2xl font-semibold">Products</h1>
							<p className="mt-1 max-w-2xl text-sm text-[#65736b]">
								Scoped product, SKU, price and category operations.
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
										href: buildAdminProductsPath({
											scopeType,
											...(selectedProductScopeIdForSite(scopeType, site)
												? {
														scopeId: selectedProductScopeIdForSite(
															scopeType,
															site,
														),
													}
												: {}),
											siteId: site.siteId,
											limit: 100,
											...(normalizedStatus ? { status: normalizedStatus } : {}),
											...(query ? { query } : {}),
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
											href: buildAdminProductsPath({
												scopeType: option,
												...(selectedSite &&
												selectedProductScopeIdForSite(option, selectedSite)
													? {
															scopeId: selectedProductScopeIdForSite(
																option,
																selectedSite,
															),
														}
													: {}),
												...(selectedSite ? { siteId: selectedSite.siteId } : {}),
												limit: 100,
												...(normalizedStatus ? { status: normalizedStatus } : {}),
												...(query ? { query } : {}),
												pageSize,
											}),
										}),
									),
								},
							]}
						/>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<Metric
							icon={<PackageSearch className="size-4" />}
							label="Products"
							value={filteredProducts.length}
						/>
						<Metric
							icon={<Boxes className="size-4" />}
							label="Active"
							value={activeProducts.length}
						/>
						<Metric
							icon={<Tags className="size-4" />}
							label="SKUs"
							value={totalSkus}
						/>
						<Metric
							icon={<FolderTree className="size-4" />}
							label="Available"
							value={totalAvailable}
						/>
					</div>
				</div>
			</header>

			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
					<div className="flex flex-col gap-3 border-b border-[#d9e1dc] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								Product Catalog
							</p>
							<h2 className="mt-1 text-base font-semibold">
								{scopeType} {scopeId ? `/ ${shortId(scopeId)}` : ""}
							</h2>
						</div>
						<div className="admin-pill-switch">
							{(["all", "draft", "active", "inactive", "archived"] as const).map(
								(option) => (
									<Link
										key={option}
										href={buildAdminProductsPath({
											scopeType,
											...(scopeId ? { scopeId } : {}),
											...(selectedSite ? { siteId: selectedSite.siteId } : {}),
											limit: 100,
											...(option === "all" ? {} : { status: option }),
											...(query ? { query } : {}),
											pageSize,
										})}
										className={
											(normalizedStatus ?? "all") === option
												? "is-active"
												: undefined
										}
									>
										{statusLabel(option)}
									</Link>
								),
							)}
						</div>
					</div>
					<AdminQueryPanel
						action="/products"
						clearHref={buildAdminListPath("/products", {
							scopeType,
							...(scopeId ? { scopeId } : {}),
							...(selectedSite ? { siteId: selectedSite.siteId } : {}),
							limit: 100,
							...(normalizedStatus ? { status: normalizedStatus } : {}),
							pageSize,
						})}
						fields={[
							{
								name: "query",
								label: "Search",
								type: "search",
								value: query,
								placeholder: "Product, SPU, slug, category",
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
							...(normalizedStatus ? { status: normalizedStatus } : {}),
						}}
					/>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[1100px] border-collapse text-left text-sm">
							<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
								<tr>
									<th className="px-4 py-3 font-bold">Product</th>
									<th className="px-4 py-3 font-bold">Site</th>
									<th className="px-4 py-3 font-bold">Category</th>
									<th className="px-4 py-3 font-bold">Status</th>
									<th className="px-4 py-3 font-bold">SKUs</th>
									<th className="px-4 py-3 font-bold">Available</th>
									<th className="px-4 py-3 font-bold">Price</th>
									<th className="px-4 py-3 font-bold">Updated</th>
								</tr>
							</thead>
							<tbody>
								{pagination.rows.map((product) => {
									const site = getSiteForProduct(data.sites, product);

									return (
										<tr
											key={product.productId}
											className="border-t border-[#edf1ef]"
										>
											<td className="px-4 py-3">
												<Link
													href={`/products/${product.productId}`}
													className="font-semibold text-[#1d7053]"
												>
													{product.title}
												</Link>
												<p className="text-xs text-[#65736b]">
													{product.spuCode} / {product.slug}
												</p>
											</td>
											<td className="px-4 py-3">
												<p className="font-medium">
													{site?.siteName ?? shortId(product.siteId)}
												</p>
												<p className="text-xs text-[#65736b]">
													{site?.verticalCode ?? shortId(product.verticalId)}
												</p>
											</td>
											<td className="px-4 py-3">
												{product.categoryName ?? "-"}
											</td>
											<td className="px-4 py-3">
												<StatusBadge status={product.status} />
											</td>
											<td className="px-4 py-3 font-mono">
												{product.activeSkuCount}/{product.skuCount}
											</td>
											<td className="px-4 py-3 font-mono">
												{product.availableQty}
											</td>
											<td className="px-4 py-3">
												{formatCurrency(product.minPrice, product.currency)}
											</td>
											<td className="px-4 py-3 text-[#65736b]">
												{formatDateTime(product.updatedAt)}
											</td>
										</tr>
									);
								})}
								{pagination.total === 0 && (
									<tr>
										<td
											colSpan={8}
											className="px-4 py-8 text-center text-sm text-[#65736b]"
										>
											No products are available for this scope.
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
						pathname="/products"
						start={pagination.start}
						total={pagination.total}
						totalPages={pagination.totalPages}
					/>
				</section>

				<AdminCategoryActionsPanel categories={categories} />
			</main>
		</div>
	);
}
