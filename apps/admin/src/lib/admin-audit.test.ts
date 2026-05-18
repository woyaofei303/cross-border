import { describe, expect, it } from "vitest";
import {
	buildAdminAuditPath,
	formatAuditDateTime,
	shortAuditId,
} from "./admin-audit";

describe("admin audit helpers", () => {
	it("builds scoped audit paths and formats values", () => {
		expect(
			buildAdminAuditPath({
				scopeType: "site",
				scopeId: "site-1",
				siteId: "site-1",
				query: "product",
				limit: 100,
			}),
		).toBe(
			"/audit?scopeType=site&scopeId=site-1&siteId=site-1&query=product&limit=100",
		);
		expect(shortAuditId("00000000-0000-4000-8000-000000000301")).toBe(
			"00000000",
		);
		expect(formatAuditDateTime("2026-05-17T00:00:00.000Z")).toBe(
			"2026-05-17 00:00",
		);
	});
});
