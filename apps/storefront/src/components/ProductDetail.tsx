"use client";

import {
	ArrowLeft,
	Check,
	ChevronDown,
	Globe2,
	PackageCheck,
	ShieldCheck,
	ShoppingBag,
	Star,
	Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import {
	formatMoney,
	getProductAvailability,
} from "@/lib/commerce";
import type { StorefrontSiteContext } from "@/lib/site-context";
import {
	addCartItem,
	type StorefrontCart,
	getBrowserCartStorage,
	getOrCreateGuestToken,
} from "@/lib/storefront-cart";
import {
	type Currency,
	currencies,
	type Product,
	type ProductAttributeDefinition,
} from "@/lib/products";

type ProductDetailProps = {
	site: StorefrontSiteContext;
	product: Product;
	relatedProducts: Product[];
	attributeDefinitions: ProductAttributeDefinition[];
};

function getSupportedCurrency(currency: string): Currency {
	return currencies.includes(currency as Currency)
		? (currency as Currency)
		: "USD";
}

function availabilityClassName(status: ReturnType<typeof getProductAvailability>["status"]) {
	if (status === "out_of_stock") {
		return "border-[#e8c8c1] bg-[#fff1ee] text-[#a43b24]";
	}

	if (status === "low_stock") {
		return "border-[#e5dac0] bg-[#fff8e6] text-[#8a5a13]";
	}

	return "border-[#bbdfcc] bg-[#eef8f1] text-[#1d7053]";
}

function formatAttributeValue(value: unknown): string {
	if (Array.isArray(value)) {
		return value.map(formatAttributeValue).join(", ");
	}

	if (typeof value === "boolean") {
		return value ? "Yes" : "No";
	}

	if (typeof value === "string" || typeof value === "number") {
		return String(value);
	}

	if (value && typeof value === "object") {
		return JSON.stringify(value);
	}

	return "-";
}

export function ProductDetail({
	site,
	product,
	relatedProducts,
	attributeDefinitions,
}: ProductDetailProps) {
	const [currency, setCurrency] = useState<Currency>(
		getSupportedCurrency(site.defaultCurrency),
	);
	const [cart, setCart] = useState<StorefrontCart | null>(null);
	const [cartError, setCartError] = useState("");
	const [cartBusySkuId, setCartBusySkuId] = useState("");
	const availability = getProductAvailability(product);
	const isUnavailable = availability.status === "out_of_stock";
	const filterableAttributes = product.attributeValues?.filter((value) =>
		attributeDefinitions.some((attribute) => attribute.id === value.attributeId),
	);
	const cartQuantity = cart?.quantity ?? 0;
	const cartTotal = Number(cart?.totalAmount ?? "0");

	const addToCart = async (item: Product) => {
		const skuId = item.skuId;

		if (!skuId) {
			setCartError("This product has no sellable SKU for the current site.");
			return;
		}

		const guestToken = getOrCreateGuestToken(getBrowserCartStorage());
		setCartBusySkuId(skuId);
		setCartError("");

		try {
			setCart(
				await addCartItem({
					guestToken,
					currency,
					skuId,
					quantity: 1,
				}),
			);
		} catch (error) {
			setCartError(
				error instanceof Error ? error.message : "Failed to add cart item.",
			);
		} finally {
			setCartBusySkuId("");
		}
	};

	return (
		<main className="min-h-screen bg-[#f7f3eb] text-[#17221b]">
			<header className="border-b border-[#ded7ca] bg-white">
				<div className="mx-auto flex min-h-16 max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
					<div>
						<Link
							href="/products"
							className="inline-flex items-center gap-2 text-sm font-semibold text-[#1d7053]"
						>
							<ArrowLeft className="size-4" />
							Products
						</Link>
						<h1 className="mt-2 text-xl font-semibold tracking-normal">
							{product.name}
						</h1>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="inline-flex h-10 items-center gap-2 rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] px-3 text-sm font-semibold text-[#425149]">
							<Globe2 className="size-4 text-[#1d7053]" />
							{site.siteName}
						</span>
						<label className="relative">
							<span className="sr-only">Currency</span>
							<select
								value={currency}
								onChange={(event) =>
									setCurrency(event.target.value as Currency)
								}
								className="h-10 appearance-none rounded-sm border border-[#d9e1dc] bg-white px-3 pr-8 text-sm font-semibold text-[#17221b]"
							>
								{currencies.map((item) => (
									<option key={item} value={item}>
										{item}
									</option>
								))}
							</select>
							<ChevronDown className="pointer-events-none absolute right-2 top-3 size-4 text-[#65736b]" />
						</label>
					</div>
				</div>
			</header>

			<section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_440px] lg:px-8">
				<div className="relative min-h-[420px] overflow-hidden rounded-sm border border-[#ded7ca] bg-[#e7dfd0]">
					<Image
						src={product.image}
						alt={product.name}
						fill
						priority
						sizes="(min-width: 1024px) 60vw, 100vw"
						className="object-cover"
					/>
					<span className="absolute left-4 top-4 rounded-sm bg-white px-3 py-1 text-xs font-bold text-[#17221b] shadow-sm">
						{product.badge}
					</span>
				</div>

				<aside className="h-fit rounded-sm border border-[#ded7ca] bg-white p-5">
					<div className="flex items-center justify-between gap-3">
						<span className="text-xs font-bold uppercase tracking-[0.18em] text-[#1d7053]">
							{product.category}
						</span>
						<span className="inline-flex items-center gap-1 text-sm font-semibold text-[#8a5a13]">
							<Star className="size-4 fill-[#f3c969] text-[#f3c969]" />
							{product.rating} / {product.reviews}
						</span>
					</div>
					<h2 className="mt-4 text-3xl font-semibold tracking-normal">
						{product.name}
					</h2>
					<p className="mt-4 text-sm leading-7 text-[#5d6b62]">
						{product.description}
					</p>
					<div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
						<span
							className={`inline-flex h-8 items-center rounded-sm border px-3 ${availabilityClassName(
								availability.status,
							)}`}
						>
							{availability.label}
						</span>
						<span className="inline-flex h-8 items-center gap-2 rounded-sm bg-[#eef6f0] px-3 text-[#1d7053]">
							<PackageCheck className="size-4" />
							{product.skuCode ?? product.skuId ?? product.id}
						</span>
					</div>
					<div className="mt-6 flex items-end justify-between gap-3 border-t border-[#ede7dc] pt-5">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
								Landed display price
							</p>
							<p className="mt-1 text-3xl font-bold">
								{formatMoney(product.price, currency)}
							</p>
							{product.compareAt && (
								<p className="text-sm font-medium text-[#8f988f] line-through">
									{formatMoney(product.compareAt, currency)}
								</p>
							)}
						</div>
						<button
							type="button"
							onClick={() => {
								void addToCart(product);
							}}
							disabled={isUnavailable || cartBusySkuId === product.skuId}
							className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-[#17221b] px-5 text-sm font-bold text-white hover:bg-[#1d7053] disabled:cursor-not-allowed disabled:bg-[#b0a797]"
						>
							<ShoppingBag className="size-4" />
							{cartBusySkuId === product.skuId ? "Adding" : "Add to cart"}
						</button>
					</div>
					{cartError && (
						<p className="mt-3 rounded-sm border border-[#e8c8c1] bg-[#fff1ee] px-3 py-2 text-sm font-semibold text-[#a43b24]">
							{cartError}
						</p>
					)}

					<div className="mt-5 grid gap-3 rounded-sm bg-[#f8faf9] p-4">
						<div className="flex items-start gap-3">
							<Truck className="mt-0.5 size-4 text-[#1d7053]" />
							<div>
								<p className="font-semibold">Dispatch</p>
								<p className="text-sm text-[#65736b]">
									{product.origin} / {product.shipsIn}
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<ShieldCheck className="mt-0.5 size-4 text-[#1d7053]" />
							<div>
								<p className="font-semibold">Site scope</p>
								<p className="text-sm text-[#65736b]">
									{site.verticalName} / {site.brandName}
								</p>
							</div>
						</div>
						<div className="flex items-start gap-3">
							<Check className="mt-0.5 size-4 text-[#1d7053]" />
							<div>
								<p className="font-semibold">Cart session</p>
								<p className="text-sm text-[#65736b]">
									{cartQuantity} items / {formatMoney(cartTotal, currency)}
								</p>
							</div>
						</div>
					</div>
					{cartQuantity > 0 && (
						<Link
							href="/cart"
							className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm border border-[#1d7053] bg-white px-4 text-sm font-bold text-[#1d7053] hover:bg-[#eef8f1]"
						>
							<ShoppingBag className="size-4" />
							View cart
						</Link>
					)}
				</aside>
			</section>

			<section className="mx-auto grid max-w-7xl gap-5 px-4 pb-10 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
				<div className="rounded-sm border border-[#ded7ca] bg-white p-5">
					<h2 className="font-semibold">Dynamic attributes</h2>
					<div className="mt-4 grid gap-3">
						{filterableAttributes && filterableAttributes.length > 0 ? (
							filterableAttributes.map((attribute) => (
								<div
									key={`${attribute.attributeId}-${attribute.code}`}
									className="flex items-center justify-between gap-4 border-b border-[#ede7dc] pb-3 last:border-0 last:pb-0"
								>
									<span className="text-sm font-semibold text-[#425149]">
										{attribute.name}
									</span>
									<span className="text-right text-sm text-[#65736b]">
										{formatAttributeValue(attribute.value)}
									</span>
								</div>
							))
						) : (
							<p className="text-sm text-[#65736b]">
								This product still uses the migrated base fields. New vertical
								attributes will appear here as they are assigned.
							</p>
						)}
					</div>
				</div>
				<div className="rounded-sm border border-[#ded7ca] bg-white p-5">
					<h2 className="font-semibold">Commerce handoff checklist</h2>
					<div className="mt-4 grid gap-3 text-sm text-[#65736b]">
						<p>Site context is resolved by domain before catalog loading.</p>
						<p>SKU identity is preserved for cart, inventory and order snapshots.</p>
						<p>Inventory availability is read from catalog hints when the API provides it.</p>
					</div>
				</div>
			</section>

			{relatedProducts.length > 0 && (
				<section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
					<div className="mb-5 flex items-center justify-between gap-3">
						<h2 className="text-xl font-semibold">Related products</h2>
						<Link
							href="/products"
							className="text-sm font-semibold text-[#1d7053] hover:text-[#17221b]"
						>
							View all
						</Link>
					</div>
					<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{relatedProducts.map((relatedProduct) => (
							<ProductCard
								key={relatedProduct.id}
								product={relatedProduct}
								currency={currency}
								onAdd={addToCart}
							/>
						))}
					</div>
				</section>
			)}
		</main>
	);
}
