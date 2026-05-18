import {
	getOrderStatusClassName,
	getOrderStatusLabel,
} from "@/lib/storefront-orders";

type OrderStatusBadgeProps = {
	label: string;
	status: string;
};

export function OrderStatusBadge({ label, status }: OrderStatusBadgeProps) {
	return (
		<div className="rounded-sm border border-[#ede7dc] bg-[#fbfaf7] p-3">
			<p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65736b]">
				{label}
			</p>
			<span
				className={`mt-2 inline-flex min-h-8 items-center rounded-sm border px-2 text-xs font-bold ${getOrderStatusClassName(
					status,
				)}`}
			>
				{getOrderStatusLabel(status)}
			</span>
		</div>
	);
}
