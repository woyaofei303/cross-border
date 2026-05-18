"use client";

import { Alert, Button, Input, Select } from "antd";
import { CheckCircle2, PackageCheck, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
	AdminProductDetail,
	ProductStatus,
	ProductSkuStatus,
} from "@/lib/admin-products";

type AdminProductActionsPanelProps = {
	product: AdminProductDetail;
};

type ActionMessage = {
	type: "success" | "error";
	text: string;
};

const productStatuses: ProductStatus[] = [
	"draft",
	"active",
	"inactive",
	"archived",
];

const skuStatuses: ProductSkuStatus[] = ["active", "inactive", "archived"];
const productStatusOptions = productStatuses.map((status) => ({
	label: status,
	value: status,
}));
const skuStatusOptions = skuStatuses.map((status) => ({
	label: status,
	value: status,
}));

async function postJson(pathname: string, body: Record<string, unknown>) {
	const response = await fetch(pathname, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	const payload = (await response.json().catch(() => ({}))) as {
		message?: string;
		error?: string;
	};

	if (!response.ok) {
		throw new Error(payload.message ?? payload.error ?? "Request failed.");
	}

	return payload;
}

export function AdminProductActionsPanel({
	product,
}: AdminProductActionsPanelProps) {
	const router = useRouter();
	const [productStatus, setProductStatus] = useState<ProductStatus>(
		product.status,
	);
	const [message, setMessage] = useState<ActionMessage | undefined>();
	const [isPending, startTransition] = useTransition();

	function runAction(action: () => Promise<void>) {
		setMessage(undefined);
		startTransition(async () => {
			try {
				await action();
				setMessage({ type: "success", text: "Catalog changes saved." });
				router.refresh();
			} catch (error) {
				setMessage({
					type: "error",
					text: error instanceof Error ? error.message : String(error),
				});
			}
		});
	}

	return (
		<section className="rounded-sm border border-[#d9e1dc] bg-white p-4">
			<div className="flex flex-col gap-2 border-b border-[#edf1ef] pb-3 md:flex-row md:items-center md:justify-between">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
						Catalog Actions
					</p>
					<h2 className="mt-1 text-base font-semibold">
						{product.spuCode} / {product.status}
					</h2>
				</div>
				<p className="text-sm text-[#65736b]">
					Status controls storefront visibility; SKU price controls display price.
				</p>
			</div>

			<div className="mt-4 grid gap-3 xl:grid-cols-[0.8fr_1.6fr]">
				<form
					className="grid content-start gap-3 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3"
					onSubmit={(event) => {
						event.preventDefault();
						runAction(async () => {
							await postJson(`/api/admin/products/${product.productId}/status`, {
								status: productStatus,
							});
						});
					}}
				>
					<div className="flex items-center gap-2 text-[#1d7053]">
						<PackageCheck className="size-4" />
						<p className="text-sm font-semibold">Product Status</p>
					</div>
					<label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
						Status
						<Select<ProductStatus>
							value={productStatus}
							onChange={setProductStatus}
							options={productStatusOptions}
							className="normal-case tracking-normal"
						/>
					</label>
					<Button
						htmlType="submit"
						type="primary"
						loading={isPending}
						disabled={isPending}
						icon={<CheckCircle2 size={16} />}
						className="w-full"
					>
						Save Product
					</Button>
				</form>

				<div className="grid gap-3">
					{product.skus.map((sku) => {
						const price = sku.prices[0];

						return (
							<SkuUpdateForm
								key={sku.skuId}
								skuId={sku.skuId}
								skuCode={sku.skuCode}
								initialTitle={sku.title ?? ""}
								initialStatus={sku.status}
								initialCurrency={price?.currency ?? product.currency ?? "USD"}
								initialListPrice={price?.listPrice ?? product.minPrice ?? "0.00"}
								initialSalePrice={price?.salePrice ?? ""}
								isPending={isPending}
								onSubmit={(body) =>
									runAction(async () => {
										await postJson(`/api/admin/skus/${sku.skuId}/update`, body);
									})
								}
							/>
						);
					})}
				</div>
			</div>

			{message ? (
				<Alert
					className="mt-3"
					type={message.type}
					message={message.text}
					showIcon
				/>
			) : null}
		</section>
	);
}

function SkuUpdateForm({
	skuId,
	skuCode,
	initialTitle,
	initialStatus,
	initialCurrency,
	initialListPrice,
	initialSalePrice,
	isPending,
	onSubmit,
}: {
	skuId: string;
	skuCode: string;
	initialTitle: string;
	initialStatus: ProductSkuStatus;
	initialCurrency: string;
	initialListPrice: string;
	initialSalePrice: string;
	isPending: boolean;
	onSubmit: (body: Record<string, unknown>) => void;
}) {
	const [title, setTitle] = useState(initialTitle);
	const [status, setStatus] = useState<ProductSkuStatus>(initialStatus);
	const [currency, setCurrency] = useState(initialCurrency);
	const [listPrice, setListPrice] = useState(initialListPrice);
	const [salePrice, setSalePrice] = useState(initialSalePrice);

	return (
		<form
			className="grid gap-3 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3"
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit({
					title: title.trim() || undefined,
					status,
					currency: currency.trim().toUpperCase(),
					listPrice,
					salePrice: salePrice.trim() || null,
				});
			}}
		>
			<div className="flex items-center justify-between gap-3">
				<div>
					<p className="font-semibold">{skuCode}</p>
					<p className="text-xs text-[#65736b]">{skuId.slice(0, 8)}</p>
				</div>
				<Save className="size-4 text-[#1d7053]" />
			</div>
			<div className="grid gap-2 md:grid-cols-5">
				<label className="grid gap-1 md:col-span-2">
					<span className="text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
						Title
					</span>
					<Input
						value={title}
						onChange={(event) => setTitle(event.target.value)}
					/>
				</label>
				<label className="grid gap-1">
					<span className="text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
						Status
					</span>
					<Select<ProductSkuStatus>
						value={status}
						onChange={setStatus}
						options={skuStatusOptions}
					/>
				</label>
				<label className="grid gap-1">
					<span className="text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
						List
					</span>
					<Input
						value={listPrice}
						onChange={(event) => setListPrice(event.target.value)}
					/>
				</label>
				<label className="grid gap-1">
					<span className="text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
						Sale
					</span>
					<Input
						value={salePrice}
						onChange={(event) => setSalePrice(event.target.value)}
					/>
				</label>
			</div>
			<div className="flex items-center justify-between gap-3">
				<Input
					value={currency}
					onChange={(event) => setCurrency(event.target.value)}
					className="w-24 uppercase"
					aria-label="Currency"
				/>
				<Button
					htmlType="submit"
					disabled={isPending}
					loading={isPending}
					icon={<Save size={16} />}
				>
					Save SKU
				</Button>
			</div>
		</form>
	);
}
