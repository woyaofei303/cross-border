import { describe, expect, it } from "vitest";
import { DomainRuleViolationError } from "../../common/domain/domain-errors.js";
import { defaultSiteContext } from "../../common/site/site-context.js";
import { PaymentWorkflowService } from "./payment.service.js";

describe("PaymentWorkflowService", () => {
	const service = new PaymentWorkflowService();

	it("requires idempotency when creating payment orders", () => {
		expect(() =>
			service.planCreatePaymentOrder({
				orderId: "order-1",
				paymentOrderId: "pay-1",
				paymentNo: "PAY202605160001",
				channelCode: "stripe",
				amount: "100.00",
				currency: "USD",
				idempotencyKey: "",
			}),
		).toThrow(DomainRuleViolationError);
	});

	it("plans webhook receipt with the provider event dedupe key", () => {
		const plan = service.planReceiveWebhook({
			channelCode: "stripe",
			providerEventId: "evt_1",
			eventType: "payment_intent.succeeded",
			providerObjectId: "pi_1",
			signatureHeader: "t=1,v1=sig",
			rawPayload: { id: "evt_1" },
		});

		expect(plan.status).toBe("received");
		expect(plan.dedupeKey).toEqual({
			channelCode: "stripe",
			providerEventId: "evt_1",
		});
	});

	it("rejects unsupported webhook event types", () => {
		expect(() =>
			service.planReceiveWebhook({
				channelCode: "stripe",
				providerEventId: "evt_1",
				eventType: "customer.created",
				rawPayload: { id: "evt_1" },
			}),
		).toThrow(DomainRuleViolationError);
	});

	it("plans successful webhook processing through PaymentSucceeded event", () => {
		const plan = service.planProcessWebhook({
			paymentOrderId: "pay-1",
			orderId: "order-1",
			currentPaymentOrderStatus: "processing",
			channelCode: "stripe",
			providerEventId: "evt_1",
			providerTransactionId: "pi_1",
			eventType: "payment_intent.succeeded",
			amount: "100.00",
			currency: "USD",
			expectedAmount: "100.00",
			expectedCurrency: "USD",
			rawPayload: { id: "evt_1" },
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
		});

		expect(plan.nextPaymentOrderStatus).toBe("succeeded");
		expect(plan.transaction.status).toBe("succeeded");
		expect(plan.transaction).toMatchObject({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
		});
		expect(plan.events[0]?.eventType).toBe("PaymentSucceeded");
		expect(plan.events[0]).toMatchObject({
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
		});
	});

	it("allows a provider success webhook to settle a newly created payment order", () => {
		const plan = service.planProcessWebhook({
			paymentOrderId: "pay-1",
			orderId: "order-1",
			currentPaymentOrderStatus: "created",
			channelCode: "stripe",
			providerEventId: "evt_1",
			providerTransactionId: "pi_1",
			eventType: "payment_intent.succeeded",
			amount: "100.00",
			currency: "USD",
			expectedAmount: "100.00",
			expectedCurrency: "USD",
			rawPayload: { id: "evt_1" },
			siteId: defaultSiteContext.siteId,
			verticalId: defaultSiteContext.verticalId,
			brandId: defaultSiteContext.brandId,
		});

		expect(plan.nextPaymentOrderStatus).toBe("succeeded");
		expect(plan.events[0]?.eventType).toBe("PaymentSucceeded");
	});

	it("rejects webhook amount mismatches before emitting payment events", () => {
		expect(() =>
			service.planProcessWebhook({
				paymentOrderId: "pay-1",
				orderId: "order-1",
				currentPaymentOrderStatus: "processing",
				channelCode: "stripe",
				providerEventId: "evt_1",
				providerTransactionId: "pi_1",
				eventType: "payment_intent.succeeded",
				amount: "90.00",
				currency: "USD",
				expectedAmount: "100.00",
				expectedCurrency: "USD",
				rawPayload: { id: "evt_1" },
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
			}),
		).toThrow(DomainRuleViolationError);
	});

	it("classifies terminal provider events for duplicate webhook handling", () => {
		expect(service.getWebhookOutcome("payment_intent.succeeded")).toBe(
			"succeeded",
		);
		expect(service.getWebhookOutcome("payment_intent.payment_failed")).toBe(
			"failed",
		);
		expect(() => service.getWebhookOutcome("customer.created")).toThrow(
			DomainRuleViolationError,
		);
	});
});
