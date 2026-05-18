"use client";

import {
	ArrowLeft,
	Check,
	ChevronDown,
	Globe2,
	Search,
	ShoppingBag,
	SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import {
	filterProducts,
	formatMoney,
	getAttributeFilterOptions,
} from "@/lib/commerce";
import type { StorefrontSiteContext } from "@/lib/site-context";
import {
	addCartItem,
	fetchCurrentCart,
	getBrowserCartStorage,
	getOrCreateGuestToken,
	type StorefrontCart,
} from "@/lib/storefront-cart";
import {
	type Currency,
	currencies,
	type Product,
	type ProductAttributeDefinition,
} from "@/lib/products";

type ProductDiscoveryProps = {
	site: StorefrontSiteContext;
	productCatalog: Product[];
	categoryCatalog: string[];
	attributeDefinitions: ProductAttributeDefinition[];
	initialCategory?: string;
};

function getSupportedCurrency(currency: string): Currency {
	return currencies.includes(currency as Currency)
		? (currency as Currency)
		: "USD";
}

function getInitialCategory(categoryCatalog: string[], category?: string) {
	if (category && categoryCatalog.includes(category)) {
		return category;
	}

	return categoryCatalog[0] ?? "All";
}

export function ProductDiscovery({
	site,
	productCatalog,
	categoryCatalog,
	attributeDefinitions,
	initialCategory,
}: ProductDiscoveryProps) {
	const [currency, setCurrency] = useState<Currency>(
		getSupportedCurrency(site.defaultCurrency),
	);
	const [category, setCategory] = useState(
		getInitialCategory(categoryCatalog, initialCategory),
	);
	const [attributeFilters, setAttributeFilters] = useState<
		Record<string, string>
	>({});
	const [cart, setCart] = useState<StorefrontCart | null>(null);
	const [cartError, setCartError] = useState("");
	const visibleProducts = useMemo(
		() => filterProducts(category, productCatalog, attributeFilters),
		[attributeFilters, category, productCatalog],
	);
	const attributeFilterOptions = useMemo(
		() => getAttributeFilterOptions(productCatalog, attributeDefinitions),
		[attributeDefinitions, productCatalog],
	);

	const cartQuantity = cart?.quantity ?? 0;
	const cartTotal = Number(cart?.totalAmount ?? "0");

	const addToCart = async (product: Product) => {
		const skuId = product.skuId;

		if (!skuId) {
			setCartError("This product has no sellable SKU for the current site.");
			return;
		}

		const guestToken = getOrCreateGuestToken(getBrowserCartStorage());
		setCartError("");

		try {
			const nextCart = await addCartItem({
				guestToken,
				currency,
				skuId,
				quantity: 1,
			});
			setCart(nextCart);
		} catch (error) {
			setCartError(
				error instanceof Error ? error.message : "Failed to add cart item.",
			);
		}
	};

	const refreshCart = async () => {
		const guestToken = getOrCreateGuestToken(getBrowserCartStorage());
		setCartError("");

		try {
			setCart(await fetchCurrentCart({ guestToken, currency }));
		} catch (error) {
			setCartError(
				error instanceof Error ? error.message : "Failed to load cart.",
			);
		}
	};

	const toggleAttributeFilter = (code: string, value: string) => {
		setAttributeFilters((filters) => ({
			...filters,
			[code]: filters[code] === value ? "" : value,
		}));
	};

	return (
		<main className="min-h-screen bg-[#f7f3eb] text-[#17221b]">
			<header className="border-b border-[#ded7ca] bg-white">
				<div className="mx-auto flex min-h-16 max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
					<div>
						<Link
							href="/"
							className="inline-flex items-center gap-2 text-sm font-semibold text-[#1d7053]"
						>
							<ArrowLeft className="size-4" />
							Home
						</Link>
						<h1 className="mt-2 text-2xl font-semibold tracking-normal">
							{site.siteName} products
						</h1>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="inline-flex h-10 items-center gap-2 rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] px-3 text-sm font-semibold text-[#425149]">
							<Globe2 className="size-4 text-[#1d7053]" />
							{site.verticalName}
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

			<section className="border-b border-[#ded7ca] bg-[#17221b] text-white">
				<div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_360px] lg:items-end lg:px-8">
					<div>
						<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f3c969]">
							Site-scoped catalog
						</p>
						<h2 className="mt-3 max-w-3xl text-4xl font-semibold tracking-normal">
							Browse only products assigned to the current site context.
						</h2>
						<p className="mt-4 max-w-2xl text-sm leading-6 text-white/72">
							The storefront resolves site by domain, then loads categories,
							vertical attributes, pricing and inventory hints for this site.
						</p>
					</div>
					<div className="grid gap-2 border border-white/12 bg-white/8 p-4">
						<div className="flex items-center justify-between text-sm">
							<span className="text-white/68">Visible SKUs</span>
							<span className="font-semibold">{visibleProducts.length}</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-white/68">Cart lines</span>
							<span className="font-semibold">{cartQuantity}</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-white/68">Cart total</span>
							<span className="font-semibold">
								{formatMoney(cartTotal, currency)}
							</span>
						</div>
					</div>
				</div>
			</section>

			<section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
				<aside className="h-fit rounded-sm border border-[#ded7ca] bg-white p-4">
					<div className="flex items-center gap-2">
						<SlidersHorizontal className="size-4 text-[#1d7053]" />
						<h2 className="font-semibold">Filters</h2>
					</div>
					<label className="relative mt-4 block">
						<span className="sr-only">Search products</span>
						<Search className="absolute left-3 top-3 size-4 text-[#65736b]" />
						<input
							readOnly
							value="Search endpoint reserved"
							className="h-10 w-full rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] pl-9 pr-3 text-sm font-medium text-[#65736b]"
						/>
					</label>
					<div className="mt-5 grid gap-2">
						<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
							Categories
						</p>
						{categoryCatalog.map((item) => (
							<button
								key={item}
								type="button"
								onClick={() => setCategory(item)}
								className={`h-9 rounded-sm border px-3 text-left text-sm font-semibold ${
									category === item
										? "border-[#17221b] bg-[#17221b] text-white"
										: "border-[#ded7ca] bg-white text-[#314238] hover:border-[#17221b]"
								}`}
							>
								{item}
							</button>
						))}
					</div>
					{attributeFilterOptions.length > 0 && (
						<div className="mt-5 grid gap-4">
							{attributeFilterOptions.map((attribute) => (
								<div key={attribute.code} className="grid gap-2">
									<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
										{attribute.name}
									</p>
									<div className="flex flex-wrap gap-2">
										{attribute.values.map((value) => (
											<button
												key={`${attribute.code}-${value}`}
												type="button"
												onClick={() =>
													toggleAttributeFilter(attribute.code, value)
												}
												className={`h-8 rounded-sm border px-2 text-xs font-semibold ${
													attributeFilters[attribute.code] === value
														? "border-[#1d7053] bg-[#1d7053] text-white"
														: "border-[#ded7ca] bg-white text-[#314238] hover:border-[#1d7053]"
												}`}
											>
												{value}
											</button>
										))}
									</div>
								</div>
							))}
						</div>
					)}
				</aside>

				<div className="grid gap-5">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="text-sm font-semibold text-[#65736b]">
								{visibleProducts.length} products in {category}
							</p>
							<p className="text-xs text-[#65736b]">
								Current domain resolves to {site.domain}
							</p>
						</div>
						<div className="inline-flex items-center gap-2 rounded-sm border border-[#ded7ca] bg-white px-3 py-2 text-sm font-semibold text-[#425149]">
							<ShoppingBag className="size-4 text-[#1d7053]" />
							{cartQuantity} items
							<span className="text-[#b0a797]">/</span>
							{formatMoney(cartTotal, currency)}
						</div>
					</div>
					{cartError && (
						<p className="rounded-sm border border-[#e8c8c1] bg-[#fff1ee] px-3 py-2 text-sm font-semibold text-[#a43b24]">
							{cartError}
						</p>
					)}

					<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
						{visibleProducts.map((product) => (
							<ProductCard
								key={product.id}
								product={product}
								currency={currency}
								onAdd={addToCart}
							/>
						))}
					</div>

					{visibleProducts.length === 0 && (
						<div className="grid min-h-80 place-items-center rounded-sm border border-dashed border-[#c9d3cd] bg-white text-center">
							<div>
								<ShoppingBag className="mx-auto mb-4 size-10 text-[#b0a797]" />
								<p className="font-semibold">No scoped products found</p>
								<p className="mt-2 text-sm text-[#65736b]">
									Adjust the category or vertical attributes for this site.
								</p>
							</div>
						</div>
					)}
				</div>
			</section>

			{cartQuantity > 0 && (
				<div className="sticky bottom-0 z-20 border-t border-[#ded7ca] bg-white/94 px-4 py-3 backdrop-blur">
					<div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="text-sm">
							<span className="font-semibold">{cartQuantity} items</span>
							<span className="mx-2 text-[#b0a797]">/</span>
							<span>{formatMoney(cartTotal, currency)}</span>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => {
									void refreshCart();
								}}
								className="h-10 rounded-sm border border-[#ded7ca] px-3 text-sm font-semibold text-[#425149] hover:border-[#1d7053]"
							>
								Refresh
							</button>
							<a
								href="/cart"
								className="inline-flex h-10 items-center gap-2 rounded-sm bg-[#1d7053] px-4 text-sm font-bold text-white"
							>
								<Check className="size-4" />
								View cart
							</a>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}
