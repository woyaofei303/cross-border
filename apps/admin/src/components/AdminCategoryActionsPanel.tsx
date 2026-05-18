"use client";

import { Alert, Button, Checkbox, Input, InputNumber, Tag } from "antd";
import { FolderTree, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminProductCategory } from "@/lib/admin-products";

type AdminCategoryActionsPanelProps = {
	categories: AdminProductCategory[];
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

export function AdminCategoryActionsPanel({
	categories,
}: AdminCategoryActionsPanelProps) {
	const router = useRouter();
	const [message, setMessage] = useState<string | undefined>();
	const [error, setError] = useState<string | undefined>();
	const [isPending, startTransition] = useTransition();

	function runAction(action: () => Promise<void>) {
		setMessage(undefined);
		setError(undefined);
		startTransition(async () => {
			try {
				await action();
				setMessage("Category changes saved.");
				router.refresh();
			} catch (caught) {
				setError(caught instanceof Error ? caught.message : String(caught));
			}
		});
	}

	return (
		<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
			<div className="flex flex-col gap-2 border-b border-[#d9e1dc] px-4 py-3 md:flex-row md:items-center md:justify-between">
				<div>
					<div className="flex items-center gap-2 text-[#1d7053]">
						<FolderTree className="size-4" />
						<h2 className="text-base font-semibold text-[#17221b]">
							Category Management
						</h2>
					</div>
					<p className="mt-1 text-sm text-[#65736b]">
						Keep category naming, sort order and active state compact.
					</p>
				</div>
				<Tag>{categories.length} categories</Tag>
			</div>
			<div className="grid max-w-5xl gap-3 p-4">
				{categories.map((category) => (
					<CategoryForm
						key={category.categoryId}
						category={category}
						isPending={isPending}
						onSubmit={(body) =>
							runAction(async () => {
								await postJson(
									`/api/admin/categories/${category.categoryId}/update`,
									body,
								);
							})
						}
					/>
				))}
				{categories.length === 0 ? (
					<p className="py-6 text-center text-sm text-[#65736b]">
						No categories are available for this scope.
					</p>
				) : null}
				{message ? (
					<Alert message={message} showIcon type="success" />
				) : null}
				{error ? (
					<Alert message={error} showIcon type="error" />
				) : null}
			</div>
		</section>
	);
}

function CategoryForm({
	category,
	isPending,
	onSubmit,
}: {
	category: AdminProductCategory;
	isPending: boolean;
	onSubmit: (body: Record<string, unknown>) => void;
}) {
	const [name, setName] = useState(category.name);
	const [sortOrder, setSortOrder] = useState(category.sortOrder);
	const [isActive, setIsActive] = useState(category.isActive);

	return (
		<form
			className="grid gap-3 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3 md:grid-cols-[minmax(260px,1fr)_120px_100px_auto] md:items-end"
			onSubmit={(event) => {
				event.preventDefault();
				onSubmit({
					name,
					sortOrder,
					isActive,
				});
			}}
		>
			<label className="grid gap-1">
				<span className="text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
					Category
				</span>
				<Input
					value={name}
					onChange={(event) => setName(event.target.value)}
				/>
			</label>
			<label className="grid gap-1">
				<span className="text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
					Sort
				</span>
				<InputNumber
					className="w-full"
					min={0}
					value={sortOrder}
					onChange={(value) => setSortOrder(Number(value ?? 0))}
				/>
			</label>
			<Checkbox
				checked={isActive}
				className="pb-[9px] font-semibold"
				onChange={(event) => setIsActive(event.target.checked)}
			>
				Active
			</Checkbox>
			<Button
				htmlType="submit"
				icon={<Save className="size-4" />}
				loading={isPending}
				type="primary"
				className="self-end"
			>
				Save
			</Button>
		</form>
	);
}
