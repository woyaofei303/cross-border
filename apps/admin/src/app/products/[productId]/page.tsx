import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Boxes, ImageIcon, ListChecks, PackageSearch } from "lucide-react";
import { AdminProductActionsPanel } from "@/components/AdminProductActionsPanel";
import {
	formatCurrency,
	formatDateTime,
	loadAdminProductDetail,
	productStatusClassName,
	shortId,
} from "@/lib/admin-products";

type ProductDetailPageProps = {
	params: Promise<{ productId: string }>;
};

function StatusBadge({ status }: { status: string }) {
	return (
		<span
			className={`inline-flex h-7 items-center rounded-sm border px-2 text-xs font-bold ${productStatusClassName(
				status,
			)}`}
		>
			{status}
		</span>
	);
}

function Section({
	title,
	icon,
	count,
	children,
}: {
	title: string;
	icon: React.ReactNode;
	count?: number;
	children: React.ReactNode;
}) {
	return (
		<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
			<div className="flex items-center justify-between gap-3 border-b border-[#d9e1dc] px-4 py-3">
				<div className="flex items-center gap-2 text-[#1d7053]">
					{icon}
					<h2 className="text-base font-semibold text-[#17221b]">{title}</h2>
				</div>
				{count !== undefined ? (
					<span className="rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] px-2 py-1 text-xs font-bold text-[#425149]">
						{count} rows
					</span>
				) : null}
			</div>
			{children}
		</section>
	);
}

export default async function AdminProductDetailPage({
	params,
}: ProductDetailPageProps) {
	const { productId } = await params;
	const product = await loadAdminProductDetail(productId);

	if (!product) {
		notFound();
	}

	return (
		<div className="min-h-screen bg-[#f5f7f8] text-[#17221b]">
			<header className="border-b border-[#d9e1dc] bg-white">
				<div className="flex w-full flex-col gap-4 px-4 py-5 md:px-6">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<Link
								href="/products"
								className="text-xs font-bold uppercase tracking-[0.16em] text-[#1d7053]"
							>
								Products
							</Link>
							<h1 className="mt-1 text-2xl font-semibold">{product.title}</h1>
							<p className="mt-1 text-sm text-[#65736b]">
								{product.spuCode} / {product.slug} / {shortId(product.siteId)}
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<StatusBadge status={product.status} />
							<StatusBadge status={product.categoryName ?? "uncategorized"} />
						</div>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<div className="admin-metric-card p-4">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								SKUs
							</p>
							<p className="mt-2 text-2xl font-semibold">
								{product.activeSkuCount}/{product.skuCount}
							</p>
						</div>
						<div className="admin-metric-card p-4">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								Available
							</p>
							<p className="mt-2 text-2xl font-semibold">
								{product.availableQty}
							</p>
						</div>
						<div className="admin-metric-card p-4">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								Price From
							</p>
							<p className="mt-2 text-2xl font-semibold">
								{formatCurrency(product.minPrice, product.currency)}
							</p>
						</div>
						<div className="admin-metric-card p-4">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								Updated
							</p>
							<p className="mt-2 text-lg font-semibold">
								{formatDateTime(product.updatedAt)}
							</p>
						</div>
					</div>
				</div>
			</header>

			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<AdminProductActionsPanel product={product} />

				<section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
					<Section title="Product Context" icon={<PackageSearch className="size-4" />}>
						<div className="grid gap-3 p-4 text-sm">
							<p className="text-[#425149]">{product.description ?? "-"}</p>
							<p className="text-xs text-[#65736b]">
								SEO: {product.seoTitle ?? "-"} / {product.seoDescription ?? "-"}
							</p>
							<p className="text-xs text-[#65736b]">
								Tags: {product.tags.length > 0 ? product.tags.join(", ") : "-"}
							</p>
						</div>
					</Section>
					<Section
						title="Dynamic Attributes"
						icon={<ListChecks className="size-4" />}
						count={product.attributeValues.length}
					>
						<div className="grid gap-2 p-4 text-sm">
							{product.attributeValues.map((value) => (
								<div
									key={`${value.attributeId}:${value.code}`}
									className="rounded-sm border border-[#edf1ef] bg-[#f8faf9] p-3"
								>
									<p className="font-semibold">{value.name}</p>
									<p className="text-xs text-[#65736b]">
										{value.code}: {JSON.stringify(value.value)}
									</p>
								</div>
							))}
							{product.attributeValues.length === 0 ? (
								<p className="text-[#65736b]">No dynamic values are set.</p>
							) : null}
						</div>
					</Section>
				</section>

				<Section title="SKU Prices" icon={<Boxes className="size-4" />} count={product.skus.length}>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[900px] border-collapse text-left text-sm">
							<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
								<tr>
									<th className="px-4 py-3 font-bold">SKU</th>
									<th className="px-4 py-3 font-bold">Status</th>
									<th className="px-4 py-3 font-bold">Inventory</th>
									<th className="px-4 py-3 font-bold">Prices</th>
									<th className="px-4 py-3 font-bold">Attributes</th>
								</tr>
							</thead>
							<tbody>
								{product.skus.map((sku) => (
									<tr key={sku.skuId} className="border-t border-[#edf1ef]">
										<td className="px-4 py-3">
											<p className="font-semibold">{sku.skuCode}</p>
											<p className="text-xs text-[#65736b]">{sku.title ?? "-"}</p>
										</td>
										<td className="px-4 py-3">
											<StatusBadge status={sku.status} />
										</td>
										<td className="px-4 py-3 font-mono">
											A {sku.availableQty} / L {sku.lockedQty} / P{" "}
											{sku.physicalQty}
										</td>
										<td className="px-4 py-3">
											{sku.prices.length > 0
												? sku.prices
														.map((price) =>
															formatCurrency(
																price.salePrice ?? price.listPrice,
																price.currency,
															),
														)
														.join(", ")
												: "-"}
										</td>
										<td className="max-w-[280px] truncate px-4 py-3 text-xs text-[#65736b]">
											{JSON.stringify(sku.attributes)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Section>

				<Section title="Media" icon={<ImageIcon className="size-4" />} count={product.media.length}>
					<div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
						{product.media.map((media) => (
							<div
								key={media.mediaId}
								className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-[#f8faf9]"
							>
								<Image
									src={media.url}
									alt={media.altText ?? product.title}
									width={480}
									height={360}
									unoptimized
									className="aspect-[4/3] w-full object-cover"
								/>
								<div className="p-3 text-xs text-[#65736b]">
									{media.mediaType} / sort {media.sortOrder}
								</div>
							</div>
						))}
						{product.media.length === 0 ? (
							<p className="text-sm text-[#65736b]">No media is attached.</p>
						) : null}
					</div>
				</Section>
			</main>
		</div>
	);
}
