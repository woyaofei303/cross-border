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

function ValueList({ values, empty = "-" }: { values: string[]; empty?: string }) {
	if (values.length === 0) {
		return <span className="text-sm text-[#65736b]">{empty}</span>;
	}

	return (
		<div className="flex flex-wrap gap-2">
			{values.map((value) => (
				<Pill key={value}>{value}</Pill>
			))}
		</div>
	);
}

export default async function AdminSiteConfigPage() {
	const [locale, data] = await Promise.all([
		getRequestAdminLocale(),
		loadSiteManagementData(),
	]);
	const t = (key: AdminMessageKey) => getAdminMessage(locale, key);

	return (
		<div className="min-h-screen bg-[#f5f7f8] text-[#17221b]">
			<PageHeader
				title={t("nav.siteConfig")}
				description={t("page.siteConfig.description")}
				action={
					<Link
						href="/domains"
						className="inline-flex h-10 items-center justify-center rounded-sm border border-[#d9e1dc] bg-white px-3 text-sm font-bold text-[#425149] hover:border-[#1d7053]"
					>
						{t("nav.domains")}
					</Link>
				}
			/>
			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<section className="grid gap-3 md:grid-cols-3">
					<Metric label={t("nav.siteConfig")} value={data.sites.length} />
					<Metric label={t("label.languages")} value="multi" />
					<Metric label={t("label.currencies")} value="multi" />
				</section>

				<section className="grid gap-5 xl:grid-cols-2">
					{data.sites.map((site) => (
						<article
							key={site.siteId}
							className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white"
						>
							<div className="flex items-start justify-between gap-3 border-b border-[#d9e1dc] px-4 py-3">
								<div>
									<h2 className="text-base font-semibold">{site.siteName}</h2>
									<p className="mt-1 text-sm text-[#65736b]">
										{site.domain} / {site.siteCode}
									</p>
								</div>
								<StatusBadge status={site.status} />
							</div>
							<div className="grid gap-4 p-4 text-sm">
								<div className="grid gap-3 sm:grid-cols-2">
									<div>
										<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
											{t("label.theme")}
										</p>
										<div className="mt-2 flex flex-wrap gap-2">
											<Pill>{site.config.theme}</Pill>
											<Pill>{site.config.primaryColor ?? "no primary color"}</Pill>
										</div>
									</div>
									<div>
										<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
											{t("label.default")}
										</p>
										<p className="mt-2 font-semibold">
											{site.defaultLanguage} / {site.defaultCurrency}
										</p>
									</div>
								</div>
								<div>
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										{t("label.languages")}
									</p>
									<div className="mt-2">
										<ValueList values={site.config.enabledLanguages} />
									</div>
								</div>
								<div>
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										{t("label.currencies")}
									</p>
									<div className="mt-2">
										<ValueList values={site.config.enabledCurrencies} />
									</div>
								</div>
								<div className="grid gap-3 sm:grid-cols-2">
									<div>
										<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
											{t("label.paymentChannels")}
										</p>
										<div className="mt-2">
											<ValueList values={site.config.paymentChannels} />
										</div>
									</div>
									<div>
										<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
											{t("label.shippingCountries")}
										</p>
										<div className="mt-2">
											<ValueList values={site.config.shippingCountries} />
										</div>
									</div>
								</div>
								<div>
									<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
										{t("label.seo")}
									</p>
									<p className="mt-2 font-semibold">
										{site.config.seoTitle ?? site.siteName}
									</p>
									<p className="mt-1 text-[#65736b]">
										{site.config.seoDescription ?? "-"}
									</p>
								</div>
							</div>
						</article>
					))}
				</section>
			</main>
		</div>
	);
}
