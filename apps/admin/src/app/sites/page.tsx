import Link from "next/link";
import {
	Metric,
	PageHeader,
	StatusBadge,
	compactId,
} from "@/components/AdminSiteRegistry";
import {
	getAdminMessage,
	type AdminMessageKey,
} from "@/lib/admin-i18n";
import { getRequestAdminLocale } from "@/lib/admin-i18n-server";
import { countSitesByStatus, loadSiteManagementData } from "@/lib/admin-sites";

type SitesPageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstSearchParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

export default async function AdminSitesPage({ searchParams }: SitesPageProps) {
	const [locale, data, params] = await Promise.all([
		getRequestAdminLocale(),
		loadSiteManagementData(),
		searchParams,
	]);
	const t = (key: AdminMessageKey) => getAdminMessage(locale, key);
	const selectedSiteId = firstSearchParam(params.siteId);

	return (
		<div className="min-h-screen bg-[#f5f7f8] text-[#17221b]">
			<PageHeader
				title={t("nav.sites")}
				description={t("page.sites.description")}
				action={
					<Link
						href="/site-config"
						className="inline-flex h-10 items-center justify-center rounded-sm border border-[#d9e1dc] bg-white px-3 text-sm font-bold text-[#425149] hover:border-[#1d7053]"
					>
						{t("nav.siteConfig")}
					</Link>
				}
			/>
			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<section className="grid gap-3 md:grid-cols-4">
					<Metric label={t("nav.sites")} value={data.sites.length} />
					<Metric
						label={t("label.active")}
						value={countSitesByStatus(data.sites, "active")}
					/>
					<Metric label={t("nav.verticals")} value={data.verticals.length} />
					<Metric label={t("nav.brands")} value={data.brands.length} />
				</section>

				<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
					<div className="overflow-x-auto">
						<table className="w-full min-w-[980px] border-collapse text-left text-sm">
							<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
								<tr>
									<th className="px-4 py-3 font-bold">{t("label.site")}</th>
									<th className="px-4 py-3 font-bold">{t("label.domain")}</th>
									<th className="px-4 py-3 font-bold">{t("label.vertical")}</th>
									<th className="px-4 py-3 font-bold">{t("label.brand")}</th>
									<th className="px-4 py-3 font-bold">{t("label.default")}</th>
									<th className="px-4 py-3 font-bold">{t("label.status")}</th>
								</tr>
							</thead>
							<tbody>
								{data.sites.map((site) => (
									<tr
										key={site.siteId}
										className={`border-t border-[#edf1ef] ${
											site.siteId === selectedSiteId ? "bg-[#f0f8f3]" : "bg-white"
										}`}
									>
										<td className="px-4 py-3">
											<Link
												href={`/sites?siteId=${encodeURIComponent(site.siteId)}`}
												className="font-semibold text-[#1d7053] hover:underline"
											>
												{site.siteName}
											</Link>
											<p className="text-xs text-[#65736b]">
												{site.siteCode} / {compactId(site.siteId)}
											</p>
										</td>
										<td className="px-4 py-3 font-medium">{site.domain}</td>
										<td className="px-4 py-3 text-[#425149]">
											{site.verticalName}
										</td>
										<td className="px-4 py-3 text-[#425149]">
											{site.brandName}
										</td>
										<td className="px-4 py-3 text-[#425149]">
											{site.defaultLanguage} / {site.defaultCurrency}
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
