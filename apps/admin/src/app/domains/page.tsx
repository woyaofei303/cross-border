import Link from "next/link";
import {
	Metric,
	PageHeader,
	Pill,
	StatusBadge,
} from "@/components/AdminSiteRegistry";
import {
	getAdminMessage,
	type AdminMessageKey,
} from "@/lib/admin-i18n";
import { getRequestAdminLocale } from "@/lib/admin-i18n-server";
import { loadSiteManagementData } from "@/lib/admin-sites";

export default async function AdminDomainsPage() {
	const [locale, data] = await Promise.all([
		getRequestAdminLocale(),
		loadSiteManagementData(),
	]);
	const t = (key: AdminMessageKey) => getAdminMessage(locale, key);
	const primaryDomains = data.sites.filter(
		(site) => site.domain === site.defaultDomain,
	);

	return (
		<div className="min-h-screen bg-[#f5f7f8] text-[#17221b]">
			<PageHeader
				title={t("nav.domains")}
				description={t("page.domains.description")}
				action={
					<Link
						href="/sites"
						className="inline-flex h-10 items-center justify-center rounded-sm border border-[#d9e1dc] bg-white px-3 text-sm font-bold text-[#425149] hover:border-[#1d7053]"
					>
						{t("nav.sites")}
					</Link>
				}
			/>
			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<section className="grid gap-3 md:grid-cols-3">
					<Metric label={t("nav.domains")} value={data.sites.length} />
					<Metric label={t("label.primary")} value={primaryDomains.length} />
					<Metric label={t("nav.sites")} value={data.sites.length} />
				</section>

				<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
					<div className="overflow-x-auto">
						<table className="w-full min-w-[920px] border-collapse text-left text-sm">
							<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
								<tr>
									<th className="px-4 py-3 font-bold">{t("label.domain")}</th>
									<th className="px-4 py-3 font-bold">{t("label.site")}</th>
									<th className="px-4 py-3 font-bold">{t("label.default")}</th>
									<th className="px-4 py-3 font-bold">{t("label.primary")}</th>
									<th className="px-4 py-3 font-bold">{t("label.status")}</th>
								</tr>
							</thead>
							<tbody>
								{data.sites.map((site) => (
									<tr key={site.siteId} className="border-t border-[#edf1ef]">
										<td className="px-4 py-3 font-semibold">{site.domain}</td>
										<td className="px-4 py-3">
											<Link
												href={`/sites?siteId=${encodeURIComponent(site.siteId)}`}
												className="font-medium text-[#1d7053] hover:underline"
											>
												{site.siteName}
											</Link>
											<p className="text-xs text-[#65736b]">{site.siteCode}</p>
										</td>
										<td className="px-4 py-3 text-[#425149]">
											{site.defaultDomain}
										</td>
										<td className="px-4 py-3">
											<Pill>
												{site.domain === site.defaultDomain ? "primary" : "alias"}
											</Pill>
										</td>
										<td className="px-4 py-3">
											<StatusBadge status={site.status} />
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			</main>
		</div>
	);
}
