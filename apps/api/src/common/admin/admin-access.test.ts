import { describe, expect, it } from "vitest";
import { canAccessSiteDimensions } from "./admin-access.js";

const dimensions = {
	siteId: "00000000-0000-4000-8000-000000000301",
	verticalId: "00000000-0000-4000-8000-000000000101",
	brandId: "00000000-0000-4000-8000-000000000201",
};

describe("admin data scope helpers", () => {
	it("allows global admins to access all site dimensions", () => {
		expect(
			canAccessSiteDimensions([{ scopeType: "global" }], dimensions),
		).toBe(true);
	});

	it("matches site, vertical and brand scopes against site dimensions", () => {
		expect(
			canAccessSiteDimensions(
				[{ scopeType: "site", scopeId: dimensions.siteId }],
				dimensions,
			),
		).toBe(true);
		expect(
			canAccessSiteDimensions(
				[{ scopeType: "vertical", scopeId: dimensions.verticalId }],
				dimensions,
			),
		).toBe(true);
		expect(
			canAccessSiteDimensions(
				[{ scopeType: "brand", scopeId: dimensions.brandId }],
				dimensions,
			),
		).toBe(true);
	});

	it("rejects admins with no matching scope", () => {
		expect(
			canAccessSiteDimensions(
				[
					{
						scopeType: "site",
						scopeId: "00000000-0000-4000-8000-000000000999",
					},
				],
				dimensions,
			),
		).toBe(false);
	});
});
