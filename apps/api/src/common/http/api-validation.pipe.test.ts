import "reflect-metadata";
import { BadRequestException, type ArgumentMetadata } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { CreateOrderRequestDto } from "../../modules/order/controllers/order.dto.js";
import { CreatePaymentOrderRequestDto } from "../../modules/payment/controllers/payment.dto.js";
import { createApiValidationPipe } from "./api-validation.pipe.js";

const orderMetadata: ArgumentMetadata = {
	type: "body",
	metatype: CreateOrderRequestDto,
	data: "",
};
const paymentMetadata: ArgumentMetadata = {
	type: "body",
	metatype: CreatePaymentOrderRequestDto,
	data: "",
};

const validOrderRequest = {
	guestToken: "guest-token-1",
	idempotencyKey: "create-order-1",
	currency: "USD",
	subtotalAmount: "100.00",
	discountAmount: "0.00",
	shippingAmount: "0.00",
	taxAmount: "0.00",
	totalAmount: "100.00",
	items: [
		{
			productId: "9d09e2e5-7790-44a6-96a1-a58fb4eecf2e",
			skuId: "49b5a765-b95d-4da7-9431-8cb15108152a",
			skuCode: "SKU-1",
			productTitle: "Product",
			unitPrice: "100.00",
			quantity: 1,
			discountAmount: "0.00",
			totalAmount: "100.00",
			warehouseId: "528f1ddc-25b5-4613-8596-a3361f61d43c",
		},
	],
};

describe("createApiValidationPipe", () => {
	it("transforms valid nested order payloads into DTO instances", async () => {
		const pipe = createApiValidationPipe();

		const result = await pipe.transform(validOrderRequest, orderMetadata);

		expect(result).toBeInstanceOf(CreateOrderRequestDto);
		expect(result.items[0]).toBeDefined();
		expect(result.items[0]).toMatchObject({
			skuCode: "SKU-1",
			quantity: 1,
		});
	});

	it("rejects unknown request fields", async () => {
		const pipe = createApiValidationPipe();

		await expect(
			pipe.transform(
				{
					...validOrderRequest,
					unsafeField: "should-not-pass",
				},
				orderMetadata,
			),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it("rejects invalid money, currency, and UUID values", async () => {
		const pipe = createApiValidationPipe();

		await expect(
			pipe.transform(
				{
					orderId: "not-a-uuid",
					orderIdempotencyKey: "bad",
					...validOrderRequest,
					currency: "usd",
					totalAmount: "-1.00",
				},
				orderMetadata,
			),
		).rejects.toBeInstanceOf(BadRequestException);
	});

	it("rejects invalid payment order payloads", async () => {
		const pipe = createApiValidationPipe();

		await expect(
			pipe.transform(
				{
					orderId: "order-1",
					channelCode: "Stripe!",
					amount: "100.000",
					currency: "USD",
					idempotencyKey: "pay-1",
				},
				paymentMetadata,
			),
		).rejects.toBeInstanceOf(BadRequestException);
	});
});
