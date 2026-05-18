"use client";

import { Button, Input, Segmented } from "antd";
import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { buildAdminAuditPath } from "@/lib/admin-audit";
import type { AdminScopeType } from "@/lib/admin-sites";

const scopeOptions: Array<{ label: string; value: AdminScopeType }> = [
	{ label: "Global", value: "global" },
	{ label: "Vertical", value: "vertical" },
	{ label: "Brand", value: "brand" },
	{ label: "Site", value: "site" },
];

type AdminAuditFiltersProps = {
	scopeType: AdminScopeType;
	scopeTargets: Partial<Record<AdminScopeType, string | undefined>>;
	siteId?: string | undefined;
	query?: string | undefined;
	action?: string | undefined;
	resourceType?: string | undefined;
};

export function AdminAuditFilters({
	scopeType,
	scopeTargets,
	siteId,
	query,
	action,
	resourceType,
}: AdminAuditFiltersProps) {
	const router = useRouter();

	function buildPath(nextScopeType: AdminScopeType, nextQuery: string) {
		const trimmedQuery = nextQuery.trim();
		const nextScopeId = scopeTargets[nextScopeType];

		return buildAdminAuditPath({
			scopeType: nextScopeType,
			...(nextScopeId ? { scopeId: nextScopeId } : {}),
			...(siteId ? { siteId } : {}),
			...(trimmedQuery ? { query: trimmedQuery } : {}),
			...(action ? { action } : {}),
			...(resourceType ? { resourceType } : {}),
			limit: 100,
		});
	}

	function clearPath() {
		const nextScopeId = scopeTargets[scopeType];

		return buildAdminAuditPath({
			scopeType,
			...(nextScopeId ? { scopeId: nextScopeId } : {}),
			...(siteId ? { siteId } : {}),
			limit: 100,
		});
	}

	return (
		<section className="rounded-sm border border-[#d9e1dc] bg-white p-4">
			<div className="grid gap-3 lg:grid-cols-[360px_1fr_auto]">
				<label className="grid gap-1">
					<span className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
						Scope
					</span>
					<Segmented<AdminScopeType>
						block
						options={scopeOptions}
						value={scopeType}
						onChange={(nextScopeType) => {
							router.push(buildPath(nextScopeType, query ?? ""));
						}}
					/>
				</label>
				<label className="grid gap-1">
					<span className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
						Search
					</span>
					<Input.Search
						allowClear
						defaultValue={query ?? ""}
						enterButton="Search"
						placeholder="actor, action, resource, request id"
						prefix={<Search size={16} />}
						onSearch={(nextQuery) => {
							router.push(buildPath(scopeType, nextQuery));
						}}
					/>
				</label>
				<Button
					className="mt-auto"
					icon={<X className="size-4" />}
					onClick={() => router.push(clearPath())}
				>
					Clear
				</Button>
			</div>
		</section>
	);
}
