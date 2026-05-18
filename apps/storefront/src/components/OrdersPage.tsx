"use client";

import {
	ArrowRight,
	Clock3,
	PackageCheck,
	ReceiptText,
	RefreshCw,
	ShieldCheck,
	ShoppingBag,
	UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatMoney } from "@/lib/commerce";
import type { Currency } from "@/lib/products";
import type { StorefrontSiteContext } from "@/lib/site-context";
import { readStoredSiteCustomer } from "@/lib/storefront-account";
import {
	fetchStorefrontOrders,
	formatOrderDate,
	type StorefrontOrderListItem,
} from "@/lib/storefront-orders";
import {
	getBrowserCartStorage,
	getOrCreateGuestToken,
} from "@/lib/storefront-cart";

type OrdersPageProps = {
	site: StorefrontSiteContext;
};

export function OrdersPage({ site }: OrdersPageProps) {
	const guestTokenRef = useRef("");
	const [guestToken, setGuestToken] = useState("");
	const [orders, setOrders] = useState<StorefrontOrderListItem[]>([]);
	const [status, setStatus] = useState<"idle" | "loading">("idle");
	const [error, setError] = useState("");
	const currency = site.defaultCurrency as Currency;

	const loadOrders = useCallback(async () => {
		setStatus("loading");
		setError("");

		try {
			if (!guestTokenRef.current) {
				guestTokenRef.current = getOrCreateGuestToken(getBrowserCartStorage());
				setGuestToken(guestTokenRef.current);
			}

			const storedSiteCustomer = readStoredSiteCustomer();
			const result = await fetchStorefrontOrders({
				guestToken: guestTokenRef.current,
				...(storedSiteCustomer?.globalUserId
					? { userId: storedSiteCustomer.globalUserId }
					: {}),
				limit: 20,
			});

			setOrders(result.orders);
		} catch (loadError) {
			setError(
				loadError instanceof Error
					? loadError.message
					: "Failed to load orders.",
			);
		} finally {
			setStatus("idle");
		}
	}, []);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			void loadOrders();
		}, 0);

		return () => {
			window.clearTimeout(timer);
		};
	}, [loadOrders]);

	return (
		<main className="min-h-screen bg-[#f7f3eb] text-[#17221b]">
			<header className="border-b border-[#ded7ca] bg-white">
				<div className="mx-auto flex min-h-16 max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
					<div>
						<Link
							href="/products"
							className="inline-flex items-center gap-2 text-sm font-semibold text-[#1d7053]"
						>
							<ShoppingBag className="size-4" />
							Products
						</Link>
						<h1 className="mt-2 text-2xl font-semibold tracking-normal">
							My orders
						</h1>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Link
							href="/account"
							className="inline-flex h-10 items-center gap-2 rounded-sm border border-[#d9e1dc] bg-white px-3 text-sm font-semibold text-[#425149] hover:border-[#1d7053]"
						>
							<UserRound className="size-4" />
							Account
						</Link>
						<span className="inline-flex h-10 items-center gap-2 rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] px-3 text-sm font-semibold text-[#425149]">
							<ShieldCheck className="size-4 text-[#1d7053]" />
							{site.siteName}
						</span>
						<button
							type="button"
							onClick={() => {
								void loadOrders();
							}}
							disabled={status === "loading"}
							className="inline-flex h-10 items-center gap-2 rounded-sm border border-[#d9e1dc] bg-white px-3 text-sm font-semibold text-[#425149] hover:border-[#1d7053] disabled:cursor-not-allowed disabled:text-[#a8b4ae]"
						>
							<RefreshCw
								className={`size-4 ${status === "loading" ? "animate-spin" : ""}`}
							/>
							Refresh
						</button>
					</div>
				</div>
			</header>

			<section className="mx-auto grid max-w-6xl gap-5 px-4 py-8 sm:px-6 lg:px-8">
				<div className="grid gap-4 border-b border-[#ded7ca] pb-5 sm:grid-cols-3">
					<div className="rounded-sm border border-[#ded7ca] bg-white p-4">
						<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
							Scope
						</p>
						<p className="mt-2 font-semibold">{site.siteName}</p>
					</div>
					<div className="rounded-sm border border-[#ded7ca] bg-white p-4">
						<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
							Orders
						</p>
						<p className="mt-2 font-semibold">{orders.length}</p>
					</div>
					<div className="rounded-sm border border-[#ded7ca] bg-white p-4">
						<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
							Session
						</p>
						<p className="mt-2 truncate font-semibold">
							{guestToken || "loading"}
						</p>
					</div>
				</div>

				{error && (
					<p className="rounded-sm border border-[#e8c8c1] bg-[#fff1ee] px-3 py-2 text-sm font-semibold text-[#a43b24]">
						{error}
					</p>
				)}

				{orders.length === 0 && status !== "loading" ? (
					<div className="grid min-h-80 place-items-center rounded-sm border border-dashed border-[#c9d3cd] bg-white text-center">
						<div className="max-w-sm px-6">
							<ReceiptText className="mx-auto size-12 text-[#65736b]" />
							<h2 className="mt-4 text-xl font-semibold">No orders yet</h2>
							<p className="mt-2 text-sm text-[#65736b]">
								Checkout orders for this site will appear here.
							</p>
							<Link
								href="/products"
								className="mt-5 inline-flex h-11 items-center gap-2 rounded-sm bg-[#17221b] px-4 text-sm font-bold text-white hover:bg-[#1d7053]"
							>
								Browse products
								<ArrowRight className="size-4" />
							</Link>
						</div>
					</div>
				) : (
					<div className="grid gap-4">
						{orders.map((order) => (
							<article
								key={order.orderId}
								className="grid gap-4 rounded-sm border border-[#ded7ca] bg-white p-4 shadow-sm lg:grid-cols-[96px_1fr_auto]"
							>
								<div className="relative aspect-square overflow-hidden rounded-sm border border-[#ede7dc] bg-[#f5f7f8]">
									{order.firstItemImageUrl ? (
										<Image
											src={order.firstItemImageUrl}
											alt={order.firstItemTitle ?? order.orderNo}
											fill
											sizes="96px"
											className="object-cover"
										/>
									) : (
										<div className="grid h-full place-items-center text-[#65736b]">
											<PackageCheck className="size-8" />
										</div>
									)}
								</div>
								<div className="grid gap-4">
									<div>
										<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
											{formatOrderDate(order.createdAt)}
										</p>
										<h2 className="mt-1 text-lg font-semibold">
											{order.orderNo}
										</h2>
										<p className="mt-1 text-sm text-[#65736b]">
											{order.firstItemTitle ?? "Order snapshot"} ·{" "}
											{order.itemCount} item{order.itemCount === 1 ? "" : "s"}
										</p>
									</div>
									<div className="grid gap-2 sm:grid-cols-4">
										<OrderStatusBadge
											label="Order"
											status={order.orderStatus}
										/>
										<OrderStatusBadge
											label="Payment"
											status={order.paymentStatus}
										/>
										<OrderStatusBadge
											label="Fulfillment"
											status={order.fulfillmentStatus}
										/>
										<OrderStatusBadge
											label="Aftersales"
											status={order.aftersalesStatus}
										/>
									</div>
								</div>
								<div className="flex flex-col items-start justify-between gap-4 lg:items-end">
									<div className="text-left lg:text-right">
										<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
											Total
										</p>
										<p className="mt-1 text-xl font-bold">
											{formatMoney(Number(order.totalAmount), order.currency ?? currency)}
										</p>
										{order.latestPaymentOrder && (
											<p className="mt-1 text-xs text-[#65736b]">
												{order.latestPaymentOrder.channelCode} ·{" "}
												{order.latestPaymentOrder.status}
											</p>
										)}
									</div>
									<Link
										href={`/orders/${encodeURIComponent(order.orderId)}`}
										className="inline-flex h-10 items-center gap-2 rounded-sm bg-[#17221b] px-4 text-sm font-bold text-white hover:bg-[#1d7053]"
									>
										Details
										<ArrowRight className="size-4" />
									</Link>
								</div>
							</article>
						))}
					</div>
				)}

				{status === "loading" && (
					<div className="inline-flex items-center gap-2 text-sm font-semibold text-[#65736b]">
						<Clock3 className="size-4 animate-pulse" />
						Loading current-site orders
					</div>
				)}
			</section>
		</main>
	);
}
