import { describe, expect, it, vi } from "vitest";
import {
	emptyAccountAddress,
	readStoredAccountAddress,
	writeStoredSiteCustomer,
	type SiteCustomerProfile,
} from "@/lib/storefront-account";

function createStorage() {
	const data = new Map<string, string>();

	return {
		getItem: vi.fn((key: string) => data.get(key) ?? null),
		setItem: vi.fn((key: string, value: string) => {
			data.set(key, value);
		}),
		removeItem: vi.fn((key: string) => {
			data.delete(key);
		}),
		clear: vi.fn(() => data.clear()),
		key: vi.fn(),
		length: 0,
	} satisfies Storage;
}

describe("storefront account helpers", () => {
	it("falls back to an empty account address when storage is invalid", () => {
		const storage = createStorage();
		storage.setItem("cross-border-store:account-lite-address", "{");
		vi.stubGlobal("window", { localStorage: storage });

		expect(readStoredAccountAddress()).toEqual(emptyAccountAddress);

		vi.unstubAllGlobals();
	});

	it("stores site customer identity for checkout reuse", () => {
		const storage = createStorage();
		vi.stubGlobal("window", { localStorage: storage });
		const profile: SiteCustomerProfile = {
			globalUser: {
				userId: "user-1",
				email: "buyer@example.com",
				status: "active",
				userType: "registered",
				riskLevel: "normal",
				createdAt: "2026-05-16T00:00:00.000Z",
				updatedAt: "2026-05-16T00:00:00.000Z",
			},
			siteCustomer: {
				siteCustomerId: "customer-1",
				globalUserId: "user-1",
				siteId: "site-1",
				verticalId: "vertical-1",
				brandId: "brand-1",
				email: "buyer@example.com",
				membershipLevel: "standard",
				points: 0,
				status: "active",
				createdAt: "2026-05-16T00:00:00.000Z",
				updatedAt: "2026-05-16T00:00:00.000Z",
			},
			addresses: [],
		};

		const stored = writeStoredSiteCustomer(profile);

		expect(stored).toMatchObject({
			siteCustomerId: "customer-1",
			globalUserId: "user-1",
			email: "buyer@example.com",
		});

		vi.unstubAllGlobals();
	});
});
