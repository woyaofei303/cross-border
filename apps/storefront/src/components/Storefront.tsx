"use client";

import {
	ArrowRight,
	BadgeCheck,
	Check,
	ChevronDown,
	Globe2,
	Minus,
	Plus,
	Search,
	ShieldCheck,
	ShoppingBag,
	Truck,
	X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import {
	addCartLine,
	type CartLine,
	filterProducts,
	formatMoney,
	getAttributeFilterOptions,
	getCartSummary,
	getDestinationMarket,
	pruneCartLinesForCatalog,
	updateCartQuantity,
} from "@/lib/commerce";
import type { StorefrontSiteContext } from "@/lib/site-context";
import {
	type Currency,
	currencies,
	type Market,
	markets,
	type ProductAttributeDefinition,
	type Product,
} from "@/lib/products";

type StorefrontProps = {
	site: StorefrontSiteContext;
	productCatalog: Product[];
	categoryCatalog: string[];
	attributeDefinitions: ProductAttributeDefinition[];
};

function getSupportedCurrency(currency: string): Currency {
	return currencies.includes(currency as Currency)
		? (currency as Currency)
		: "USD";
}

function getBrandDisplayName(site: StorefrontSiteContext) {
	return site.brandCode === "default" ? "NOVA TRADE" : site.brandName;
}

function getBrandInitials(displayName: string) {
	return (
		displayName
			.split(/\s+/)
			.map((part) => part[0])
			.join("")
			.slice(0, 2)
			.toUpperCase() || "NT"
	);
}

export function Storefront({
	site,
	productCatalog,
	categoryCatalog,
	attributeDefinitions,
}: StorefrontProps) {
	const [market, setMarket] = useState<Market>("US");
	const [currency, setCurrency] = useState<Currency>(
		getSupportedCurrency(site.defaultCurrency),
	);
	const [category, setCategory] = useState("All");
	const [attributeFilters, setAttributeFilters] = useState<
		Record<string, string>
	>({});
	const [cartLines, setCartLines] = useState<CartLine[]>([]);
	const [isCartOpen, setIsCartOpen] = useState(false);
	const brandDisplayName = getBrandDisplayName(site);
	const brandInitials = getBrandInitials(brandDisplayName);

	const selectedMarket = getDestinationMarket(market);

	const siteCartLines = useMemo(
		() => pruneCartLinesForCatalog(cartLines, productCatalog),
		[cartLines, productCatalog],
	);

	const visibleProducts = useMemo(
		() => filterProducts(category, productCatalog, attributeFilters),
		[attributeFilters, category, productCatalog],
	);
	const attributeFilterOptions = useMemo(
		() => getAttributeFilterOptions(productCatalog, attributeDefinitions),
		[attributeDefinitions, productCatalog],
	);
	const cartSummary = useMemo(
		() => getCartSummary(siteCartLines, productCatalog),
		[siteCartLines, productCatalog],
	);
	const {
		items: cartItems,
		quantity: cartQuantity,
		subtotal,
		shipping,
		total,
	} = cartSummary;

	const addToCart = (productId: string) => {
		setCartLines((lines) => addCartLine(lines, productId));
		setIsCartOpen(true);
	};

	const updateQuantity = (productId: string, delta: number) => {
		setCartLines((lines) => updateCartQuantity(lines, productId, delta));
	};

	const toggleAttributeFilter = (code: string, value: string) => {
		setAttributeFilters((filters) => ({
			...filters,
			[code]: filters[code] === value ? "" : value,
		}));
	};

	return (
		<main className="min-h-screen bg-[#f7f3eb] text-[#17221b]">
			<header className="fixed inset-x-0 top-0 z-40 border-b border-white/15 bg-[#101913]/80 text-white backdrop-blur-xl">
				<div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
					<a
						href="#top"
						className="flex items-center gap-3"
						aria-label={`${brandDisplayName} home`}
					>
						<span className="grid size-9 place-items-center rounded-sm bg-[#f3c969] text-sm font-black text-[#17221b]">
							{brandInitials}
						</span>
						<span className="text-sm font-semibold tracking-[0.22em]">
							{brandDisplayName}
						</span>
					</a>

					<nav className="hidden items-center gap-7 text-sm font-medium text-white/78 md:flex">
						<a href="#collection" className="hover:text-white">
							Collection
						</a>
						<a href="#markets" className="hover:text-white">
							Markets
						</a>
						<Link href="/products" className="hover:text-white">
							Products
						</Link>
						<a href="#operations" className="hover:text-white">
							Operations
						</a>
					</nav>

					<div className="flex items-center gap-2">
						<label className="relative hidden sm:block">
							<span className="sr-only">Currency</span>
							<select
								value={currency}
								onChange={(event) =>
									setCurrency(event.target.value as Currency)
								}
								className="h-10 appearance-none rounded-sm border border-white/15 bg-white/10 px-3 pr-8 text-sm font-semibold text-white"
							>
								{currencies.map((item) => (
									<option key={item} value={item} className="text-[#17221b]">
										{item}
									</option>
								))}
							</select>
							<ChevronDown className="pointer-events-none absolute right-2 top-2.5 size-4 text-white/70" />
						</label>
						<button
							type="button"
							onClick={() => setIsCartOpen(true)}
							className="relative inline-flex h-10 items-center gap-2 rounded-sm bg-white px-3 text-sm font-semibold text-[#17221b] shadow-sm hover:bg-[#f3c969]"
						>
							<ShoppingBag className="size-4" />
							<span className="hidden sm:inline">Cart</span>
							{cartQuantity > 0 && (
								<span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-[#df5b35] text-xs font-bold text-white">
									{cartQuantity}
								</span>
							)}
						</button>
					</div>
				</div>
			</header>

			<section
				id="top"
				className="relative min-h-[82vh] overflow-hidden pt-16 text-white"
			>
				<Image
					src="https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=2200&q=85"
					alt="Premium lifestyle products arranged for international shipping"
					fill
					priority
					sizes="100vw"
					className="object-cover"
				/>
				<div className="absolute inset-0 bg-[#101913]/64" />
				<div className="relative mx-auto flex min-h-[calc(82vh-4rem)] max-w-7xl items-end px-4 pb-12 pt-20 sm:px-6 lg:px-8">
					<div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
						<div className="max-w-3xl">
							<div className="mb-6 inline-flex items-center gap-2 rounded-sm border border-white/20 bg-white/12 px-3 py-2 text-sm font-semibold backdrop-blur">
								<Globe2 className="size-4 text-[#f3c969]" />
								{site.verticalName} storefront
							</div>
							<h1 className="max-w-3xl text-5xl font-semibold leading-[0.98] tracking-normal sm:text-6xl lg:text-7xl">
								Premium goods, landed pricing, fast global delivery.
							</h1>
							<p className="mt-6 max-w-2xl text-lg leading-8 text-white/82">
								Curated lifestyle products with localized currency, duty-ready
								checkout messaging, and destination-specific delivery promises.
							</p>
							<div className="mt-8 flex flex-col gap-3 sm:flex-row">
								<Link
									href="/products"
									className="inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-[#f3c969] px-5 text-sm font-bold text-[#17221b] hover:bg-white"
								>
									Shop collection
									<ArrowRight className="size-4" />
								</Link>
								<a
									href="#markets"
									className="inline-flex h-12 items-center justify-center gap-2 rounded-sm border border-white/25 px-5 text-sm font-bold text-white hover:bg-white/10"
								>
									View markets
									<Globe2 className="size-4" />
								</a>
							</div>
						</div>

						<div className="grid gap-3 border border-white/18 bg-[#101913]/62 p-4 backdrop-blur-md">
							{[
								["12", "shipping lanes"],
								["98%", "tracked parcels"],
								["24h", "average dispatch"],
							].map(([value, label]) => (
								<div
									key={label}
									className="flex items-center justify-between border-b border-white/10 pb-3 last:border-0 last:pb-0"
								>
									<span className="text-4xl font-semibold text-[#f3c969]">
										{value}
									</span>
									<span className="text-sm font-medium uppercase tracking-[0.2em] text-white/68">
										{label}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			<section id="markets" className="border-b border-[#ded7ca] bg-white">
				<div className="mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:px-8">
					<div className="flex flex-wrap items-center gap-3">
						{markets.map((item) => (
							<button
								key={item.value}
								type="button"
								onClick={() => setMarket(item.value)}
								className={`h-11 rounded-sm border px-4 text-sm font-semibold ${
									market === item.value
										? "border-[#1d7053] bg-[#1d7053] text-white"
										: "border-[#ded7ca] bg-white text-[#314238] hover:border-[#1d7053]"
								}`}
							>
								{item.label}
							</button>
						))}
					</div>
					<div className="flex flex-wrap items-center gap-3 text-sm text-[#5d6b62]">
						<span className="inline-flex items-center gap-2 rounded-sm bg-[#eef6f0] px-3 py-2 font-semibold text-[#1d7053]">
							<ShieldCheck className="size-4" />
							{selectedMarket.duty}
						</span>
						<span className="inline-flex items-center gap-2 rounded-sm bg-[#f8ecd6] px-3 py-2 font-semibold text-[#8a5a13]">
							<Truck className="size-4" />
							{selectedMarket.delivery}
						</span>
					</div>
				</div>
			</section>

			<section
				id="collection"
				className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"
			>
				<div className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-end">
					<div>
						<p className="text-sm font-bold uppercase tracking-[0.22em] text-[#1d7053]">
							Global assortment
						</p>
						<h2 className="mt-3 text-3xl font-semibold tracking-normal text-[#17221b] sm:text-4xl">
							Destination-ready products
						</h2>
					</div>
					<label className="relative">
						<span className="sr-only">Search products</span>
						<Search className="absolute left-3 top-3 size-5 text-[#7a867d]" />
						<input
							readOnly
							value="Search, filter and merchandising hooks"
							className="h-11 w-full rounded-sm border border-[#ded7ca] bg-white pl-10 pr-3 text-sm font-medium text-[#5d6b62]"
						/>
					</label>
				</div>

				<div className="mb-7 flex gap-2 overflow-x-auto pb-1">
					{categoryCatalog.map((item) => (
						<button
							key={item}
							type="button"
							onClick={() => setCategory(item)}
							className={`h-10 shrink-0 rounded-sm border px-4 text-sm font-semibold ${
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
					<div className="mb-7 grid gap-3">
						{attributeFilterOptions.map((attribute) => (
							<div
								key={attribute.code}
								className="flex flex-wrap items-center gap-2"
							>
								<span className="mr-1 text-sm font-bold text-[#314238]">
									{attribute.name}
								</span>
								{attribute.values.map((value) => (
									<button
										key={`${attribute.code}-${value}`}
										type="button"
										onClick={() =>
											toggleAttributeFilter(attribute.code, value)
										}
										className={`h-9 rounded-sm border px-3 text-sm font-semibold ${
											attributeFilters[attribute.code] === value
												? "border-[#1d7053] bg-[#1d7053] text-white"
												: "border-[#ded7ca] bg-white text-[#314238] hover:border-[#1d7053]"
										}`}
									>
										{value}
									</button>
								))}
							</div>
						))}
					</div>
				)}

				<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{visibleProducts.map((product) => (
						<ProductCard
							key={product.id}
							product={product}
							currency={currency}
							onAdd={(item) => addToCart(item.id)}
						/>
					))}
				</div>
			</section>

			<section id="operations" className="bg-[#17221b] text-white">
				<div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
					<div>
						<p className="text-sm font-bold uppercase tracking-[0.22em] text-[#f3c969]">
							Commerce operations
						</p>
						<h2 className="mt-3 text-3xl font-semibold tracking-normal sm:text-4xl">
							Built for payments, logistics and trust signals.
						</h2>
					</div>
					<div className="grid gap-4 sm:grid-cols-3">
						{[
							{
								title: "Localized checkout",
								body: "Currency display, tax messaging and destination promises are ready for real checkout integration.",
								icon: BadgeCheck,
							},
							{
								title: "Global fulfillment",
								body: "Product cards expose dispatch timing, origin and duty positioning before cart handoff.",
								icon: Truck,
							},
							{
								title: "Retention hooks",
								body: "Wishlist, category merchandising and cart state create clear extension points.",
								icon: ShieldCheck,
							},
						].map((item) => (
							<div
								key={item.title}
								className="rounded-sm border border-white/12 bg-white/8 p-5"
							>
								<item.icon className="mb-4 size-6 text-[#f3c969]" />
								<h3 className="font-semibold">{item.title}</h3>
								<p className="mt-3 text-sm leading-6 text-white/70">
									{item.body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			<footer className="bg-[#f7f3eb]">
				<div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-[#5d6b62] sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
					<span className="font-semibold text-[#17221b]">
						{brandDisplayName}
					</span>
					<span>Payments: Visa / Mastercard / PayPal / Klarna</span>
					<span>Fulfillment: DDP lanes / IOSS / tracked parcels</span>
				</div>
			</footer>

			{isCartOpen && (
				<div className="fixed inset-0 z-50">
					<button
						type="button"
						aria-label="Close cart overlay"
						className="absolute inset-0 bg-[#101913]/55"
						onClick={() => setIsCartOpen(false)}
					/>
					<aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
						<div className="flex items-center justify-between border-b border-[#ded7ca] px-5 py-4">
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1d7053]">
									Cart
								</p>
								<h2 className="text-xl font-semibold text-[#17221b]">
									{cartQuantity} items
								</h2>
							</div>
							<button
								type="button"
								onClick={() => setIsCartOpen(false)}
								className="grid size-10 place-items-center rounded-sm border border-[#ded7ca] text-[#17221b] hover:bg-[#f7f3eb]"
								aria-label="Close cart"
							>
								<X className="size-5" />
							</button>
						</div>

						<div className="flex-1 overflow-y-auto px-5 py-4">
							{cartItems.length === 0 ? (
								<div className="grid h-full place-items-center text-center">
									<div>
										<ShoppingBag className="mx-auto mb-4 size-10 text-[#b0a797]" />
										<p className="font-semibold text-[#17221b]">
											Your cart is empty
										</p>
										<p className="mt-2 text-sm text-[#5d6b62]">
											Add products from the collection to build an order.
										</p>
									</div>
								</div>
							) : (
								<div className="grid gap-4">
									{cartItems.map((item) => (
										<div
											key={item.productId}
											className="grid grid-cols-[84px_1fr] gap-4 border-b border-[#ede7dc] pb-4"
										>
											<div className="relative aspect-square overflow-hidden rounded-sm bg-[#e7dfd0]">
												<Image
													src={item.product.image}
													alt={item.product.name}
													fill
													sizes="84px"
													className="object-cover"
												/>
											</div>
											<div>
												<div className="flex items-start justify-between gap-3">
													<div>
														<h3 className="font-semibold text-[#17221b]">
															{item.product.name}
														</h3>
														<p className="mt-1 text-sm text-[#5d6b62]">
															{formatMoney(item.product.price, currency)}
														</p>
													</div>
													<button
														type="button"
														onClick={() =>
															updateQuantity(item.productId, -item.quantity)
														}
														className="text-[#8f988f] hover:text-[#df5b35]"
														aria-label={`Remove ${item.product.name}`}
													>
														<X className="size-4" />
													</button>
												</div>
												<div className="mt-4 inline-flex items-center rounded-sm border border-[#ded7ca]">
													<button
														type="button"
														onClick={() => updateQuantity(item.productId, -1)}
														className="grid size-9 place-items-center hover:bg-[#f7f3eb]"
														aria-label={`Decrease ${item.product.name}`}
													>
														<Minus className="size-4" />
													</button>
													<span className="grid h-9 min-w-9 place-items-center border-x border-[#ded7ca] text-sm font-semibold">
														{item.quantity}
													</span>
													<button
														type="button"
														onClick={() => updateQuantity(item.productId, 1)}
														className="grid size-9 place-items-center hover:bg-[#f7f3eb]"
														aria-label={`Increase ${item.product.name}`}
													>
														<Plus className="size-4" />
													</button>
												</div>
											</div>
										</div>
									))}
								</div>
							)}
						</div>

						<div className="border-t border-[#ded7ca] p-5">
							<div className="mb-4 grid gap-2 text-sm">
								<div className="flex justify-between text-[#5d6b62]">
									<span>Subtotal</span>
									<span>{formatMoney(subtotal, currency)}</span>
								</div>
								<div className="flex justify-between text-[#5d6b62]">
									<span>Shipping</span>
									<span>
										{shipping === 0 ? "Free" : formatMoney(shipping, currency)}
									</span>
								</div>
								<div className="flex justify-between text-lg font-bold text-[#17221b]">
									<span>Total</span>
									<span>{formatMoney(total, currency)}</span>
								</div>
							</div>
							<button
								type="button"
								disabled={cartItems.length === 0}
								className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#1d7053] text-sm font-bold text-white hover:bg-[#17221b] disabled:cursor-not-allowed disabled:bg-[#b0a797]"
							>
								<Check className="size-4" />
								Continue to checkout
							</button>
							<p className="mt-3 text-center text-xs font-medium text-[#5d6b62]">
								{selectedMarket.duty} for {selectedMarket.label}
							</p>
						</div>
					</aside>
				</div>
			)}
		</main>
	);
}
