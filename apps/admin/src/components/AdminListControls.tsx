import Link from "next/link";
import { ChevronLeft, ChevronRight, Filter, TableProperties } from "lucide-react";
import { buildAdminListPath } from "@/lib/admin-list-controls";

export { AdminQueryPanel } from "@/components/AdminQueryPanel";
export type { AdminQueryField } from "@/components/AdminQueryPanel";

export function AdminPagination({
	pathname,
	params,
	page,
	pageSize,
	total,
	totalPages,
	start,
	end,
}: {
	pathname: string;
	params: Record<string, string | number | undefined>;
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	start: number;
	end: number;
}) {
	const previousPage = Math.max(1, page - 1);
	const nextPage = Math.min(totalPages, page + 1);
	const pageSizeOptions = [10, 20, 50];

	return (
		<div className="admin-pagination">
			<div className="admin-pagination-summary">
				<Filter className="size-4" />
				<span>
					{total === 0 ? 0 : start + 1}-{end} / {total}
				</span>
			</div>
			<div className="admin-pagination-controls">
				<Link
					aria-disabled={page <= 1}
					className={page <= 1 ? "is-disabled" : undefined}
					href={buildAdminListPath(pathname, params, {
						page: previousPage,
						pageSize,
					})}
				>
					<ChevronLeft className="size-4" />
					Prev
				</Link>
				<span>
					Page {page} / {totalPages}
				</span>
				<Link
					aria-disabled={page >= totalPages}
					className={page >= totalPages ? "is-disabled" : undefined}
					href={buildAdminListPath(pathname, params, {
						page: nextPage,
						pageSize,
					})}
				>
					Next
					<ChevronRight className="size-4" />
				</Link>
				<div className="admin-page-size">
					{pageSizeOptions.map((option) => (
						<Link
							key={option}
							className={option === pageSize ? "is-active" : undefined}
							href={buildAdminListPath(pathname, params, {
								page: 1,
								pageSize: option,
							})}
						>
							{option}
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}

export type AdminResourceTableColumn<T> = {
	key: string;
	header: string;
	className?: string;
	cell: (row: T, index: number) => React.ReactNode;
};

export function AdminResourceTable<T>({
	title,
	subtitle,
	queryPanel,
	columns,
	rows,
	rowKey,
	emptyMessage,
	minWidth = 1040,
	pagination,
}: {
	title: string;
	subtitle?: React.ReactNode;
	queryPanel?: React.ReactNode;
	columns: Array<AdminResourceTableColumn<T>>;
	rows: T[];
	rowKey: (row: T, index: number) => string;
	emptyMessage: string;
	minWidth?: number;
	pagination?: React.ReactNode;
}) {
	return (
		<section className="admin-resource-table-card">
			<div className="admin-resource-table-header">
				<div>
					<p className="admin-resource-table-eyebrow">
						<TableProperties className="size-4" />
						{title}
					</p>
					{subtitle ? (
						<h2 className="mt-1 text-base font-semibold">{subtitle}</h2>
					) : null}
				</div>
			</div>
			{queryPanel}
			<div className="overflow-x-auto">
				<table
					className="w-full border-collapse text-left text-sm"
					style={{ minWidth }}
				>
					<thead className="bg-[#f5f7f8] text-xs uppercase tracking-[0.14em] text-[#65736b]">
						<tr>
							{columns.map((column) => (
								<th
									key={column.key}
									className={`px-4 py-3 font-bold ${column.className ?? ""}`}
								>
									{column.header}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{rows.map((row, index) => (
							<tr key={rowKey(row, index)} className="border-t border-[#edf1ef]">
								{columns.map((column) => (
									<td
										key={column.key}
										className={`px-4 py-3 ${column.className ?? ""}`}
									>
										{column.cell(row, index)}
									</td>
								))}
							</tr>
						))}
						{rows.length === 0 ? (
							<tr>
								<td
									colSpan={columns.length}
									className="px-4 py-10 text-center text-sm text-[#65736b]"
								>
									{emptyMessage}
								</td>
							</tr>
						) : null}
					</tbody>
				</table>
			</div>
			{pagination}
		</section>
	);
}
