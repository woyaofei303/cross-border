"use client";

import {
	CheckCircle2,
	PackageCheck,
	RefreshCw,
	RotateCcw,
	ShieldAlert,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { formatMoney } from "@/lib/commerce";
import type { Currency } from "@/lib/products";
import {
	buildAfterSalesRequestItems,
	createStorefrontAfterSalesRequest,
	getAfterSalesBlockedReason,
	getAfterSalesTypeLabel,
	getOrderItemRefundAmount,
	isStorefrontAfterSalesEligible,
	toAfterSalesAmount,
	type CreateStorefrontAfterSalesRequestResult,
	type StorefrontAfterSalesRequestType,
} from "@/lib/storefront-aftersales";
import {
	getBrowserCartStorage,
	getOrCreateGuestToken,
} from "@/lib/storefront-cart";
import type { StorefrontOrderDetail } from "@/lib/storefront-orders";

type AfterSalesRequestPanelProps = {
	order: StorefrontOrderDetail;
	currency: Currency;
	onCreated: () => Promise<void>;
};

function getClientId() {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
		return crypto.randomUUID();
	}

	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getInitialQuantities(order: StorefrontOrderDetail) {
	return Object.fromEntries(
		order.items.map((item) => [item.orderItemId, item.quantity]),
	);
}

function getSelectedTotal(order: StorefrontOrderDetail, selected: Set<string>) {
	const total = order.items
		.filter((item) => selected.has(item.orderItemId))
		.reduce((sum, item) => sum + Number(item.totalAmount), 0);

	return toAfterSalesAmount(total);
}

export function AfterSalesRequestPanel({
	order,
	currency,
	onCreated,
}: AfterSalesRequestPanelProps) {
	const eligible = isStorefrontAfterSalesEligible(order);
	const blockedReason = getAfterSalesBlockedReason(order);
	const initialSelectedItemIds = new Set(
		order.items.map((item) => item.orderItemId),
	);
	const [type, setType] =
		useState<StorefrontAfterSalesRequestType>("refund_only");
	const [reason, setReason] = useState("");
	const [requestedAmount, setRequestedAmount] = useState(() =>
		getSelectedTotal(order, initialSelectedItemIds),
	);
	const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
		() => initialSelectedItemIds,
	);
	const [quantityByItemId, setQuantityByItemId] = useState<
		Record<string, number>
	>(() => getInitialQuantities(order));
	const [status, setStatus] = useState<"idle" | "submitting">("idle");
	const [error, setError] = useState("");
	const [createdRequest, setCreatedRequest] =
		useState<CreateStorefrontAfterSalesRequestResult | null>(null);
	const selectedItems = useMemo(
		() =>
			buildAfterSalesRequestItems({
			items: order.items,
			selectedItemIds,
			quantityByItemId,
		}),
		[order.items, quantityByItemId, selectedItemIds],
	);

	function toggleItem(orderItemId: string) {
		setSelectedItemIds((current) => {
			const next = new Set(current);

			if (next.has(orderItemId)) {
				next.delete(orderItemId);
			} else {
				next.add(orderItemId);
			}

			setRequestedAmount(getSelectedTotal(order, next));
			return next;
		});
	}

	function updateQuantity(orderItemId: string, value: string, maxQuantity: number) {
		const nextQuantity = Math.min(
			Math.max(Number.parseInt(value || "1", 10), 1),
			maxQuantity,
		);

		setQuantityByItemId((current) => ({
			...current,
			[orderItemId]: Number.isFinite(nextQuantity) ? nextQuantity : 1,
		}));
	}

	async function submitAfterSalesRequest(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!eligible) {
			return;
		}

		if (selectedItems.length === 0) {
			setError("Select at least one order item.");
			return;
		}

		if (!reason.trim()) {
			setError("Enter a reason and details for the request.");
			return;
		}

		setStatus("submitting");
		setError("");
		setCreatedRequest(null);

		try {
			const result = await createStorefrontAfterSalesRequest({
				orderId: order.orderId,
				guestToken: getOrCreateGuestToken(getBrowserCartStorage()),
				type,
				reason: reason.trim(),
				requestedAmount,
				idempotencyKey: `aftersales-${order.orderId}-${getClientId()}`,
				items: selectedItems,
			});

			setCreatedRequest(result);
			await onCreated();
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "Failed to create after-sales request.",
			);
		} finally {
			setStatus("idle");
		}
	}

	return (
		<section className="rounded-sm border border-[#ded7ca] bg-white p-5">
			<div className="flex flex-col gap-4 border-b border-[#ede7dc] pb-5 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
						After-sales
					</p>
					<h3 className="mt-1 flex items-center gap-2 text-lg font-semibold">
						<RotateCcw className="size-5 text-[#1d7053]" />
						Request service
					</h3>
				</div>
				<span className="rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] px-3 py-2 text-sm font-semibold text-[#425149]">
					{order.aftersalesStatus}
				</span>
			</div>

			{createdRequest && (
				<div className="mt-4 rounded-sm border border-[#bbdfcc] bg-[#eef8f1] p-3 text-sm text-[#1d7053]">
					<p className="flex items-center gap-2 font-bold">
						<CheckCircle2 className="size-4" />
						{createdRequest.requestNo}
					</p>
					<p className="mt-1">
						Request status: {createdRequest.status}. Money has not moved until
						a refund is approved and marked succeeded.
					</p>
				</div>
			)}

			{!eligible && (
				<div className="mt-4 rounded-sm border border-[#e5dac0] bg-[#fff8e6] p-3 text-sm text-[#8a5a13]">
					<p className="flex items-center gap-2 font-bold">
						<ShieldAlert className="size-4" />
						Unavailable
					</p>
					<p className="mt-1">{blockedReason}</p>
				</div>
			)}

			{eligible && (
				<form onSubmit={submitAfterSalesRequest} className="mt-5 grid gap-5">
					<div className="grid gap-3 sm:grid-cols-2">
						{(["refund_only", "return_refund"] as const).map((option) => (
							<button
								key={option}
								type="button"
								onClick={() => setType(option)}
								className={`rounded-sm border px-4 py-3 text-left text-sm font-semibold ${
									type === option
										? "border-[#1d7053] bg-[#eef8f1] text-[#1d7053]"
										: "border-[#d9e1dc] bg-white text-[#425149] hover:border-[#1d7053]"
								}`}
							>
								{getAfterSalesTypeLabel(option)}
							</button>
						))}
					</div>

					<div className="grid gap-3">
						{order.items.map((item) => (
							<label
								key={item.orderItemId}
								className="grid gap-3 rounded-sm border border-[#ede7dc] p-3 sm:grid-cols-[auto_1fr_88px]"
							>
								<input
									type="checkbox"
									checked={selectedItemIds.has(item.orderItemId)}
									onChange={() => toggleItem(item.orderItemId)}
									className="mt-1 size-4 accent-[#1d7053]"
								/>
								<div>
									<p className="flex items-center gap-2 font-semibold">
										<PackageCheck className="size-4 text-[#65736b]" />
										{item.productTitle}
									</p>
									<p className="mt-1 text-xs text-[#65736b]">
										{item.skuCode} · {formatMoney(Number(item.totalAmount), currency)}
									</p>
									<p className="mt-1 text-xs text-[#65736b]">
										Default requested amount {getOrderItemRefundAmount(item)}
									</p>
								</div>
								<input
									type="number"
									min={1}
									max={item.quantity}
									value={quantityByItemId[item.orderItemId] ?? item.quantity}
									onChange={(event) =>
										updateQuantity(
											item.orderItemId,
											event.target.value,
											item.quantity,
										)
									}
									className="h-10 rounded-sm border border-[#d9e1dc] px-2 text-sm outline-none focus:border-[#1d7053]"
								/>
							</label>
						))}
					</div>

					<label className="grid gap-2 text-sm font-semibold">
						Requested amount
						<input
							value={requestedAmount}
							onChange={(event) => setRequestedAmount(event.target.value)}
							inputMode="decimal"
							className="h-11 rounded-sm border border-[#d9e1dc] px-3 font-normal outline-none focus:border-[#1d7053]"
						/>
					</label>

					<label className="grid gap-2 text-sm font-semibold">
						Reason and details
						<textarea
							required
							value={reason}
							onChange={(event) => setReason(event.target.value)}
							rows={4}
							maxLength={1024}
							className="rounded-sm border border-[#d9e1dc] px-3 py-2 font-normal outline-none focus:border-[#1d7053]"
							placeholder="Example: item arrived damaged, please refund this line."
						/>
					</label>

					{error && (
						<p className="rounded-sm border border-[#e8c8c1] bg-[#fff1ee] px-3 py-2 text-sm font-semibold text-[#a43b24]">
							{error}
						</p>
					)}

					<button
						type="submit"
						disabled={status === "submitting"}
						className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-[#17221b] px-4 text-sm font-bold text-white hover:bg-[#1d7053] disabled:cursor-not-allowed disabled:bg-[#9aa7a0]"
					>
						<RefreshCw
							className={`size-4 ${status === "submitting" ? "animate-spin" : ""}`}
						/>
						Submit request
					</button>
				</form>
			)}
		</section>
	);
}
