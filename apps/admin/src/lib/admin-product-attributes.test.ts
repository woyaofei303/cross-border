import { describe, expect, it } from "vitest";
import {
	buildAdminProductAttributesPath,
	productAttributeStatusClassName,
	shortId,
} from "@/lib/admin-product-attributes";

describe("admin product attribute helpers", () => {
	it("builds product attribute paths with optional site and vertical filters", () => {
		expect(
			buildAdminProductAttributesPath({
				siteId: "site-1",
				verticalId: "vertical-1",
			}),
		).toBe("/product-attributes?siteId=site-1&verticalId=vertical-1");
		expect(buildAdminProductAttributesPath({ verticalId: "vertical-1" })).toBe(
			"/product-attributes?verticalId=vertical-1",
		);
		expect(buildAdminProductAttributesPath({})).toBe("/product-attributes");
	});

	it("formats product attribute status classes and short ids", () => {
		expect(productAttributeStatusClassName("active")).toContain(
			"text-[#1d7053]",
		);
		expect(productAttributeStatusClassName("inactive")).toContain(
			"text-[#8a5a13]",
		);
		expect(productAttributeStatusClassName("archived")).toContain(
			"text-[#a43b24]",
		);
		expect(shortId("00000000-0000-4000-8000-000000000301")).toBe("00000000");
	});
});
