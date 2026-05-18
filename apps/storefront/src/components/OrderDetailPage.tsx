"use client";

import {
	ArrowLeft,
	ExternalLink,
	MapPin,
	PackageCheck,
	RefreshCw,
	ShieldCheck,
	Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AfterSalesRequestPanel } from "@/components/AfterSalesRequestPanel";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { formatMoney } from "@/lib/commerce";
import type { Currency } from "@/lib/products";
import type { StorefrontSiteContext } from "@/lib/site-context";
import { readStoredSiteCustomer } from "@/lib/storefront-account";
import {
	fetchStorefrontOrderDetail,
	formatOrderDate,
	type StorefrontOrderDetail,
} from "@/lib/storefront-orders";
import {
	getBrowserCartStorage,
	getOrCreateGuestToken,
} from "@/lib/storefront-cart";

type OrderDetailPageProps = {
	site: StorefrontSiteContext;
	orderId: string;
};

function readSnapshotString(
	snapshot: Record<string, unknown> | undefined,
	key: string,
) {
	const value = snapshot?.[key];

	return typeof value === "string" && value.trim() ? value : "";
}

function formatShippingAddress(snapshot: Record<string, unknown>) {
	const city = readSnapshotString(snapshot, "city");
	const region = readSnapshotString(snapshot, "region");
	const postalCode = readSnapshotString(snapshot, "postalCode");
	const countryCode = readSnapshotString(snapshot, "countryCode");

	return [
		readSnapshotString(snapshot, "addressLine1"),
		readSnapshotString(snapshot, "addressLine2"),
		[city, region, postalCode].filter(Boolean).join(", "),
		countryCode,
	].filter(Boolean);
}

