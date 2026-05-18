import Link from "next/link";
import {
	Metric,
	PageHeader,
	StatusBadge,
} from "@/components/AdminSiteRegistry";
import {
	getAdminMessage,
	type AdminMessageKey,
} from "@/lib/admin-i18n";
import { getRequestAdminLocale } from "@/lib/admin-i18n-server";
import { loadSiteManagementData } from "@/lib/admin-sites";

function formatDateTime(value: string | undefined) {
	return value ? value.slice(0, 16).replace("T", " ") : "-";
}

export default async function AdminFulfillmentPage() {
	const [locale, data] = await Promise.all([
		getRequestAdminLocale(),
		loadSiteManagementData(),
	]);
	const t = (key: AdminMessageKey) => getAdminMessage(locale, key);
	const orders = data.operations.orders;
	const readyToShip = orders.filter(
		(order) =>
			order.paymentStatus === "paid" &&
			["unfulfilled", "pending"].includes(order.fulfillmentStatus),
	);
	const shipped = orders.filter((order) =>
		["shipped", "partially_shipped"].includes(order.fulfillmentStatus),
	);
	const delivered = orders.filter(
		(order) => order.fulfillmentStatus === "delivered",
	);

	return (
		<div className="min-h-screen bg-[#f5f7f8] text-[#17221b]">
			<PageHeader
				title={t("nav.fulfillment")}
				description={t("page.fulfillment.description")}
				action={
					<Link
						href="/orders"
						className="inline-flex h-10 items-center justify-center rounded-sm border border-[#d9e1dc] bg-white px-3 text-sm font-bold text-[#425149] hover:border-[#1d7053]"
					>
						{t("nav.orders")}
					</Link>
				}
			/>
			<main className="grid w-full gap-5 px-4 py-5 md:px-6">
				<section className="grid gap-3 md:grid-cols-4">
					<Metric label={t("label.orders")} value={orders.length} />
					<Metric label={t("label.ready")} value={readyToShip.length} />
					<Metric label={t("label.shipped")} value={shipped.length} />
					<Metric label={t("label.delivered")} value={delivered.length} />
				</section>

				<section className="overflow-hidden rounded-sm border border-[#d9e1dc] bg-white">
					<div className="border-b border-[#d9e1dc] px-4 py-3">
						<p className="text-xs font-bold uppercase tracking-[0.14em] text-[#65736b]">
							{t("nav.fulfillment")}
						</p>
						<h2 className="mt-1 text-base font-semibold">Scoped queue</h2>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[960px] border-collapse text-left text-sm">
							<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
								<tr>
									<th className="px-4 py-3 font-bold">{t("nav.orders")}</th>
									<th className="px-4 py-3 font-bold">{t("label.site")}</th>
									<th className="px-4 py-3 font-bold">{t("label.paymentStatus")}</th>
									<th className="px-4 py-3 font-bold">
										{t("label.fulfillmentStatus")}
									</th>
									<th className="px-4 py-3 font-bold">{t("label.updated")}</th>
								</tr>
							</thead>
							<tbody>
								{orders.map((order) => (
									<tr key={order.id} className="border-t border-[#edf1ef]">
										<td className="px-4 py-3">
											<Link
												href={`/orders/${order.id}`}
												className="font-semibold text-[#1d7053] hover:underline"
											>
												{order.orderNo}
											</Link>
											<p className="text-xs text-[#65736b]">
												{order.itemCount} items / {order.currency}{" "}
												{order.totalAmount}
											</p>
										</td>
										<td className="px-4 py-3 text-[#425149]">
											{order.siteId?.slice(0, 8) ?? "-"}
										</td>
										<td className="px-4 py-3">
											<StatusBadge status={order.paymentStatus} />
										</td>
										<td className="px-4 py-3">
											<StatusBadge status={order.fulfillmentStatus} />
										</td>
										<td className="px-4 py-3 text-[#65736b]">
											{formatDateTime(order.updatedAt)}
										</td>
									</tr>
								))}
								{orders.length === 0 ? (
									<tr>
										<td
											colSpan={5}
											className="px-4 py-8 text-center text-[#65736b]"
										>
											No fulfillment rows are available for this scope.
										</td>
									</tr>
								) : null}
							</tbody>
						</table>
					</div>
				</section>
			</main>
		</div>
	);
}
