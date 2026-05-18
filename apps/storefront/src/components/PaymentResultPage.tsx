"use client";

import {
	ArrowLeft,
	CheckCircle2,
	Clock3,
	RefreshCw,
	ShieldCheck,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatMoney } from "@/lib/commerce";
import type { Currency } from "@/lib/products";
import type { StorefrontSiteContext } from "@/lib/site-context";
import {
	fetchCheckoutResult,
	type CheckoutResult,
} from "@/lib/storefront-checkout";
import {
	getBrowserCartStorage,
	getOrCreateGuestToken,
} from "@/lib/storefront-cart";

type PaymentResultPageProps = {
	site: StorefrontSiteContext;
	orderId?: string;
	paymentOrderId?: string;
};

function getResultTone(result: CheckoutResult | null) {
	if (!result) {
		return {
			icon: Clock3,
			title: "Waiting for order",
			className: "text-[#65736b]",
		};
	}

	if (result.paymentStatus === "paid") {
		return {
			icon: CheckCircle2,
			title: "Payment verified",
			className: "text-[#1d7053]",
		};
	}

	if (result.paymentStatus === "failed") {
		return {
			icon: XCircle,
			title: "Payment failed",
			className: "text-[#a43b24]",
		};
	}

	return {
		icon: Clock3,
		title: "Payment pending",
		className: "text-[#8a6a18]",
	};
}

export function PaymentResultPage({
	site,
	orderId,
	paymentOrderId,
}: PaymentResultPageProps) {
	const guestTokenRef = useRef("");
	const [result, setResult] = useState<CheckoutResult | null>(null);
	const [status, setStatus] = useState<"idle" | "loading">("idle");
	const [error, setError] = useState("");
	const tone = getResultTone(result);
	const ToneIcon = tone.icon;
	const paidTotal = Number(result?.totalAmount ?? "0");
	const resultCurrency = (result?.currency ?? site.defaultCurrency) as Currency;
	const statusRows: Array<[string, string | undefined]> = [
		["Order", result?.orderStatus],
		["Payment", result?.paymentStatus],
		["Payment Order", result?.paymentOrder?.status],
		["Fulfillment", result?.fulfillmentStatus],
	];

	const loadResult = useCallback(async () => {
		if (!orderId) {
			setError("Missing order id.");
			return;
		}

		setStatus("loading");
		setError("");

		try {
			if (!guestTokenRef.current) {
				guestTokenRef.current = getOrCreateGuestToken(getBrowserCartStorage());
			}

			setResult(
				await fetchCheckoutResult({
					orderId,
					guestToken: guestTokenRef.current,
				}),
			);
		} catch (loadError) {
			setError(
				loadError instanceof Error
					? loadError.message
					: "Failed to load payment result.",
			);
		} finally {
			setStatus("idle");
		}
	}, [orderId]);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			void loadResult();
		}, 0);

		return () => {
			window.clearTimeout(timer);
		};
	}, [loadResult]);

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
							Payment result
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
								void loadResult();
							}}
							disabled={status === "loading" || !orderId}
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

			<section className="mx-auto grid max-w-4xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
				<div className="rounded-sm border border-[#ded7ca] bg-white p-6">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex items-center gap-4">
							<span className={`grid size-14 place-items-center ${tone.className}`}>
								<ToneIcon className="size-12" />
							</span>
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
									Backend truth
								</p>
								<h2 className="text-2xl font-semibold">{tone.title}</h2>
								<p className="mt-1 text-sm text-[#65736b]">
									Order and payment statuses are read from Commerce Core API.
								</p>
							</div>
						</div>
						<div className="rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] px-4 py-3 text-right">
							<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
								Total
							</p>
							<p className="text-xl font-bold">
								{formatMoney(paidTotal, resultCurrency)}
							</p>
						</div>
					</div>

					{error && (
						<p className="mt-5 rounded-sm border border-[#e8c8c1] bg-[#fff1ee] px-3 py-2 text-sm font-semibold text-[#a43b24]">
							{error}
						</p>
					)}

					<div className="mt-6 grid gap-3 sm:grid-cols-2">
						<div className="rounded-sm border border-[#ede7dc] p-4">
							<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
								Order
							</p>
							<p className="mt-2 font-semibold">{result?.orderNo ?? "--"}</p>
							<p className="mt-1 break-all text-xs text-[#65736b]">
								{orderId ?? "--"}
							</p>
						</div>
						<div className="rounded-sm border border-[#ede7dc] p-4">
							<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
								Payment order
							</p>
							<p className="mt-2 font-semibold">
								{result?.paymentOrder?.paymentNo ?? "--"}
							</p>
							<p className="mt-1 break-all text-xs text-[#65736b]">
								{paymentOrderId ?? result?.paymentOrder?.paymentOrderId ?? "--"}
							</p>
						</div>
					</div>

					<div className="mt-6 grid gap-3 sm:grid-cols-4">
						{statusRows.map(([label, value]) => (
							<div
								key={label}
								className="rounded-sm border border-[#ede7dc] bg-[#fbfaf7] p-3"
							>
								<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
									{label}
								</p>
								<p className="mt-2 font-semibold">{value ?? "loading"}</p>
							</div>
						))}
					</div>

					<div className="mt-6 flex flex-wrap gap-3">
						{orderId && (
							<Link
								href={`/orders/${encodeURIComponent(orderId)}`}
								className="inline-flex h-11 items-center rounded-sm bg-[#17221b] px-4 text-sm font-bold text-white hover:bg-[#1d7053]"
							>
								View order
							</Link>
						)}
						<Link
							href="/products"
							className="inline-flex h-11 items-center rounded-sm border border-[#d9e1dc] bg-white px-4 text-sm font-bold text-[#425149] hover:border-[#1d7053]"
						>
							Continue shopping
						</Link>
						<Link
							href="/orders"
							className="inline-flex h-11 items-center rounded-sm border border-[#d9e1dc] bg-white px-4 text-sm font-bold text-[#425149] hover:border-[#1d7053]"
						>
							My orders
						</Link>
					</div>
				</div>
			</section>
		</main>
	);
}
