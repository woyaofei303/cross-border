"use client";

import { Alert, Button, Card, InputNumber, Statistic, Table } from "antd";
import { AlertTriangle, CheckCircle2, Play, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { ProcessCommercePipelineResponse } from "@/lib/admin-sites";
import {
	formatDateTime,
	shortId,
	summarizePipelineResult,
} from "@/lib/admin-payments";

type AdminPaymentPipelinePanelProps = {
	initialLimit?: number;
};

type PipelineResultRow = {
	id: string;
	group: string;
	status: string;
	reason?: string;
	errorMessage?: string;
};

function BatchResult({
	label,
	batch,
}: {
	label: string;
	batch:
		| ProcessCommercePipelineResponse["paymentWebhooks"]
		| ProcessCommercePipelineResponse["analyticsEvents"];
}) {
	return (
		<Card size="small" title={label}>
			<div className="grid grid-cols-2 gap-2 text-sm">
				<span>claimed {batch.claimed}</span>
				<span>processed {batch.processed}</span>
				{"skipped" in batch ? <span>skipped {batch.skipped}</span> : null}
				<span>already {batch.alreadyProcessed}</span>
				{"ignored" in batch ? <span>ignored {batch.ignored}</span> : null}
				<span>failed {batch.failed}</span>
			</div>
		</Card>
	);
}

function ResultRows({ result }: { result: ProcessCommercePipelineResponse }) {
	const rows: PipelineResultRow[] = [
		...result.paymentWebhooks.results.map((item) => ({
			...item,
			group: "webhook",
		})),
		...result.paymentSucceededEvents.results.map((item) => ({
			...item,
			group: "payment_event",
		})),
		...result.analyticsEvents.results.map((item) => ({
			...item,
			group: "analytics",
		})),
	];

	return (
		<Table<PipelineResultRow>
			rowKey={(row) => `${row.group}:${row.id}`}
			size="small"
			pagination={false}
			dataSource={rows}
			scroll={{ x: 720 }}
			locale={{ emptyText: "No pipeline items were claimed." }}
			columns={[
				{ title: "Group", dataIndex: "group" },
				{
					title: "Item",
					dataIndex: "id",
					render: (id: string) => (
						<span className="font-mono text-xs">{shortId(id)}</span>
					),
				},
				{ title: "Status", dataIndex: "status" },
				{
					title: "Detail",
					render: (_value: unknown, row: PipelineResultRow) =>
						row.reason ?? row.errorMessage ?? "-",
				},
			]}
		/>
	);
}

export function AdminPaymentPipelinePanel({
	initialLimit = 50,
}: AdminPaymentPipelinePanelProps) {
	const [limit, setLimit] = useState(initialLimit);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<ProcessCommercePipelineResponse>();
	const [processedAt, setProcessedAt] = useState<string>();
	const summary = summarizePipelineResult(result);

	async function processPipeline() {
		setRunning(true);
		setError(null);

		try {
			const response = await fetch(
				"/api/admin/operations/process-pending-commerce",
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ limit }),
				},
			);

			if (!response.ok) {
				throw new Error(`Pipeline request failed with status ${response.status}.`);
			}

			const payload = (await response.json()) as ProcessCommercePipelineResponse;
			setResult(payload);
			setProcessedAt(new Date().toISOString());
		} catch (pipelineError) {
			setError(
				pipelineError instanceof Error
					? pipelineError.message
					: String(pipelineError),
			);
		} finally {
			setRunning(false);
		}
	}

	return (
		<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
			<div className="flex flex-col gap-3 border-b border-[#d9e1dc] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
						Commerce Pipeline
					</p>
					<h2 className="mt-1 text-base font-semibold">
						Process payment webhooks and downstream events
					</h2>
				</div>
				<div className="admin-inline-operation-form">
					<label className="admin-inline-operation-field">
						Limit
						<InputNumber
							min={1}
							max={200}
							value={limit}
							onChange={(nextLimit) => {
								setLimit(typeof nextLimit === "number" ? nextLimit : 50);
							}}
							className="normal-case tracking-normal"
						/>
					</label>
					<Button
						className="admin-inline-operation-button"
						type="primary"
						onClick={processPipeline}
						loading={running}
						disabled={running}
						icon={
							running ? <RefreshCw size={16} /> : <Play size={16} />
						}
					>
						Process
					</Button>
				</div>
			</div>

			<div className="grid gap-3 p-4">
				{error ? (
					<Alert
						icon={<AlertTriangle size={16} />}
						message={error}
						showIcon
						type="error"
					/>
				) : null}
				{result ? (
					<Alert
						type="success"
						message={`Processed at ${formatDateTime(processedAt)}`}
						icon={<CheckCircle2 size={16} />}
						showIcon
					/>
				) : null}
				<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
					{[
						["Claimed", summary.claimed],
						["Processed", summary.processed],
						["Skipped", summary.skipped],
						["Already", summary.alreadyProcessed],
						["Failed", summary.failed],
					].map(([label, value]) => (
						<Card key={label} size="small">
							<Statistic title={label} value={value} />
						</Card>
					))}
				</div>
				{result ? (
					<>
						<div className="grid gap-3 lg:grid-cols-3">
							<BatchResult
								label="Payment Webhooks"
								batch={result.paymentWebhooks}
							/>
							<BatchResult
								label="Payment Events"
								batch={result.paymentSucceededEvents}
							/>
							<BatchResult label="Analytics Events" batch={result.analyticsEvents} />
						</div>
						<ResultRows result={result} />
					</>
				) : null}
			</div>
		</section>
	);
}
