import Link from "next/link";
import { BookOpen, Braces, DatabaseZap, ExternalLink, Network } from "lucide-react";
import {
	apiCatalogEndpoints,
	getOpenApiLinks,
	type ApiCatalogAudience,
} from "@/lib/admin-api-catalog";
import { getRequestAdminLocale } from "@/lib/admin-i18n-server";
import { translateText } from "@/lib/admin-static-localization";

const audienceOrder: ApiCatalogAudience[] = [
	"Storefront",
	"Admin",
	"Webhook",
	"System",
];

function methodClassName(method: string) {
	if (method === "GET") {
		return "border-[#bbdfcc] bg-[#eef8f1] text-[#1d7053]";
	}

	if (method === "POST") {
		return "border-[#c8d7f1] bg-[#eef4ff] text-[#185abc]";
	}

	if (method === "PATCH") {
		return "border-[#e5dac0] bg-[#fff8e6] text-[#8a5a13]";
	}

	return "border-[#e8c8c1] bg-[#fff1ee] text-[#a43b24]";
}

function MethodBadge({ method }: { method: string }) {
	return (
		<span
			className={`inline-flex h-7 min-w-16 items-center justify-center rounded-sm border px-2 text-xs font-bold ${methodClassName(
				method,
			)}`}
		>
			{method}
		</span>
	);
}

export default async function AdminApiCatalogPage() {
	const locale = await getRequestAdminLocale();
	const t = (text: string) => translateText(text, locale);
	const links = getOpenApiLinks();
	const endpointsByAudience = audienceOrder.map((audience) => ({
		audience,
		endpoints: apiCatalogEndpoints.filter(
			(endpoint) => endpoint.audience === audience,
		),
	}));

	return (
		<div className="min-h-screen bg-[#f5f7f8] text-[#17221b]">
			<header className="border-b border-[#d9e1dc] bg-white">
				<div className="grid w-full gap-4 px-4 py-5 md:px-6">
					<div>
						<Link
							href="/"
							className="text-xs font-bold uppercase tracking-[0.16em] text-[#1d7053]"
						>
							{t("Commerce OS Admin")}
						</Link>
						<h1 className="mt-1 text-2xl font-semibold">
							{t("API Catalog")}
						</h1>
						<p className="mt-1 max-w-3xl text-sm text-[#65736b]">
							{t(
								"REST API contract map for separating Storefront, Unified Admin and Commerce Core API data boundaries.",
							)}
						</p>
					</div>
					<div className="grid gap-3 lg:grid-cols-3">
						<div className="admin-metric-card p-4">
							<div className="admin-metric-label">
								<Network className="size-4" />
								<p>{t("API Base URL")}</p>
							</div>
							<p className="mt-3 break-all font-mono text-sm text-[#425149]">
								{links.baseUrl}
							</p>
						</div>
						<div className="admin-metric-card p-4">
							<div className="admin-metric-label">
								<BookOpen className="size-4" />
								<p>{t("OpenAPI Docs")}</p>
							</div>
							{links.docsUrl ? (
								<a
									className="mt-3 inline-flex items-center gap-2 font-semibold text-[#1d7053]"
									href={links.docsUrl}
									rel="noreferrer"
									target="_blank"
								>
									{t("Swagger UI")}
									<ExternalLink className="size-4" />
								</a>
							) : (
								<p className="mt-3 text-sm text-[#65736b]">
									{t("API_BASE_URL is not configured.")}
								</p>
							)}
						</div>
						<div className="admin-metric-card p-4">
							<div className="admin-metric-label">
								<Braces className="size-4" />
								<p>{t("OpenAPI JSON")}</p>
							</div>
							{links.jsonUrl ? (
								<a
									className="mt-3 inline-flex items-center gap-2 font-semibold text-[#1d7053]"
									href={links.jsonUrl}
									rel="noreferrer"
									target="_blank"
								>
									{t("Contract JSON")}
									<ExternalLink className="size-4" />
								</a>
							) : (
								<p className="mt-3 text-sm text-[#65736b]">
									{t("API_BASE_URL is not configured.")}
								</p>
							)}
						</div>
					</div>
				</div>
			</header>

			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<section className="grid gap-3 rounded-sm border border-[#d9e1dc] bg-white p-4">
					<div className="flex items-center gap-2 text-[#1d7053]">
						<DatabaseZap className="size-4" />
						<p className="text-xs font-bold uppercase tracking-[0.14em]">
							{t("Presentation / Data Boundary")}
						</p>
					</div>
					<div className="grid gap-3 text-sm text-[#425149] lg:grid-cols-3">
						<p>
							{t(
								"Storefront reads current-site data through domain-resolved API context. It must not trust client-supplied site_id.",
							)}
						</p>
						<p>
							{t(
								"Unified Admin reads and writes through scoped Admin REST endpoints. Every list/detail query must remain constrained by Admin Scope.",
							)}
						</p>
						<p>
							{t(
								"Next.js route handlers are BFF/proxy adapters for same-origin UI mutations, not the source of commerce business truth.",
							)}
						</p>
					</div>
				</section>

				{endpointsByAudience.map(({ audience, endpoints }) => (
					<section
						key={audience}
						className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white"
					>
						<div className="border-b border-[#d9e1dc] px-4 py-3">
							<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
								{t(`${audience} API`)}
							</p>
							<h2 className="mt-1 text-base font-semibold">
								{t(`${endpoints.length} endpoints`)}
							</h2>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full min-w-[1080px] border-collapse text-left text-sm">
								<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
									<tr>
										<th className="px-4 py-3 font-bold">{t("Method")}</th>
										<th className="px-4 py-3 font-bold">{t("Path")}</th>
										<th className="px-4 py-3 font-bold">{t("Resource")}</th>
										<th className="px-4 py-3 font-bold">{t("Description")}</th>
									</tr>
								</thead>
								<tbody>
									{endpoints.map((endpoint) => (
										<tr
											key={`${endpoint.method}:${endpoint.path}`}
											className="border-t border-[#edf1ef]"
										>
											<td className="px-4 py-3">
												<MethodBadge method={endpoint.method} />
											</td>
											<td className="px-4 py-3 font-mono text-xs">
												{endpoint.path}
											</td>
											<td className="px-4 py-3 font-semibold">
												{t(endpoint.resource)}
											</td>
											<td className="px-4 py-3 text-[#425149]">
												{t(endpoint.description)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>
				))}
			</main>
		</div>
	);
}
