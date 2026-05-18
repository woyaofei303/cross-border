export type SearchParamValue = string | string[] | undefined;

export type PaginationResult<T> = {
	rows: T[];
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	start: number;
	end: number;
};

export function firstSearchParam(value: SearchParamValue) {
	return Array.isArray(value) ? value[0] : value;
}

export function normalizeQuery(value: SearchParamValue) {
	return firstSearchParam(value)?.trim() ?? "";
}

export function normalizePage(value: SearchParamValue) {
	const page = Number.parseInt(firstSearchParam(value) ?? "1", 10);

	return Number.isFinite(page) && page > 0 ? page : 1;
}

export function normalizePageSize(value: SearchParamValue, fallback = 10) {
	const pageSize = Number.parseInt(firstSearchParam(value) ?? String(fallback), 10);

	if (!Number.isFinite(pageSize)) {
		return fallback;
	}

	return Math.min(Math.max(pageSize, 5), 50);
}

export function hasTextMatch(values: Array<string | number | undefined>, query: string) {
	const normalizedQuery = query.trim().toLowerCase();

	if (!normalizedQuery) {
		return true;
	}

	return values.some((value) =>
		String(value ?? "")
			.toLowerCase()
			.includes(normalizedQuery),
	);
}

export function isWithinDateRange(
	value: string | undefined,
	dateFrom: string,
	dateTo: string,
) {
	if (!value) {
		return true;
	}

	const time = new Date(value).getTime();

	if (!Number.isFinite(time)) {
		return true;
	}

	if (dateFrom) {
		const fromTime = new Date(`${dateFrom}T00:00:00.000Z`).getTime();

		if (Number.isFinite(fromTime) && time < fromTime) {
			return false;
		}
	}

	if (dateTo) {
		const toTime = new Date(`${dateTo}T23:59:59.999Z`).getTime();

		if (Number.isFinite(toTime) && time > toTime) {
			return false;
		}
	}

	return true;
}

export function paginateRows<T>(
	rows: T[],
	input: {
		page: number;
		pageSize: number;
	},
): PaginationResult<T> {
	const total = rows.length;
	const totalPages = Math.max(1, Math.ceil(total / input.pageSize));
	const page = Math.min(Math.max(input.page, 1), totalPages);
	const start = (page - 1) * input.pageSize;
	const end = Math.min(start + input.pageSize, total);

	return {
		rows: rows.slice(start, end),
		page,
		pageSize: input.pageSize,
		total,
		totalPages,
		start,
		end,
	};
}

export function buildAdminListPath(
	pathname: string,
	params: Record<string, string | number | undefined>,
	overrides: Record<string, string | number | undefined> = {},
) {
	const searchParams = new URLSearchParams();

	for (const [key, value] of Object.entries({ ...params, ...overrides })) {
		if (value === undefined || value === "") {
			continue;
		}

		searchParams.set(key, String(value));
	}

	const query = searchParams.toString();

	return query ? `${pathname}?${query}` : pathname;
}
