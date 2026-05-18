import Link from "next/link";
import { KeyRound, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { AdminScopeAssignmentPanel } from "@/components/AdminScopeAssignmentPanel";
import {
	adminStatusClassName,
	formatAdminDateTime,
	loadAdminRbacSnapshot,
	scopeLabel,
	shortAdminId,
} from "@/lib/admin-rbac";
import { loadSiteManagementData } from "@/lib/admin-sites";

function StatusBadge({ status }: { status: string }) {
	return (
		<span
			className={`inline-flex h-7 items-center rounded-sm border px-2 text-xs font-bold ${adminStatusClassName(
				status,
			)}`}
		>
			{status}
		</span>
	);
}

function Metric({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: string | number;
}) {
	return (
		<div className="admin-metric-card p-4">
			<div className="flex items-center gap-2 text-[#1d7053]">
				{icon}
				<p className="text-xs font-bold uppercase tracking-[0.14em]">
					{label}
				</p>
			</div>
			<p className="mt-2 text-2xl font-semibold">{value}</p>
		</div>
	);
}

export default async function AdminRbacPage() {
	const [rbac, siteData] = await Promise.all([
		loadAdminRbacSnapshot(),
		loadSiteManagementData(),
	]);

	return (
		<div className="min-h-screen bg-[#f5f7f8] text-[#17221b]">
			<header className="border-b border-[#d9e1dc] bg-white">
				<div className="grid w-full gap-4 px-4 py-5 md:px-6">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<Link
								href="/"
								className="text-xs font-bold uppercase tracking-[0.16em] text-[#1d7053]"
							>
								Commerce OS Admin
							</Link>
							<h1 className="mt-1 text-2xl font-semibold">RBAC Scope</h1>
							<p className="mt-1 max-w-2xl text-sm text-[#65736b]">
								Admin users, roles, permissions and data-scope assignments.
							</p>
						</div>
						<Link
							href="/audit"
							className="inline-flex h-10 items-center justify-center rounded-sm border border-[#d9e1dc] bg-white px-3 text-sm font-bold text-[#425149] hover:border-[#1d7053]"
						>
							Audit Trail
						</Link>
					</div>
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
						<Metric
							icon={<Users className="size-4" />}
							label="Admin Users"
							value={rbac.users.length}
						/>
						<Metric
							icon={<ShieldCheck className="size-4" />}
							label="Scopes"
							value={rbac.scopes.length}
						/>
						<Metric
							icon={<LockKeyhole className="size-4" />}
							label="Roles"
							value={rbac.roles.length}
						/>
						<Metric
							icon={<KeyRound className="size-4" />}
							label="Permissions"
							value={rbac.permissions.length}
						/>
					</div>
				</div>
			</header>

			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<AdminScopeAssignmentPanel
					users={rbac.users}
					sites={siteData.sites}
					verticals={siteData.verticals}
					brands={siteData.brands}
				/>

				<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
					<div className="border-b border-[#d9e1dc] px-4 py-3">
						<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
							Admin Users
						</p>
						<h2 className="mt-1 text-base font-semibold">Data access map</h2>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[1080px] border-collapse text-left text-sm">
							<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
								<tr>
									<th className="px-4 py-3 font-bold">User</th>
									<th className="px-4 py-3 font-bold">Status</th>
									<th className="px-4 py-3 font-bold">Roles</th>
									<th className="px-4 py-3 font-bold">Scopes</th>
									<th className="px-4 py-3 font-bold">Updated</th>
								</tr>
							</thead>
							<tbody>
								{rbac.users.map((user) => (
									<tr key={user.adminUserId} className="border-t border-[#edf1ef]">
										<td className="px-4 py-3">
											<p className="font-semibold">{user.displayName}</p>
											<p className="text-xs text-[#65736b]">{user.email}</p>
											<p className="mt-1 text-xs text-[#65736b]">
												{shortAdminId(user.adminUserId)}
											</p>
										</td>
										<td className="px-4 py-3">
											<StatusBadge status={user.status} />
										</td>
										<td className="px-4 py-3">
											<div className="flex flex-wrap gap-1">
												{user.roles.map((role) => (
													<span
														key={role.roleId}
														className="rounded-sm border border-[#d9e1dc] bg-[#f8faf9] px-2 py-1 text-xs font-semibold"
													>
														{role.code}
													</span>
												))}
												{user.roles.length === 0 ? (
													<span className="text-xs text-[#65736b]">No roles</span>
												) : null}
											</div>
										</td>
										<td className="px-4 py-3">
											<div className="flex flex-wrap gap-1">
												{user.scopes.map((scope) => (
													<span
														key={scope.scopeAssignmentId}
														className="rounded-sm border border-[#bbdfcc] bg-[#eef8f1] px-2 py-1 text-xs font-semibold text-[#1d7053]"
													>
														{scopeLabel(scope)}
													</span>
												))}
												{user.scopes.length === 0 ? (
													<span className="text-xs text-[#a43b24]">No scopes</span>
												) : null}
											</div>
										</td>
										<td className="px-4 py-3 text-[#65736b]">
											{formatAdminDateTime(user.updatedAt)}
										</td>
									</tr>
								))}
								{rbac.users.length === 0 ? (
									<tr>
										<td colSpan={5} className="px-4 py-8 text-center text-[#65736b]">
											No admin users are configured.
										</td>
									</tr>
								) : null}
							</tbody>
						</table>
					</div>
				</section>

				<section className="grid gap-5 xl:grid-cols-2">
					<div className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
						<div className="border-b border-[#d9e1dc] px-4 py-3">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								Roles
							</p>
						</div>
						<div className="divide-y divide-[#edf1ef]">
							{rbac.roles.map((role) => (
								<div key={role.roleId} className="px-4 py-3">
									<p className="font-semibold">{role.name}</p>
									<p className="text-xs text-[#65736b]">
										{role.code} / {role.permissionCount} permissions
									</p>
								</div>
							))}
						</div>
					</div>
					<div className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
						<div className="border-b border-[#d9e1dc] px-4 py-3">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								Permissions
							</p>
						</div>
						<div className="max-h-[360px] overflow-auto divide-y divide-[#edf1ef]">
							{rbac.permissions.map((permission) => (
								<div key={permission.permissionId} className="px-4 py-3">
									<p className="font-semibold">{permission.name}</p>
									<p className="text-xs text-[#65736b]">
										{permission.type} / {permission.resource} /{" "}
										{permission.action}
									</p>
								</div>
							))}
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
