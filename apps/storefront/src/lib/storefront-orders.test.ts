import { describe, expect, it } from "vitest";
import {
	getOrderStatusClassName,
	getOrderStatusLabel,
	getOrderStatusTone,
} from "@/lib/storefront-orders";

describe("storefront order helpers", () => {
	it("keeps status dimensions readable without merging them", () => {
		expect(getOrderStatusLabel("pending_payment")).toBe("Pending payment");
		expect(getOrderStatusLabel("partially_shipped")).toBe(
			"Partially shipped",
		);
		expect(getOrderStatusLabel("chargeback")).toBe("Chargeback");
	});

	it("maps order status tones for list and detail badges", () => {
		expect(getOrderStatusTone("paid")).toBe("success");
		expect(getOrderStatusTone("payment_processing")).toBe("warning");
		expect(getOrderStatusTone("failed")).toBe("danger");
		expect(getOrderStatusTone("none")).toBe("neutral");
		expect(getOrderStatusClassName("paid")).toContain("text-[#1d7053]");
	});
});
