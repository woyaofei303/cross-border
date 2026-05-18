import Link from "next/link";

export type AdminHeaderSwitchOption = {
	key: string;
	label: string;
	href: string;
	active: boolean;
};

export type AdminHeaderSwitchGroup = {
	label: string;
	options: AdminHeaderSwitchOption[];
};

export function AdminHeaderSwitchPanel({
	groups,
	className = "",
}: {
	groups: AdminHeaderSwitchGroup[];
	className?: string;
}) {
	return (
		<div className={`admin-filter-panel admin-header-scope-panel ${className}`}>
			{groups.map((group) => (
				<div key={group.label} className="grid gap-1 text-sm">
					<span className="admin-filter-label">{group.label}</span>
					<div className="admin-pill-switch">
						{group.options.map((option) => (
							<Link
								key={option.key}
								className={option.active ? "is-active" : undefined}
								href={option.href}
							>
								{option.label}
							</Link>
						))}
					</div>
				</div>
			))}
		</div>
	);
}
