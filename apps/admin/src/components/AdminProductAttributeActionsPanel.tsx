"use client";

import { Alert, Button, Checkbox, Input, InputNumber, Select, Tag } from "antd";
import { Plus, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
	AdminProductAttribute,
	ProductAttributeType,
} from "@/lib/admin-sites";

type AttributeStatus = "active" | "inactive" | "archived";

type ActionMessage = {
	type: "success" | "error";
	text: string;
};

const attributeTypeOptions: Array<{
	label: ProductAttributeType;
	value: ProductAttributeType;
}> = [
	{ label: "text", value: "text" },
	{ label: "number", value: "number" },
	{ label: "boolean", value: "boolean" },
	{ label: "select", value: "select" },
	{ label: "multiselect", value: "multiselect" },
	{ label: "json", value: "json" },
];

const attributeStatusOptions: Array<{
	label: AttributeStatus;
	value: AttributeStatus;
}> = [
	{ label: "active", value: "active" },
	{ label: "inactive", value: "inactive" },
	{ label: "archived", value: "archived" },
];

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

function Message({ message }: { message: ActionMessage | undefined }) {
	if (!message) {
		return null;
	}

	return (
		<Alert
			className="max-w-xl"
			message={message.text}
			showIcon
			type={message.type}
		/>
	);
}

export function AdminProductAttributeActionsPanel({
	verticalId,
	attributes,
	totalAttributes,
}: {
	verticalId: string;
	attributes: AdminProductAttribute[];
	totalAttributes: number;
}) {
	const router = useRouter();
	const [message, setMessage] = useState<ActionMessage | undefined>();
	const [isPending, startTransition] = useTransition();
	const [code, setCode] = useState("");
	const [name, setName] = useState("");
	const [type, setType] = useState<ProductAttributeType>("text");
	const [filterable, setFilterable] = useState(true);
	const [searchable, setSearchable] = useState(false);

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

	return (
		<section className="grid gap-4 rounded-sm border border-[#d9e1dc] bg-white p-4">
			<div className="flex flex-col gap-2 border-b border-[#edf1ef] pb-3 md:flex-row md:items-center md:justify-between">
				<div>
					<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
						Vertical Attribute Actions
					</p>
					<h2 className="mt-1 text-base font-semibold">
						{totalAttributes} configured fields
					</h2>
					<p className="mt-1 text-sm text-[#65736b]">
						Use this page to maintain product form fields, storefront filters,
						and search facets for the selected vertical.
					</p>
				</div>
				<Message message={message} />
			</div>

			<form
				className="grid max-w-6xl gap-3 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3 lg:grid-cols-[minmax(160px,1fr)_minmax(220px,1.2fr)_170px_auto_auto_auto] lg:items-end"
				onSubmit={(event) => {
					event.preventDefault();
					runAction(async () => {
						await postJson("/api/admin/product-attributes", {
							verticalId,
							code,
							name,
							type,
							filterable,
							searchable,
							required: false,
							status: "active",
						});
						setCode("");
						setName("");
						setMessage({ type: "success", text: "Attribute saved." });
					});
				}}
			>
				<label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
					Code
					<Input
						value={code}
						onChange={(event) => setCode(event.target.value)}
					/>
				</label>
				<label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
					Name
					<Input
						value={name}
						onChange={(event) => setName(event.target.value)}
					/>
				</label>
				<label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
					Type
					<Select<ProductAttributeType>
						options={attributeTypeOptions}
						value={type}
						onChange={(nextType) => setType(nextType)}
					/>
				</label>
				<Checkbox
					checked={filterable}
					className="self-end font-semibold text-[#425149]"
					onChange={(event) => setFilterable(event.target.checked)}
				>
					Filterable
				</Checkbox>
				<Checkbox
					checked={searchable}
					className="self-end font-semibold text-[#425149]"
					onChange={(event) => setSearchable(event.target.checked)}
				>
					Searchable
				</Checkbox>
				<Button
					htmlType="submit"
					icon={<Plus className="size-4" />}
					loading={isPending}
					type="primary"
					className="self-end"
				>
					Add
				</Button>
			</form>

			<div className="grid max-w-7xl gap-3">
				{attributes.map((attribute) => (
					<AttributeForm
						key={attribute.id}
						attribute={attribute}
						isPending={isPending}
						onSubmit={(payload) =>
							runAction(async () => {
								await postJson(
									`/api/admin/product-attributes/${attribute.id}`,
									payload,
								);
								setMessage({
									type: "success",
									text: `${attribute.code} updated.`,
								});
							})
						}
						onOptionSubmit={(payload) =>
							runAction(async () => {
								await postJson(
									`/api/admin/product-attributes/${attribute.id}/options`,
									payload,
								);
								setMessage({
									type: "success",
									text: `${attribute.code} option saved.`,
								});
							})
						}
					/>
				))}
			</div>
		</section>
	);
}

