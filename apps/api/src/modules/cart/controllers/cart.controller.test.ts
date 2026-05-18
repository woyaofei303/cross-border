import { NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
	defaultSiteContext,
	type SiteContext,
} from "../../../common/site/site-context.js";
import type { CartService } from "../cart.service.js";
import { CartController } from "./cart.controller.js";

describe("CartController", () => {
	it("uses the resolved site context for cart reads", async () => {
		const controller = new CartController({
			getCart: async (site: SiteContext) => ({
				siteId: site.siteId,
				verticalId: site.verticalId,
				brandId: site.brandId,
				siteCode: site.siteCode,
				currency: site.defaultCurrency,
				status: "active",
				items: [],
				quantity: 0,
				subtotalAmount: "0.00",
				totalAmount: "0.00",
			}),
		} as unknown as CartService);

		await expect(
			controller.getCart(
				{
					headers: {},
					siteResolution: {
						status: "resolved",
						domain: "localhost",
						resolvedFrom: "default",
						site: defaultSiteContext,
					},
				},
				{ guestToken: "guest-1" },
			),
		).resolves.toMatchObject({
			siteId: defaultSiteContext.siteId,
			siteCode: "default-site",
		});
	});

	it("rejects cart operations when the request domain is unresolved", async () => {
		const controller = new CartController({
			getCart: async () => {
				throw new Error("Should not load cart for unresolved sites.");
			},
		} as unknown as CartService);

		await expect(
			controller.getCart(
				{
					headers: {},
					siteResolution: {
						status: "unresolved",
						domain: "unknown.example.com",
						reason: "domain_not_found",
					},
				},
				{ guestToken: "guest-1" },
			),
		).rejects.toBeInstanceOf(NotFoundException);
	});
});
