"use client";

import { Alert, Button, Select } from "antd";
import { ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { AdminUserSummary } from "@/lib/admin-rbac";
import type {
	AdminBrand,
	AdminScopeType,
	AdminSite,
	AdminVertical,
} from "@/lib/admin-sites";

type AdminScopeAssignmentPanelProps = {
	users: AdminUserSummary[];
	sites: AdminSite[];
	verticals: AdminVertical[];
	brands: AdminBrand[];
};

const scopeTypeOptions: Array<{ label: string; value: AdminScopeType }> = [
	{ label: "Global", value: "global" },
	{ label: "Vertical", value: "vertical" },
	{ label: "Brand", value: "brand" },
	{ label: "Site", value: "site" },
];

export function AdminScopeAssignmentPanel({
	users,
	sites,
	verticals,
	brands,
}: AdminScopeAssignmentPanelProps) {
	const [adminUserId, setAdminUserId] = useState(users[0]?.adminUserId ?? "");
	const [scopeType, setScopeType] = useState<AdminScopeType>("site");
	const [scopeId, setScopeId] = useState(sites[0]?.siteId ?? "");
	const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">(
		"idle",
	);
	const [message, setMessage] = useState("");
	const scopeOptions = useMemo(() => {
		if (scopeType === "vertical") {
			return verticals.map((vertical) => ({
				value: vertical.id,
				label: vertical.name,
			}));
		}

		if (scopeType === "brand") {
			return brands.map((brand) => ({
				value: brand.id,
				label: brand.name,
			}));
		}

		if (scopeType === "site") {
			return sites.map((site) => ({
				value: site.siteId,
				label: site.siteName,
			}));
		}

		return [{ value: "", label: "All data" }];
	}, [brands, scopeType, sites, verticals]);

	const adminUserOptions = useMemo(
		() =>
			users.map((user) => ({
				value: user.adminUserId,
				label: `${user.displayName} / ${user.email}`,
			})),
		[users],
	);

	const onScopeTypeChange = (nextScopeType: AdminScopeType) => {
		setScopeType(nextScopeType);

		if (nextScopeType === "global") {
			setScopeId("");
			return;
		}

		const firstOption =
			nextScopeType === "vertical"
				? verticals[0]?.id
				: nextScopeType === "brand"
					? brands[0]?.id
					: sites[0]?.siteId;

		setScopeId(firstOption ?? "");
	};

	const assignScope = async () => {
		setStatus("saving");
		setMessage("");

		try {
			const response = await fetch(
				`/api/admin/rbac/users/${encodeURIComponent(adminUserId)}/scopes`,
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						scopeType,
						...(scopeType === "global" ? {} : { scopeId }),
					}),
				},
			);
			const payload = (await response.json().catch(() => ({}))) as {
				message?: string;
			};

			if (!response.ok) {
				throw new Error(payload.message ?? "Scope assignment failed.");
			}

			setStatus("saved");
			setMessage("Scope assigned. Refresh the page to view the updated snapshot.");
		} catch (error) {
			setStatus("failed");
			setMessage(
				error instanceof Error ? error.message : "Scope assignment failed.",
			);
		}
	};

	return (
		<div className="rounded-sm border border-[#d9e1dc] bg-white p-4">
			<div className="flex items-center gap-2 text-[#1d7053]">
				<ShieldCheck className="size-4" />
				<p className="text-xs font-bold uppercase tracking-[0.14em]">
					Scope Assignment
				</p>
			</div>
			<div className="mt-4 grid gap-3 md:grid-cols-[1.4fr_1fr_1.4fr_auto]">
				<label className="grid gap-1 text-sm font-semibold">
					Admin user
					<Select<string>
						options={adminUserOptions}
						value={adminUserId}
						onChange={(nextAdminUserId) => setAdminUserId(nextAdminUserId)}
					/>
				</label>
				<label className="grid gap-1 text-sm font-semibold">
					Scope
					<Select<AdminScopeType>
						options={scopeTypeOptions}
						value={scopeType}
						onChange={(nextScopeType) => onScopeTypeChange(nextScopeType)}
					/>
				</label>
				<label className="grid gap-1 text-sm font-semibold">
					Scope target
					<Select<string>
						disabled={scopeType === "global"}
						options={scopeOptions}
						value={scopeId}
						onChange={(nextScopeId) => setScopeId(nextScopeId)}
					/>
				</label>
				<Button
					htmlType="button"
					onClick={() => {
						void assignScope();
					}}
					disabled={!adminUserId || status === "saving"}
					icon={<ShieldCheck className="size-4" />}
					loading={status === "saving"}
					type="primary"
					className="mt-auto"
				>
					{status === "saving" ? "Saving" : "Assign"}
				</Button>
			</div>
			{message ? (
				<Alert
					className="mt-3"
					message={message}
					showIcon
					type={status === "failed" ? "error" : "success"}
				/>
			) : null}
		</div>
	);
}
