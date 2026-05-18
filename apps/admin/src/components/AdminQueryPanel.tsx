"use client";

import { Button, DatePicker, Form, Input, Select } from "antd";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { buildAdminListPath } from "@/lib/admin-list-controls";

export type AdminQueryField =
	| {
			name: string;
			label: string;
			type: "search" | "date";
			value?: string;
			placeholder?: string;
	  }
	| {
			name: string;
			label: string;
			type: "select";
			value?: string;
			options: Array<{ label: string; value: string }>;
	  };

type AdminQueryPanelValues = Record<
	string,
	| string
	| {
			format: (format: string) => string;
	  }
	| undefined
>;

function normalizeSubmittedValues(values: AdminQueryPanelValues) {
	return Object.entries(values).reduce<Record<string, string | undefined>>(
		(result, [key, value]) => {
			const normalizedValue =
				typeof value === "string" ? value.trim() : value?.format("YYYY-MM-DD");

			result[key] = normalizedValue || undefined;
			return result;
		},
		{},
	);
}

export function AdminQueryPanel({
	action,
	fields,
	hiddenFields,
	clearHref,
}: {
	action: string;
	fields: AdminQueryField[];
	hiddenFields?: Record<string, string | number | undefined>;
	clearHref: string;
}) {
	const router = useRouter();
	const initialValues = useMemo(
		() =>
			fields.reduce<AdminQueryPanelValues>((result, field) => {
				if (field.type !== "date") {
					result[field.name] = field.value ?? "";
				}

				return result;
			}, {}),
		[fields],
	);
	const [dateValues, setDateValues] = useState<Record<string, string | undefined>>(
		() =>
			fields.reduce<Record<string, string | undefined>>((result, field) => {
				if (field.type === "date") {
					result[field.name] = field.value;
				}

				return result;
			}, {}),
	);
	const formKey = useMemo(
		() =>
			fields
				.map((field) => `${field.name}:${field.value ?? ""}`)
				.concat(
					Object.entries(hiddenFields ?? {}).map(
						([key, value]) => `${key}:${value ?? ""}`,
					),
				)
				.join("|"),
		[fields, hiddenFields],
	);

	function handleFinish(values: AdminQueryPanelValues) {
		router.push(
			buildAdminListPath(action, {
				...(hiddenFields ?? {}),
				...normalizeSubmittedValues({ ...values, ...dateValues }),
				page: 1,
			}),
		);
	}

	return (
		<Form
			key={formKey}
			className="admin-query-panel admin-query-panel--antd"
			initialValues={initialValues}
			layout="vertical"
			onFinish={handleFinish}
		>
			{fields.map((field) => (
				<Form.Item
					key={field.name}
					className="admin-query-field"
					colon={false}
					label={field.label}
					name={field.name}
				>
					{field.type === "select" ? (
						<Select
							allowClear
							options={field.options}
							placeholder={field.label}
						/>
					) : field.type === "date" ? (
						<DatePicker
							allowClear
							format="YYYY-MM-DD"
							placeholder={field.value ?? field.placeholder ?? field.label}
							style={{ width: "100%" }}
							onChange={(_, dateString) => {
								const nextValue = Array.isArray(dateString)
									? dateString[0]
									: dateString;
								setDateValues((current) => ({
									...current,
									[field.name]: nextValue || undefined,
								}));
							}}
						/>
					) : (
						<Input
							allowClear
							name={field.name}
							placeholder={field.placeholder}
							prefix={
								field.type === "search" ? <Search className="size-4" /> : null
							}
							type="search"
						/>
					)}
				</Form.Item>
			))}
			<Form.Item className="admin-query-actions">
				<Button htmlType="submit" icon={<Search className="size-4" />} type="primary">
					Search
				</Button>
				<Button
					htmlType="button"
					icon={<X className="size-4" />}
					onClick={() => router.push(clearHref)}
				>
					Clear
				</Button>
			</Form.Item>
		</Form>
	);
}
