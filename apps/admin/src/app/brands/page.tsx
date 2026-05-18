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
import { loadSiteManagementData } from "@/lib/admin-sites";

export default async function AdminBrandsPage() {
	const [locale, data] = await Promise.all([
		getRequestAdminLocale(),
		loadSiteManagementData(),
	]);
	const t = (key: AdminMessageKey) => getAdminMessage(locale, key);
	const activeBrands = data.brands.filter((brand) => brand.status === "active");

	return (
		<div className="min-h-screen bg-[#f5f7f8] text-[#17221b]">
			<PageHeader
				title={t("nav.brands")}
				description={t("page.brands.description")}
			/>
			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<section className="grid gap-3 md:grid-cols-3">
					<Metric label={t("nav.brands")} value={data.brands.length} />
					<Metric label={t("label.active")} value={activeBrands.length} />
					<Metric label={t("nav.sites")} value={data.sites.length} />
				</section>

				<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
					<div className="overflow-x-auto">
						<table className="w-full min-w-[780px] border-collapse text-left text-sm">
							<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
								<tr>
									<th className="px-4 py-3 font-bold">{t("label.brand")}</th>
									<th className="px-4 py-3 font-bold">{t("label.code")}</th>
									<th className="px-4 py-3 font-bold">{t("nav.sites")}</th>
									<th className="px-4 py-3 font-bold">{t("label.logo")}</th>
									<th className="px-4 py-3 font-bold">{t("label.status")}</th>
								</tr>
							</thead>
							<tbody>
								{data.brands.map((brand) => {
									const siteCount = data.sites.filter(
										(site) => site.brandId === brand.id,
									).length;

									return (
										<tr key={brand.id} className="border-t border-[#edf1ef]">
											<td className="px-4 py-3">
												<p className="font-semibold">{brand.name}</p>
												<p className="text-xs text-[#65736b]">
													{compactId(brand.id)}
												</p>
											</td>
											<td className="px-4 py-3 font-medium">{brand.code}</td>
											<td className="px-4 py-3">{siteCount}</td>
											<td className="px-4 py-3 text-[#425149]">
												{brand.logoUrl ?? "-"}
											</td>
											<td className="px-4 py-3">
												<StatusBadge status={brand.status} />
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</section>
			</main>
		</div>
	);
}
