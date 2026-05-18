"use client";

import {
	ArrowLeft,
	CreditCard,
	Lock,
	MapPin,
	RefreshCw,
	ShieldCheck,
	ShoppingBag,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { formatMoney } from "@/lib/commerce";
import type { Currency } from "@/lib/products";
import type { StorefrontSiteContext } from "@/lib/site-context";
import {
	fetchCurrentSiteCustomer,
	getProfileDefaultAddress,
	readStoredAccountAddress,
	readStoredSiteCustomer,
	writeStoredAccountAddress,
	writeStoredSiteCustomer,
} from "@/lib/storefront-account";
import {
	buildCheckoutOrderPayload,
	clearCheckoutDraft,
	createCheckoutOrder,
	createCheckoutPayment,
	getOrCreateCheckoutDraft,
	processDemoCommercePipeline,
	receiveDemoPaymentWebhook,
	type CheckoutShippingAddress,
	type CheckoutWarehouseOption,
} from "@/lib/storefront-checkout";
import {
	fetchCurrentCart,
	getBrowserCartStorage,
	getOrCreateGuestToken,
	type StorefrontCart,
} from "@/lib/storefront-cart";

type CheckoutPageProps = {
	site: StorefrontSiteContext;
	currency: Currency;
	warehouseOptions: CheckoutWarehouseOption[];
};

const initialShippingAddress: CheckoutShippingAddress = {
	email: "buyer@example.com",
	fullName: "Demo Buyer",
	phone: "+1 415 555 0100",
	addressLine1: "100 Market Street",
	addressLine2: "",
	city: "San Francisco",
	region: "CA",
	postalCode: "94105",
	countryCode: "US",
};

function amountToNumber(value: string | undefined) {
	const amount = Number(value ?? "0");

	return Number.isFinite(amount) ? amount : 0;
}

export function CheckoutPage({
	site,
	currency,
	warehouseOptions,
}: CheckoutPageProps) {
	const router = useRouter();
	const guestTokenRef = useRef("");
	const [cart, setCart] = useState<StorefrontCart | null>(null);
	const [shippingAddress, setShippingAddress] = useState(initialShippingAddress);
	const [status, setStatus] = useState<
		"idle" | "loading" | "submitting" | "processing"
	>("idle");
	const [error, setError] = useState("");

	const isBusy =
		status === "loading" || status === "submitting" || status === "processing";
	const cartItems = cart?.items ?? [];
	const canSubmit = cartItems.length > 0 && !isBusy;
	const warehouseBySkuId = useMemo(
		() =>
			new Map(
				warehouseOptions.map((option) => [option.skuId, option.warehouseId]),
			),
		[warehouseOptions],
	);

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
			const storedCustomer = readStoredSiteCustomer();
			const storedAddress = readStoredAccountAddress();

			if (storedAddress.email && storedAddress.fullName) {
				setShippingAddress(storedAddress);
			}

			if (storedCustomer?.siteCustomerId) {
				try {
					const profile = await fetchCurrentSiteCustomer(
						storedCustomer.siteCustomerId,
					);
					const defaultAddress = getProfileDefaultAddress(profile);

					writeStoredSiteCustomer(profile);

					if (defaultAddress) {
						writeStoredAccountAddress(defaultAddress);
						setShippingAddress(defaultAddress);
					}
				} catch {
					// Checkout can still proceed with the local draft or manual address.
				}
			}

			try {
				setCart(await fetchCurrentCart({ guestToken: token, currency }));
			} catch (loadError) {
				setError(
					loadError instanceof Error
						? loadError.message
						: "Failed to load checkout cart.",
				);
			} finally {
				setStatus("idle");
			}
		}

		void loadCart();
	}, [currency]);

	function updateShippingAddress(
		field: keyof CheckoutShippingAddress,
		value: string,
	) {
		setShippingAddress((current) => ({
			...current,
			[field]: value,
		}));
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

	async function submitCheckout(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!cart || cart.items.length === 0) {
			setError("Cart is empty.");
			return;
		}

		setStatus("submitting");
		setError("");

		try {
			const storage = getBrowserCartStorage();
			const draft = getOrCreateCheckoutDraft(storage, cart);
			const storedSiteCustomer = readStoredSiteCustomer();
			const orderPayload = buildCheckoutOrderPayload({
				cart,
				guestToken: getGuestToken(),
				currency,
				shippingAddress,
				warehouseBySkuId,
				idempotencyKey: draft.orderIdempotencyKey,
				...(storedSiteCustomer?.globalUserId
					? { userId: storedSiteCustomer.globalUserId }
					: {}),
			});
			const order = await createCheckoutOrder(orderPayload);
			const payment = await createCheckoutPayment({
				orderId: order.orderId,
				amount: orderPayload.totalAmount,
				currency,
				idempotencyKey: draft.paymentIdempotencyKey,
			});

			setStatus("processing");
			await receiveDemoPaymentWebhook({
				paymentOrderId: payment.paymentOrderId,
				eventSeed: draft.paymentIdempotencyKey,
			});
			await processDemoCommercePipeline();
			clearCheckoutDraft(storage);
			router.push(
				`/payment-result?orderId=${encodeURIComponent(
					order.orderId,
				)}&paymentOrderId=${encodeURIComponent(payment.paymentOrderId)}`,
			);
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "Checkout failed.",
			);
			setStatus("idle");
		}
	}

	return (
		<main className="min-h-screen bg-[#f7f3eb] text-[#17221b]">
			<header className="border-b border-[#ded7ca] bg-white">
				<div className="mx-auto flex min-h-16 max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
					<div>
						<Link
							href="/cart"
							className="inline-flex items-center gap-2 text-sm font-semibold text-[#1d7053]"
						>
							<ArrowLeft className="size-4" />
							Cart
						</Link>
						<h1 className="mt-2 text-2xl font-semibold tracking-normal">
							Checkout
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
								void refreshCart();
							}}
							disabled={isBusy}
							className="inline-flex h-10 items-center gap-2 rounded-sm border border-[#d9e1dc] bg-white px-3 text-sm font-semibold text-[#425149] hover:border-[#1d7053] disabled:cursor-not-allowed disabled:text-[#a8b4ae]"
						>
							<RefreshCw className="size-4" />
							Refresh
						</button>
					</div>
				</div>
			</header>

			<form
				onSubmit={(event) => {
					void submitCheckout(event);
				}}
				className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px] lg:px-8"
			>
				<section className="grid gap-4">
					<div className="rounded-sm border border-[#ded7ca] bg-white p-5">
						<div className="flex items-center gap-3">
							<span className="grid size-10 place-items-center rounded-sm bg-[#eef6f0] text-[#1d7053]">
								<MapPin className="size-5" />
							</span>
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
									Shipping snapshot
								</p>
								<h2 className="font-semibold">Contact and address</h2>
							</div>
						</div>
						<div className="mt-5 grid gap-4 md:grid-cols-2">
							<label className="grid gap-1 text-sm font-semibold">
								Email
								<input
									required
									type="email"
									value={shippingAddress.email}
									onChange={(event) =>
										updateShippingAddress("email", event.target.value)
									}
									className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
								/>
							</label>
							<label className="grid gap-1 text-sm font-semibold">
								Full name
								<input
									required
									value={shippingAddress.fullName}
									onChange={(event) =>
										updateShippingAddress("fullName", event.target.value)
									}
									className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
								/>
							</label>
							<label className="grid gap-1 text-sm font-semibold">
								Phone
								<input
									value={shippingAddress.phone ?? ""}
									onChange={(event) =>
										updateShippingAddress("phone", event.target.value)
									}
									className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
								/>
							</label>
							<label className="grid gap-1 text-sm font-semibold">
								Country code
								<input
									required
									value={shippingAddress.countryCode}
									onChange={(event) =>
										updateShippingAddress(
											"countryCode",
											event.target.value.toUpperCase(),
										)
									}
									className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal uppercase outline-none focus:border-[#1d7053]"
									maxLength={8}
								/>
							</label>
							<label className="grid gap-1 text-sm font-semibold md:col-span-2">
								Address line 1
								<input
									required
									value={shippingAddress.addressLine1}
									onChange={(event) =>
										updateShippingAddress("addressLine1", event.target.value)
									}
									className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
								/>
							</label>
							<label className="grid gap-1 text-sm font-semibold md:col-span-2">
								Address line 2
								<input
									value={shippingAddress.addressLine2 ?? ""}
									onChange={(event) =>
										updateShippingAddress("addressLine2", event.target.value)
									}
									className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
								/>
							</label>
							<label className="grid gap-1 text-sm font-semibold">
								City
								<input
									required
									value={shippingAddress.city}
									onChange={(event) =>
										updateShippingAddress("city", event.target.value)
									}
									className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
								/>
							</label>
							<label className="grid gap-1 text-sm font-semibold">
								Region
								<input
									value={shippingAddress.region ?? ""}
									onChange={(event) =>
										updateShippingAddress("region", event.target.value)
									}
									className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
								/>
							</label>
							<label className="grid gap-1 text-sm font-semibold">
								Postal code
								<input
									required
									value={shippingAddress.postalCode}
									onChange={(event) =>
										updateShippingAddress("postalCode", event.target.value)
									}
									className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
								/>
							</label>
						</div>
					</div>

					<div className="rounded-sm border border-[#ded7ca] bg-white p-5">
						<div className="flex items-center gap-3">
							<span className="grid size-10 place-items-center rounded-sm bg-[#eef6f0] text-[#1d7053]">
								<ShoppingBag className="size-5" />
							</span>
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
									Order snapshot
								</p>
								<h2 className="font-semibold">
									{cart?.quantity ?? 0} items
								</h2>
							</div>
						</div>
						{error && (
							<p className="mt-4 rounded-sm border border-[#e8c8c1] bg-[#fff1ee] px-3 py-2 text-sm font-semibold text-[#a43b24]">
								{error}
							</p>
						)}
						<div className="mt-4 grid gap-3">
							{cartItems.map((item) => (
								<div
									key={item.cartItemId}
									className="grid gap-3 rounded-sm border border-[#ede7dc] p-3 sm:grid-cols-[72px_1fr_auto]"
								>
									<div className="relative aspect-square overflow-hidden rounded-sm bg-[#e7dfd0]">
										{item.imageUrl ? (
											<Image
												src={item.imageUrl}
												alt={item.productTitle}
												fill
												sizes="72px"
												className="object-cover"
											/>
										) : (
											<div className="grid h-full place-items-center">
												<ShoppingBag className="size-6 text-[#b0a797]" />
											</div>
										)}
									</div>
									<div>
										<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#1d7053]">
											{item.skuCode}
										</p>
										<h3 className="mt-1 font-semibold">{item.productTitle}</h3>
										<p className="mt-1 text-sm text-[#65736b]">
											Qty {item.quantity}
										</p>
									</div>
									<p className="font-semibold">
										{formatMoney(
											Number(item.displayUnitPrice) * item.quantity,
											currency,
										)}
									</p>
								</div>
							))}
							{!isBusy && cartItems.length === 0 && (
								<div className="rounded-sm border border-dashed border-[#c9d3cd] p-6 text-center">
									<p className="font-semibold">Cart is empty</p>
									<Link
										href="/products"
										className="mt-4 inline-flex h-10 items-center rounded-sm bg-[#17221b] px-4 text-sm font-bold text-white"
									>
										Browse products
									</Link>
								</div>
							)}
						</div>
					</div>
				</section>

				<aside className="h-fit rounded-sm border border-[#ded7ca] bg-white p-5">
					<div className="flex items-center gap-3">
						<span className="grid size-10 place-items-center rounded-sm bg-[#eef6f0] text-[#1d7053]">
							<CreditCard className="size-5" />
						</span>
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
								Demo payment
							</p>
							<h2 className="font-semibold">Backend verified result</h2>
						</div>
					</div>

					<div className="mt-5 grid gap-3 text-sm">
						<div className="flex items-center justify-between">
							<span className="text-[#65736b]">Subtotal</span>
							<span className="font-semibold">
								{formatMoney(amountToNumber(cart?.subtotalAmount), currency)}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-[#65736b]">Shipping</span>
							<span className="font-semibold">
								{formatMoney(amountToNumber("0.00"), currency)}
							</span>
						</div>
						<div className="border-t border-[#ede7dc] pt-3">
							<div className="flex items-center justify-between text-lg font-bold">
								<span>Total</span>
								<span>
									{formatMoney(amountToNumber(cart?.totalAmount), currency)}
								</span>
							</div>
						</div>
					</div>

					<button
						type="submit"
						disabled={!canSubmit}
						className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#1d7053] text-sm font-bold text-white hover:bg-[#17221b] disabled:cursor-not-allowed disabled:bg-[#b0a797]"
					>
						{isBusy ? (
							<RefreshCw className="size-4 animate-spin" />
						) : (
							<Lock className="size-4" />
						)}
						{status === "processing"
							? "Processing webhook"
							: status === "submitting"
								? "Creating order"
								: "Place order"}
					</button>
					<p className="mt-3 text-xs leading-5 text-[#65736b]">
						The page creates an order and payment order, then sends a demo
						provider webhook. The result page reads statuses from the API.
					</p>
				</aside>
			</form>
		</main>
	);
}
