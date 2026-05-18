"use client";

import {
	ArrowLeft,
	Check,
	Minus,
	Plus,
	RefreshCw,
	ShoppingBag,
	Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/commerce";
import type { StorefrontSiteContext } from "@/lib/site-context";
import {
	fetchCurrentCart,
	getBrowserCartStorage,
	getCartItemLineTotal,
	getNextCartQuantity,
	getOrCreateGuestToken,
	removeCartItem,
	type StorefrontCart,
	type StorefrontCartItem,
	updateCartItemQuantity,
} from "@/lib/storefront-cart";
import type { Currency } from "@/lib/products";

type CartPageProps = {
	site: StorefrontSiteContext;
	currency: Currency;
};

function cartAmountToNumber(value: string | undefined) {
	const amount = Number(value ?? "0");

	return Number.isFinite(amount) ? amount : 0;
}

export function CartPage({ site, currency }: CartPageProps) {
	const guestTokenRef = useRef("");
	const [cart, setCart] = useState<StorefrontCart | null>(null);
	const [status, setStatus] = useState<"idle" | "loading" | "saving">("idle");
	const [error, setError] = useState("");
	const [busySkuId, setBusySkuId] = useState("");

	const subtotal = cartAmountToNumber(cart?.subtotalAmount);
	const total = cartAmountToNumber(cart?.totalAmount);
	const cartItems = cart?.items ?? [];
	const isLoading = status === "loading";
	const scopedItems = cartItems.filter((item) => item.siteId === site.siteId);
	const canCheckout = scopedItems.length > 0 && !isLoading;

	function getGuestToken() {
		if (!guestTokenRef.current) {
			guestTokenRef.current = getOrCreateGuestToken(getBrowserCartStorage());
		}

		return guestTokenRef.current;
	}

	useEffect(() => {
		async function loadCart() {
			const token = getOrCreateGuestToken(getBrowserCartStorage());
			guestTokenRef.current = token;
			setStatus("loading");
			setError("");

			try {
				setCart(await fetchCurrentCart({ guestToken: token, currency }));
			} catch (loadError) {
				setError(
					loadError instanceof Error
						? loadError.message
						: "Failed to load cart.",
				);
			} finally {
				setStatus("idle");
			}
		}

		void loadCart();
	}, [currency]);

	async function setItemQuantity(item: StorefrontCartItem, quantity: number) {
		if (quantity <= 0) {
			await removeItem(item);
			return;
		}

		setBusySkuId(item.skuId);
		setStatus("saving");
		setError("");

		try {
			setCart(
				await updateCartItemQuantity({
					guestToken: getGuestToken(),
					currency,
					skuId: item.skuId,
					quantity,
				}),
			);
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: "Failed to update cart item.",
			);
		} finally {
			setBusySkuId("");
			setStatus("idle");
		}
	}

	async function removeItem(item: StorefrontCartItem) {
		setBusySkuId(item.skuId);
		setStatus("saving");
		setError("");

		try {
			setCart(
				await removeCartItem({
					guestToken: getGuestToken(),
					currency,
					skuId: item.skuId,
				}),
			);
		} catch (saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: "Failed to remove cart item.",
			);
		} finally {
			setBusySkuId("");
			setStatus("idle");
		}
	}

	async function refreshCart() {
		setStatus("loading");
		setError("");

		try {
			setCart(await fetchCurrentCart({ guestToken: getGuestToken(), currency }));
		} catch (loadError) {
			setError(
				loadError instanceof Error ? loadError.message : "Failed to load cart.",
			);
		} finally {
			setStatus("idle");
		}
	}

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
						<h1 className="mt-2 text-2xl font-semibold tracking-normal">
							Cart
						</h1>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="inline-flex h-10 items-center rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] px-3 text-sm font-semibold text-[#425149]">
							{site.siteName}
						</span>
						<button
							type="button"
							onClick={() => {
								void refreshCart();
							}}
							disabled={isLoading}
							className="inline-flex h-10 items-center gap-2 rounded-sm border border-[#d9e1dc] bg-white px-3 text-sm font-semibold text-[#425149] hover:border-[#1d7053] disabled:cursor-not-allowed disabled:text-[#a8b4ae]"
						>
							<RefreshCw className="size-4" />
							Refresh
						</button>
					</div>
				</div>
			</header>

			<section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
				<div className="grid gap-4">
					<div className="rounded-sm border border-[#ded7ca] bg-white p-4">
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
									Site-aware cart
								</p>
								<h2 className="mt-1 font-semibold">
									{cart?.quantity ?? 0} items for {site.siteName}
								</h2>
							</div>
							<span className="rounded-sm bg-[#eef6f0] px-2 py-1 text-xs font-bold text-[#1d7053]">
								{cart?.siteCode ?? site.siteCode}
							</span>
						</div>
						{error && (
							<p className="mt-3 rounded-sm border border-[#e8c8c1] bg-[#fff1ee] px-3 py-2 text-sm font-semibold text-[#a43b24]">
								{error}
							</p>
						)}
					</div>

					{isLoading ? (
						<div className="grid min-h-80 place-items-center rounded-sm border border-[#ded7ca] bg-white text-center">
							<div>
								<RefreshCw className="mx-auto mb-4 size-9 animate-spin text-[#1d7053]" />
								<p className="font-semibold">Loading cart</p>
							</div>
						</div>
					) : scopedItems.length === 0 ? (
						<div className="grid min-h-80 place-items-center rounded-sm border border-dashed border-[#c9d3cd] bg-white text-center">
							<div>
								<ShoppingBag className="mx-auto mb-4 size-10 text-[#b0a797]" />
								<p className="font-semibold">Your cart is empty</p>
								<p className="mt-2 text-sm text-[#65736b]">
									Add products from this site before checkout.
								</p>
								<Link
									href="/products"
									className="mt-5 inline-flex h-10 items-center rounded-sm bg-[#17221b] px-4 text-sm font-bold text-white hover:bg-[#1d7053]"
								>
									Browse products
								</Link>
							</div>
						</div>
					) : (
						<div className="grid gap-3">
							{scopedItems.map((item) => (
								<article
									key={item.cartItemId}
									className="grid gap-4 rounded-sm border border-[#ded7ca] bg-white p-4 sm:grid-cols-[112px_1fr_auto]"
								>
									<div className="relative aspect-square overflow-hidden rounded-sm bg-[#e7dfd0]">
										{item.imageUrl ? (
											<Image
												src={item.imageUrl}
												alt={item.productTitle}
												fill
												sizes="112px"
												className="object-cover"
											/>
										) : (
											<div className="grid h-full place-items-center">
												<ShoppingBag className="size-8 text-[#b0a797]" />
											</div>
										)}
									</div>
									<div>
										<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1d7053]">
											{item.skuCode}
										</p>
										<h3 className="mt-1 font-semibold">{item.productTitle}</h3>
										{item.skuTitle && (
											<p className="mt-1 text-sm text-[#65736b]">
												{item.skuTitle}
											</p>
										)}
										<p className="mt-3 text-sm font-semibold text-[#425149]">
											{formatMoney(Number(item.displayUnitPrice), currency)}
										</p>
									</div>
									<div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
										<div className="inline-flex items-center rounded-sm border border-[#ded7ca]">
											<button
												type="button"
												disabled={busySkuId === item.skuId}
												onClick={() => {
													void setItemQuantity(
														item,
														getNextCartQuantity(item.quantity, -1),
													);
												}}
												className="grid size-9 place-items-center hover:bg-[#f7f3eb] disabled:cursor-not-allowed disabled:text-[#a8b4ae]"
												aria-label={`Decrease ${item.productTitle}`}
											>
												<Minus className="size-4" />
											</button>
											<span className="grid h-9 min-w-9 place-items-center border-x border-[#ded7ca] text-sm font-semibold">
												{item.quantity}
											</span>
											<button
												type="button"
												disabled={busySkuId === item.skuId}
												onClick={() => {
													void setItemQuantity(
														item,
														getNextCartQuantity(item.quantity, 1),
													);
												}}
												className="grid size-9 place-items-center hover:bg-[#f7f3eb] disabled:cursor-not-allowed disabled:text-[#a8b4ae]"
												aria-label={`Increase ${item.productTitle}`}
											>
												<Plus className="size-4" />
											</button>
										</div>
										<div className="text-right">
											<p className="font-semibold">
												{formatMoney(getCartItemLineTotal(item), currency)}
											</p>
											<button
												type="button"
												disabled={busySkuId === item.skuId}
												onClick={() => {
													void removeItem(item);
												}}
												className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#a43b24] disabled:cursor-not-allowed disabled:text-[#a8b4ae]"
											>
												<Trash2 className="size-4" />
												Remove
											</button>
										</div>
									</div>
								</article>
							))}
						</div>
					)}
				</div>

				<aside className="h-fit rounded-sm border border-[#ded7ca] bg-white p-5">
					<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
						Summary
					</p>
					<div className="mt-4 grid gap-3 text-sm">
						<div className="flex items-center justify-between">
							<span className="text-[#65736b]">Subtotal</span>
							<span className="font-semibold">{formatMoney(subtotal, currency)}</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-[#65736b]">Shipping</span>
							<span className="font-semibold">Quoted at checkout</span>
						</div>
						<div className="border-t border-[#ede7dc] pt-3">
							<div className="flex items-center justify-between text-lg font-bold">
								<span>Total</span>
								<span>{formatMoney(total, currency)}</span>
							</div>
						</div>
					</div>
					{canCheckout ? (
						<Link
							href="/checkout"
							className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#1d7053] text-sm font-bold text-white hover:bg-[#17221b]"
						>
							<Check className="size-4" />
							Checkout
						</Link>
					) : (
						<button
							type="button"
							disabled
							className="mt-5 inline-flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-sm bg-[#b0a797] text-sm font-bold text-white"
						>
							<Check className="size-4" />
							Checkout
						</button>
					)}
					<p className="mt-3 text-xs leading-5 text-[#65736b]">
						Cart totals are display-only. Final price snapshot is created by
						Order during checkout.
					</p>
				</aside>
			</section>
		</main>
	);
}
