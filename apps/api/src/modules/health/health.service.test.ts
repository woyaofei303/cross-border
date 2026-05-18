import { describe, expect, it } from "vitest";
import { DatabaseContractService } from "../database/database-contract.service.js";
import { HealthService } from "./health.service.js";

describe("HealthService", () => {
	it("returns API health and shared contract details", () => {
		const service = new HealthService(
			{
				nodeEnv: "test",
				port: 4000,
				databaseUrl: undefined,
				redisUrl: undefined,
				stripeWebhookSecret: undefined,
			},
			new DatabaseContractService(),
		);

		expect(service.getHealth()).toMatchObject({
			status: "ok",
			service: "cross-border-api",
			environment: "test",
			contracts: {
				firstOrderStatus: "pending_payment",
				primaryPaymentEvent: "PaymentSucceeded",
			},
		});
	});
});
