import Link from "next/link";
import type { AdminSite, SiteStatus } from "@/lib/admin-sites";

export function siteStatusClassName(status: SiteStatus | string) {
	if (status === "active") {
		return "border-[#bbdfcc] bg-[#eef8f1] text-[#1d7053]";
	}

	if (status === "inactive") {
		return "border-[#e5dac0] bg-[#fff8e6] text-[#8a5a13]";
	}

	return "border-[#e8c8c1] bg-[#fff1ee] text-[#a43b24]";
}

export function StatusBadge({ status }: { status: SiteStatus | string }) {
	return (
		<span
			className={`inline-flex h-7 items-center rounded-sm border px-2 text-xs font-bold ${siteStatusClassName(
				status,
			)}`}
		>
			{status}
		</span>
	);
}

export function Pill({ children }: { children: React.ReactNode }) {
	return (
		<span className="inline-flex min-h-7 items-center rounded-sm border border-[#d9e1dc] bg-[#f5f7f8] px-2 py-1 text-xs font-semibold text-[#425149]">
			{children}
		</span>
	);
}

export function Metric({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	return (
		<div className="admin-metric-card p-4">
			<p className="admin-metric-label">{label}</p>
			<p className="admin-metric-value">{value}</p>
		</div>
	);
}

export function PageHeader({
	title,
	description,
	action,
}: {
	title: string;
	description: string;
	action?: React.ReactNode;
}) {
	return (
		<header className="border-b border-[#d9e1dc] bg-white">
			<div className="flex w-full flex-col gap-4 px-4 py-5 md:px-6">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<Link
							href="/"
							className="text-xs font-bold uppercase tracking-[0.16em] text-[#1d7053]"
						>
							Commerce OS Admin
						</Link>
						<h1 className="mt-1 text-2xl font-semibold">{title}</h1>
						<p className="mt-1 max-w-2xl text-sm text-[#65736b]">
							{description}
						</p>
					</div>
					{action}
				</div>
			</div>
		</header>
	);
}

export function adminSiteHref(site: AdminSite) {
	return `/sites?siteId=${encodeURIComponent(site.siteId)}`;
}

export function compactId(value: string | undefined) {
	return value ? value.slice(0, 8) : "-";
}
