import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { defaultSiteContext } from "../../../common/site/site-context.js";
import type {
	CreatePaymentOrderUseCase,
	ReceivePaymentWebhookUseCase,
} from "../payment.use-cases.js";
import type {
	CreatePaymentOrderInput,
	ReceivePaymentWebhookInput,
} from "../payment.types.js";
import { PaymentWebhookSignatureService } from "../webhook/payment-webhook-signature.service.js";
import { PaymentController } from "./payment.controller.js";

function createController() {
	const createPaymentOrderExecute = vi.fn(
		async (input: CreatePaymentOrderInput) => ({
			paymentOrder: {
				paymentOrderId: input.paymentOrderId,
				paymentNo: input.paymentNo,
				orderId: input.orderId,
				siteId: defaultSiteContext.siteId,
				verticalId: defaultSiteContext.verticalId,
				brandId: defaultSiteContext.brandId,
				channelCode: input.channelCode,
				status: "created",
				amount: input.amount,
				currency: input.currency,
				idempotencyKey: input.idempotencyKey,
			},
			reusedIdempotency: false,
		}),
	);
	const receiveWebhookExecute = vi.fn(
		async (_input: ReceivePaymentWebhookInput) => ({
			webhookEventId: "webhook-1",
			inserted: true,
		}),
	);
	const controller = new PaymentController(
		{ execute: createPaymentOrderExecute } as unknown as CreatePaymentOrderUseCase,
		{ execute: receiveWebhookExecute } as unknown as ReceivePaymentWebhookUseCase,
		new PaymentWebhookSignatureService(),
	);

	return {
		controller,
		createPaymentOrderExecute,
		receiveWebhookExecute,
	};
}

describe("PaymentController", () => {
	it("maps payment order requests to the use case and generates payment identity", async () => {
		const { controller, createPaymentOrderExecute } = createController();

		const response = await controller.createPaymentOrder({
			orderId: "order-1",
			channelCode: "stripe",
			amount: "100.00",
			currency: "USD",
			idempotencyKey: "pay-order-1",
		});
		const input = createPaymentOrderExecute.mock.calls[0]?.[0];

		expect(input).toBeDefined();
		if (!input) {
			throw new Error("Create payment order use case was not called.");
		}

		expect(input.paymentOrderId).toBeTypeOf("string");
		expect(input.paymentNo).toMatch(/^PAY\d{8}[A-F0-9]{10}$/);
		expect(response).toMatchObject({
			paymentOrderId: input.paymentOrderId,
			paymentNo: input.paymentNo,
			status: "created",
			reusedIdempotency: false,
		});
	});

	it("receives Stripe webhooks by extracting event ids and object ids without processing business state", async () => {
		const { controller, receiveWebhookExecute } = createController();

		const response = await controller.receiveWebhook(
			"stripe",
			{
				id: "evt_1",
				type: "payment_intent.succeeded",
				data: {
					object: {
						id: "pi_1",
					},
				},
			},
			"t=1,v1=sig",
		);

		expect(receiveWebhookExecute).toHaveBeenCalledWith({
			channelCode: "stripe",
			providerEventId: "evt_1",
			eventType: "payment_intent.succeeded",
			providerObjectId: "pi_1",
			signatureHeader: "t=1,v1=sig",
			rawPayload: {
				id: "evt_1",
				type: "payment_intent.succeeded",
				data: {
					object: {
						id: "pi_1",
					},
				},
			},
		});
		expect(response).toEqual({
			webhookEventId: "webhook-1",
			inserted: true,
			accepted: true,
		});
	});

	it("rejects Stripe webhooks without a signature header", async () => {
		const { controller } = createController();

		await expect(
			controller.receiveWebhook(
				"stripe",
				{
					id: "evt_1",
					type: "payment_intent.succeeded",
				},
				undefined,
			),
		).rejects.toBeInstanceOf(BadRequestException);
	});
});
