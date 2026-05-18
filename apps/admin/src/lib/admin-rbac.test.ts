import { describe, expect, it } from "vitest";
import {
	adminStatusClassName,
	formatAdminDateTime,
	scopeLabel,
	shortAdminId,
} from "./admin-rbac";

describe("admin RBAC helpers", () => {
	it("formats scopes, statuses and compact ids", () => {
		expect(scopeLabel({ scopeType: "global" })).toBe("global");
		expect(scopeLabel({ scopeType: "site", scopeId: "00000000-site" })).toBe(
			"site:00000000",
		);
		expect(adminStatusClassName("active")).toContain("text-[#1d7053]");
		expect(adminStatusClassName("disabled")).toContain("text-[#8a5a13]");
		expect(shortAdminId("00000000-0000-4000-8000-000000000301")).toBe(
			"00000000",
		);
		expect(formatAdminDateTime("2026-05-17T00:00:00.000Z")).toBe(
			"2026-05-17 00:00",
		);
	});
});