function AttributeForm({
	attribute,
	isPending,
	onSubmit,
	onOptionSubmit,
}: {
	attribute: AdminProductAttribute;
	isPending: boolean;
	onSubmit: (payload: Record<string, unknown>) => void;
	onOptionSubmit: (payload: Record<string, unknown>) => void;
}) {
	const [name, setName] = useState(attribute.name);
	const [required, setRequired] = useState(attribute.required);
	const [searchable, setSearchable] = useState(attribute.searchable);
	const [filterable, setFilterable] = useState(attribute.filterable);
	const [sortOrder, setSortOrder] = useState(attribute.sortOrder);
	const [status, setStatus] = useState<AttributeStatus>(attribute.status);
	const [optionLabel, setOptionLabel] = useState("");
	const [optionValue, setOptionValue] = useState("");

	return (
		<div className="grid gap-3 rounded-sm border border-[#d9e1dc] bg-[#f8faf9] p-3">
			<form
				className="grid gap-3"
				onSubmit={(event) => {
					event.preventDefault();
					onSubmit({
						name,
						required,
						searchable,
						filterable,
						sortOrder,
						status,
					});
				}}
			>
				<div className="grid gap-3 xl:grid-cols-[180px_minmax(240px,1fr)_180px_110px_280px_150px] xl:items-end">
					<div className="self-center">
						<p className="text-sm font-semibold">{attribute.code}</p>
						<div className="mt-2">
							<Tag>{attribute.type}</Tag>
						</div>
					</div>
					<label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
						Name
						<Input
							value={name}
							onChange={(event) => setName(event.target.value)}
						/>
					</label>
					<label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
						Status
						<Select<AttributeStatus>
							options={attributeStatusOptions}
							value={status}
							onChange={(nextStatus) => setStatus(nextStatus)}
						/>
					</label>
					<label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
						Sort
						<InputNumber
							className="w-full"
							min={0}
							value={sortOrder}
							onChange={(value) => setSortOrder(Number(value ?? 0))}
						/>
					</label>
					<div className="grid grid-cols-3 gap-2 pb-[7px]">
						<Checkbox
							checked={required}
							className="font-semibold text-[#425149]"
							onChange={(event) => setRequired(event.target.checked)}
						>
							Required
						</Checkbox>
						<Checkbox
							checked={filterable}
							className="font-semibold text-[#425149]"
							onChange={(event) => setFilterable(event.target.checked)}
						>
							Filter
						</Checkbox>
						<Checkbox
							checked={searchable}
							className="font-semibold text-[#425149]"
							onChange={(event) => setSearchable(event.target.checked)}
						>
							Search
						</Checkbox>
					</div>
					<Button
						htmlType="submit"
						icon={<Save className="size-4" />}
						loading={isPending}
						type="primary"
					>
						Save Attribute
					</Button>
				</div>
			</form>

			<form
				className="grid gap-3 border-t border-[#edf1ef] pt-3 xl:grid-cols-[180px_minmax(220px,1fr)_minmax(220px,1fr)_auto_1fr] xl:items-end"
				onSubmit={(event) => {
					event.preventDefault();
					onOptionSubmit({
						label: optionLabel,
						value: optionValue,
						sortOrder: attribute.options.length + 1,
					});
					setOptionLabel("");
					setOptionValue("");
				}}
			>
				<p className="self-center text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
					Options
				</p>
				<label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
					Option Label
					<Input
						value={optionLabel}
						onChange={(event) => setOptionLabel(event.target.value)}
					/>
				</label>
				<label className="grid gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#65736b]">
					Option Value
					<Input
						value={optionValue}
						onChange={(event) => setOptionValue(event.target.value)}
					/>
				</label>
				<Button
					htmlType="submit"
					icon={<Plus className="size-4" />}
					loading={isPending}
					className="self-end"
				>
					Option
				</Button>
				<p className="pb-[9px] text-xs text-[#65736b]">
					{attribute.options.length > 0
						? attribute.options.map((option) => option.label).join(", ")
						: "-"}
				</p>
			</form>
		</div>
	);
}