export function OrderDetailPage({ site, orderId }: OrderDetailPageProps) {
	const guestTokenRef = useRef("");
	const [order, setOrder] = useState<StorefrontOrderDetail | null>(null);
	const [status, setStatus] = useState<"idle" | "loading">("idle");
	const [error, setError] = useState("");
	const displayCurrency = (order?.currency ?? site.defaultCurrency) as Currency;
	const shippingAddress = formatShippingAddress(
		order?.shippingAddressSnapshot ?? {},
	);

	const loadOrder = useCallback(async () => {
		setStatus("loading");
		setError("");

		try {
			if (!guestTokenRef.current) {
				guestTokenRef.current = getOrCreateGuestToken(getBrowserCartStorage());
			}

			const storedSiteCustomer = readStoredSiteCustomer();

			setOrder(
				await fetchStorefrontOrderDetail({
					orderId,
					guestToken: guestTokenRef.current,
					...(storedSiteCustomer?.globalUserId
						? { userId: storedSiteCustomer.globalUserId }
						: {}),
				}),
			);
		} catch (loadError) {
			setError(
				loadError instanceof Error
					? loadError.message
					: "Failed to load order.",
			);
		} finally {
			setStatus("idle");
		}
	}, [orderId]);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			void loadOrder();
		}, 0);

		return () => {
			window.clearTimeout(timer);
		};
	}, [loadOrder]);

	return (
		<main className="min-h-screen bg-[#f7f3eb] text-[#17221b]">
			<header className="border-b border-[#ded7ca] bg-white">
				<div className="mx-auto flex min-h-16 max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
					<div>
						<Link
							href="/orders"
							className="inline-flex items-center gap-2 text-sm font-semibold text-[#1d7053]"
						>
							<ArrowLeft className="size-4" />
							Orders
						</Link>
						<h1 className="mt-2 text-2xl font-semibold tracking-normal">
							{order?.orderNo ?? "Order detail"}
						</h1>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<span className="inline-flex h-10 items-center gap-2 rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] px-3 text-sm font-semibold text-[#425149]">
							<ShieldCheck className="size-4 text-[#1d7053]" />
							{site.siteName}
						</span>
						<button
							type="button"
							onClick={() => {
								void loadOrder();
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

			<section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
				{error && (
					<p className="rounded-sm border border-[#e8c8c1] bg-[#fff1ee] px-3 py-2 text-sm font-semibold text-[#a43b24]">
						{error}
					</p>
				)}

				<div className="grid gap-4 lg:grid-cols-[1fr_320px]">
					<div className="rounded-sm border border-[#ded7ca] bg-white p-5">
						<div className="flex flex-col gap-4 border-b border-[#ede7dc] pb-5 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
									Backend truth
								</p>
								<h2 className="mt-1 text-xl font-semibold">
									{order?.orderNo ?? "Loading order"}
								</h2>
								<p className="mt-1 break-all text-xs text-[#65736b]">
									{orderId}
								</p>
							</div>
							<div className="rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] px-4 py-3 text-left sm:text-right">
								<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
									Total
								</p>
								<p className="text-xl font-bold">
									{formatMoney(
										Number(order?.totalAmount ?? "0"),
										displayCurrency,
									)}
								</p>
							</div>
						</div>

						<div className="mt-5 grid gap-3 sm:grid-cols-4">
							<OrderStatusBadge
								label="Order"
								status={order?.orderStatus ?? "pending_payment"}
							/>
							<OrderStatusBadge
								label="Payment"
								status={order?.paymentStatus ?? "unpaid"}
							/>
							<OrderStatusBadge
								label="Fulfillment"
								status={order?.fulfillmentStatus ?? "unfulfilled"}
							/>
							<OrderStatusBadge
								label="Aftersales"
								status={order?.aftersalesStatus ?? "none"}
							/>
						</div>

						<div className="mt-6 grid gap-4">
							<h3 className="text-lg font-semibold">Items</h3>
							{order?.items.map((item) => (
								<div
									key={item.orderItemId}
									className="grid gap-3 rounded-sm border border-[#ede7dc] p-3 sm:grid-cols-[72px_1fr_auto]"
								>
									<div className="relative aspect-square overflow-hidden rounded-sm bg-[#f5f7f8]">
										{item.imageUrl ? (
											<Image
												src={item.imageUrl}
												alt={item.productTitle}
												fill
												sizes="72px"
												className="object-cover"
											/>
										) : (
											<div className="grid h-full place-items-center text-[#65736b]">
												<PackageCheck className="size-7" />
											</div>
										)}
									</div>
									<div>
										<p className="font-semibold">{item.productTitle}</p>
										<p className="mt-1 text-sm text-[#65736b]">
											{item.skuTitle ?? item.skuCode}
										</p>
										<p className="mt-1 text-xs text-[#65736b]">
											{item.skuCode}
										</p>
									</div>
									<div className="text-left sm:text-right">
										<p className="font-semibold">
											{formatMoney(Number(item.totalAmount), displayCurrency)}
										</p>
										<p className="mt-1 text-sm text-[#65736b]">
											Qty {item.quantity}
										</p>
									</div>
								</div>
							))}
							{order && order.items.length === 0 && (
								<p className="rounded-sm border border-dashed border-[#c9d3cd] p-4 text-sm text-[#65736b]">
									No item snapshot is available for this order.
								</p>
							)}
						</div>

						<div className="mt-6">
							{order ? (
								<AfterSalesRequestPanel
									order={order}
									currency={displayCurrency}
									onCreated={loadOrder}
								/>
							) : (
								<div className="rounded-sm border border-[#ded7ca] bg-white p-5 text-sm font-semibold text-[#65736b]">
									Loading after-sales actions
								</div>
							)}
						</div>
					</div>

					<aside className="grid h-fit gap-4">
						<div className="rounded-sm border border-[#ded7ca] bg-white p-5">
							<h3 className="flex items-center gap-2 text-lg font-semibold">
								<MapPin className="size-5 text-[#1d7053]" />
								Ship to
							</h3>
							<div className="mt-4 text-sm text-[#425149]">
								<p className="font-semibold">
									{readSnapshotString(
										order?.shippingAddressSnapshot,
										"fullName",
									) || "--"}
								</p>
								{shippingAddress.length > 0 ? (
									shippingAddress.map((line) => <p key={line}>{line}</p>)
								) : (
									<p className="text-[#65736b]">No address snapshot.</p>
								)}
								<p className="mt-2">
									{readSnapshotString(order?.shippingAddressSnapshot, "email")}
								</p>
							</div>
						</div>

						<div className="rounded-sm border border-[#ded7ca] bg-white p-5">
							<h3 className="flex items-center gap-2 text-lg font-semibold">
								<Truck className="size-5 text-[#1d7053]" />
								Shipments
							</h3>
							<div className="mt-4 grid gap-3">
								{order?.shipments.map((shipment) => (
									<div
										key={shipment.shipmentId}
										className="rounded-sm border border-[#ede7dc] p-3"
									>
										<div className="flex items-start justify-between gap-3">
											<div>
												<p className="font-semibold">
													{shipment.providerName}
												</p>
												<p className="mt-1 text-xs text-[#65736b]">
													{shipment.trackingNo}
												</p>
											</div>
											<span className="rounded-sm border border-[#bbdfcc] bg-[#eef8f1] px-2 py-1 text-xs font-bold text-[#1d7053]">
												{shipment.status}
											</span>
										</div>
										{shipment.shippedAt && (
											<p className="mt-3 text-xs text-[#65736b]">
												Shipped {formatOrderDate(shipment.shippedAt)}
											</p>
										)}
										{shipment.trackingEvents.length > 0 && (
											<div className="mt-3 grid gap-2">
												{shipment.trackingEvents.map((event) => (
													<div
														key={`${shipment.shipmentId}-${event.trackingStatus}-${event.occurredAt}`}
														className="border-l-2 border-[#bbdfcc] pl-3 text-xs text-[#65736b]"
													>
														<p className="font-semibold text-[#425149]">
															{event.trackingStatus}
														</p>
														<p>{event.description}</p>
														<p>{formatOrderDate(event.occurredAt)}</p>
													</div>
												))}
											</div>
										)}
									</div>
								))}
								{order && order.shipments.length === 0 && (
									<p className="rounded-sm border border-dashed border-[#c9d3cd] p-4 text-sm text-[#65736b]">
										No shipment has been attached yet.
									</p>
								)}
							</div>
						</div>

						<Link
							href="/account"
							className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-[#17221b] px-4 text-sm font-bold text-white hover:bg-[#1d7053]"
						>
							Account
							<ExternalLink className="size-4" />
						</Link>
					</aside>
				</div>
			</section>
		</main>
	);
}
