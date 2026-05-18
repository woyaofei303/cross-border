"use client";

import { Alert, Button, Input } from "antd";
import { CheckCircle2, CircleDollarSign, XCircle } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
	type AdminAfterSalesRequestDetail,
	getAfterSalesActionState,
} from "@/lib/admin-aftersales";

type AdminAfterSalesActionsPanelProps = {
	request: AdminAfterSalesRequestDetail;
};

type ActionMessage = {
	type: "success" | "error";
	text: string;
};

async function postJson(pathname: string, body: Record<string, unknown>) {
	const response = await fetch(pathname, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	const payload = (await response.json().catch(() => ({}))) as {
		message?: string;
		error?: string;
	};

	if (!response.ok) {
		throw new Error(payload.message ?? payload.error ?? "Request failed.");
	}

	return payload;
}

function makeIdempotencyKey(prefix: string, value: string) {
	return `${prefix}-${value}-${Date.now()}`;
}

export function AdminAfterSalesActionsPanel({
	request,
}: AdminAfterSalesActionsPanelProps) {
	const router = useRouter();
	const actionState = useMemo(() => getAfterSalesActionState(request), [request]);
	const [approvedAmount, setApprovedAmount] = useState(
		actionState.defaultApprovedAmount,
	);
	const [rejectReason, setRejectReason] = useState("Request rejected by admin");
	const [providerRefundId, setProviderRefundId] = useState(
		`REF-${request.requestNo.slice(-8)}`,
	);
	const [message, setMessage] = useState<ActionMessage | undefined>();
	const [isPending, startTransition] = useTransition();

	function runAction(action: () => Promise<void>) {
		setMessage(undefined);
		startTransition(async () => {
			try {
				await action();
				router.refresh();
			} catch (error) {
				setMessage({
					type: "error",
					text: error instanceof Error ? error.message : String(error),
				});
			}
		});
	}

	const basePath = `/api/admin/after-sales/${request.afterSalesRequestId}`;
	const canMarkRefundSucceeded = Boolean(actionState.refundIdToMarkSucceeded);

	return (
		<section className="rounded-sm border border-[#d9e1dc] bg-white p-4">
			<div className="flex flex-col gap-2 border-b border-[#edf1ef] pb-3 md:flex-row md:items-center md:justify-between">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
						After-sales Actions
					</p>
					<h2 className="mt-1 text-base font-semibold">
						{request.status} / {request.order.paymentStatus}
					</h2>
				</div>
				<p className="text-sm text-[#65736b]">
					Approval changes request state; refund success records money movement.
				</p>
			</div>

			<div className="mt-4 grid gap-3 xl:grid-cols-3">
				<form
					className="grid gap-3 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3"
					onSubmit={(event) => {
						event.preventDefault();
						runAction(async () => {
							await postJson(`${basePath}/approve-refund`, {
								approvedAmount,
								idempotencyKey: makeIdempotencyKey(
									"approve-refund",
									request.afterSalesRequestId,
								),
							});
							setMessage({
								type: "success",
								text: "After-sales request approved and refund created.",
							});
						});
					}}
				>
					<div className="flex items-center gap-2 text-[#1d7053]">
						<CheckCircle2 className="size-4" />
						<p className="text-sm font-semibold">Approve Refund</p>
					</div>
					<label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
						Approved Amount
						<Input
							value={approvedAmount}
							onChange={(event) => setApprovedAmount(event.target.value)}
						/>
					</label>
					<Button
						htmlType="submit"
						disabled={!actionState.canApprove}
						icon={<CheckCircle2 className="size-4" />}
						loading={isPending}
						type="primary"
					>
						Approve
					</Button>
				</form>

				<form
					className="grid gap-3 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3"
					onSubmit={(event) => {
						event.preventDefault();
						runAction(async () => {
							await postJson(`${basePath}/reject`, {
								reason: rejectReason,
							});
							setMessage({
								type: "success",
								text: "After-sales request rejected.",
							});
						});
					}}
				>
					<div className="flex items-center gap-2 text-[#a43b24]">
						<XCircle className="size-4" />
						<p className="text-sm font-semibold">Reject Request</p>
					</div>
					<label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
						Reject Reason
						<Input
							value={rejectReason}
							onChange={(event) => setRejectReason(event.target.value)}
						/>
					</label>
					<Button
						danger
						htmlType="submit"
						disabled={!actionState.canReject}
						icon={<XCircle className="size-4" />}
						loading={isPending}
					>
						Reject
					</Button>
				</form>

				<form
					className="grid gap-3 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3"
					onSubmit={(event) => {
						event.preventDefault();

						if (!actionState.refundIdToMarkSucceeded) {
							return;
						}

						runAction(async () => {
							await postJson(
								`/api/admin/payment-refunds/${actionState.refundIdToMarkSucceeded}/mark-succeeded`,
								{
									providerRefundId,
									responsePayload: {
										source: "admin-after-sales",
										providerRefundId,
									},
								},
							);
							setMessage({
								type: "success",
								text: "Payment refund marked succeeded.",
							});
						});
					}}
				>
					<div className="flex items-center gap-2 text-[#1d7053]">
						<CircleDollarSign className="size-4" />
						<p className="text-sm font-semibold">Refund Succeeded</p>
					</div>
					<label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
						Provider Refund
						<Input
							value={providerRefundId}
							onChange={(event) => setProviderRefundId(event.target.value)}
						/>
					</label>
					<Button
						htmlType="submit"
						disabled={!canMarkRefundSucceeded}
						icon={<CircleDollarSign className="size-4" />}
						loading={isPending}
					>
						Mark Succeeded
					</Button>
				</form>
			</div>

			{message ? (
				<Alert
					className="mt-3"
					message={message.text}
					showIcon
					type={message.type}
				/>
			) : null}
		</section>
	);
}
