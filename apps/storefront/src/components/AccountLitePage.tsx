"use client";

import {
	CheckCircle2,
	MapPin,
	ReceiptText,
	RefreshCw,
	ShieldCheck,
	ShoppingBag,
	UserRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StorefrontSiteContext } from "@/lib/site-context";
import {
	clearStoredAccountAddress,
	clearStoredSiteCustomer,
	emptyAccountAddress,
	fetchCurrentSiteCustomer,
	getProfileDefaultAddress,
	readStoredAccountAddress,
	readStoredSiteCustomer,
	type AccountLiteAddress,
	upsertCurrentSiteCustomer,
	writeStoredAccountAddress,
	writeStoredSiteCustomer,
} from "@/lib/storefront-account";
import {
	getBrowserCartStorage,
	getOrCreateGuestToken,
} from "@/lib/storefront-cart";

type AccountLitePageProps = {
	site: StorefrontSiteContext;
};

export function AccountLitePage({ site }: AccountLitePageProps) {
	const guestTokenRef = useRef("");
	const [guestToken, setGuestToken] = useState("");
	const [address, setAddress] =
		useState<AccountLiteAddress>(emptyAccountAddress);
	const [savedAt, setSavedAt] = useState("");
	const [siteCustomerId, setSiteCustomerId] = useState("");
	const [error, setError] = useState("");
	const [status, setStatus] = useState<"idle" | "saving">("idle");
	const completedFields = useMemo(
		() =>
			Object.entries(address).filter(
				([key, value]) => key !== "addressLine2" && value.trim(),
			).length,
		[address],
	);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			guestTokenRef.current = getOrCreateGuestToken(getBrowserCartStorage());
			setGuestToken(guestTokenRef.current);
			setAddress(readStoredAccountAddress());
			const storedCustomer = readStoredSiteCustomer();
			setSiteCustomerId(storedCustomer?.siteCustomerId ?? "");

			if (storedCustomer?.siteCustomerId) {
				void fetchCurrentSiteCustomer(storedCustomer.siteCustomerId)
					.then((profile) => {
						const defaultAddress = getProfileDefaultAddress(profile);
						const refreshedCustomer = writeStoredSiteCustomer(profile);

						setSiteCustomerId(refreshedCustomer.siteCustomerId);

						if (defaultAddress) {
							writeStoredAccountAddress(defaultAddress);
							setAddress(defaultAddress);
						}
					})
					.catch(() => {
						clearStoredSiteCustomer();
						setSiteCustomerId("");
					});
			}
		}, 0);

		return () => {
			window.clearTimeout(timer);
		};
	}, []);

	const updateAddress = (field: keyof AccountLiteAddress, value: string) => {
		setAddress((current) => ({
			...current,
			[field]: field === "countryCode" ? value.toUpperCase() : value,
		}));
	};

	const saveAddress = async () => {
		setStatus("saving");
		setError("");

		try {
			writeStoredAccountAddress(address);
			const profile = await upsertCurrentSiteCustomer({
				guestToken: guestTokenRef.current || guestToken,
				address,
			});
			const storedCustomer = writeStoredSiteCustomer(profile);
			setSiteCustomerId(storedCustomer.siteCustomerId);
			setSavedAt(new Date().toLocaleTimeString());
		} catch (saveError) {
			setError(
				saveError instanceof Error ? saveError.message : "Unable to save account.",
			);
		} finally {
			setStatus("idle");
		}
	};

	const resetSession = () => {
		clearStoredAccountAddress();
		clearStoredSiteCustomer();
		setAddress(emptyAccountAddress);
		setSiteCustomerId("");
		setSavedAt("");
		setError("");
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
							<ShoppingBag className="size-4" />
							Products
						</Link>
						<h1 className="mt-2 text-2xl font-semibold tracking-normal">
							Account
						</h1>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Link
							href="/orders"
							className="inline-flex h-10 items-center gap-2 rounded-sm border border-[#d9e1dc] bg-white px-3 text-sm font-semibold text-[#425149] hover:border-[#1d7053]"
						>
							<ReceiptText className="size-4" />
							Orders
						</Link>
						<span className="inline-flex h-10 items-center gap-2 rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] px-3 text-sm font-semibold text-[#425149]">
							<ShieldCheck className="size-4 text-[#1d7053]" />
							{site.siteName}
						</span>
					</div>
				</div>
			</header>

			<section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[320px_1fr] lg:px-8">
				<aside className="grid h-fit gap-4">
					<div className="rounded-sm border border-[#ded7ca] bg-white p-5">
						<UserRound className="size-9 text-[#1d7053]" />
						<h2 className="mt-4 text-xl font-semibold">Guest profile</h2>
						<p className="mt-2 break-all text-xs text-[#65736b]">
							{guestToken || "loading"}
						</p>
					</div>
					<div className="rounded-sm border border-[#ded7ca] bg-white p-5">
						<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
							Address completeness
						</p>
						<p className="mt-2 text-2xl font-bold">{completedFields}/8</p>
					</div>
				</aside>

				<div className="rounded-sm border border-[#ded7ca] bg-white p-5">
					<div className="flex flex-col gap-4 border-b border-[#ede7dc] pb-5 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h2 className="flex items-center gap-2 text-xl font-semibold">
								<MapPin className="size-5 text-[#1d7053]" />
								Default shipping address
							</h2>
							<p className="mt-1 text-sm text-[#65736b]">
								This draft stays on this device until registered accounts are
								enabled.
							</p>
						</div>
						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={resetSession}
								className="inline-flex h-10 items-center gap-2 rounded-sm border border-[#d9e1dc] bg-white px-3 text-sm font-semibold text-[#425149] hover:border-[#a43b24]"
							>
								<RefreshCw className="size-4" />
								Reset
							</button>
							<button
								type="button"
								onClick={() => {
									void saveAddress();
								}}
								disabled={status === "saving"}
								className="inline-flex h-10 items-center gap-2 rounded-sm bg-[#17221b] px-4 text-sm font-bold text-white hover:bg-[#1d7053]"
							>
								<CheckCircle2 className="size-4" />
								{status === "saving" ? "Saving" : "Save"}
							</button>
						</div>
					</div>

					{siteCustomerId ? (
						<p className="mt-5 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] px-3 py-2 text-xs font-semibold text-[#425149]">
							Site customer: {siteCustomerId}
						</p>
					) : null}

					<div className="mt-5 grid gap-4 sm:grid-cols-2">
						<label className="grid gap-2 text-sm font-semibold">
							Email
							<input
								value={address.email}
								onChange={(event) => updateAddress("email", event.target.value)}
								className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
								type="email"
							/>
						</label>
						<label className="grid gap-2 text-sm font-semibold">
							Full name
							<input
								value={address.fullName}
								onChange={(event) =>
									updateAddress("fullName", event.target.value)
								}
								className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
							/>
						</label>
						<label className="grid gap-2 text-sm font-semibold">
							Phone
							<input
								value={address.phone}
								onChange={(event) => updateAddress("phone", event.target.value)}
								className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
							/>
						</label>
						<label className="grid gap-2 text-sm font-semibold">
							Country
							<input
								value={address.countryCode}
								onChange={(event) =>
									updateAddress("countryCode", event.target.value)
								}
								maxLength={8}
								className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal uppercase outline-none focus:border-[#1d7053]"
							/>
						</label>
						<label className="grid gap-2 text-sm font-semibold sm:col-span-2">
							Address line 1
							<input
								value={address.addressLine1}
								onChange={(event) =>
									updateAddress("addressLine1", event.target.value)
								}
								className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
							/>
						</label>
						<label className="grid gap-2 text-sm font-semibold sm:col-span-2">
							Address line 2
							<input
								value={address.addressLine2}
								onChange={(event) =>
									updateAddress("addressLine2", event.target.value)
								}
								className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
							/>
						</label>
						<label className="grid gap-2 text-sm font-semibold">
							City
							<input
								value={address.city}
								onChange={(event) => updateAddress("city", event.target.value)}
								className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
							/>
						</label>
						<label className="grid gap-2 text-sm font-semibold">
							Region
							<input
								value={address.region}
								onChange={(event) =>
									updateAddress("region", event.target.value)
								}
								className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
							/>
						</label>
						<label className="grid gap-2 text-sm font-semibold">
							Postal code
							<input
								value={address.postalCode}
								onChange={(event) =>
									updateAddress("postalCode", event.target.value)
								}
								className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
							/>
						</label>
					</div>

					{savedAt && (
						<p className="mt-5 rounded-sm border border-[#bbdfcc] bg-[#eef8f1] px-3 py-2 text-sm font-semibold text-[#1d7053]">
							Address saved at {savedAt}.
						</p>
					)}
					{error ? (
						<p className="mt-5 rounded-sm border border-[#e8c8c1] bg-[#fff1ee] px-3 py-2 text-sm font-semibold text-[#a43b24]">
							{error}
						</p>
					) : null}
				</div>
			</section>
		</main>
	);
}
