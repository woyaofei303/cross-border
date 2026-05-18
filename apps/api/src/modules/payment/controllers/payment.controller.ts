import {
	BadRequestException,
	Body,
	Controller,
	Headers,
	HttpCode,
	Param,
	Post,
} from "@nestjs/common";
import {
	ApiBadRequestResponse,
	ApiBody,
	ApiCreatedResponse,
	ApiHeader,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from "@nestjs/swagger";
import {
	createPublicNumber,
	createUuid,
} from "../../../common/ids/public-ids.js";
import {
	CreatePaymentOrderUseCase,
	ReceivePaymentWebhookUseCase,
} from "../payment.use-cases.js";
import { PaymentWebhookSignatureService } from "../webhook/payment-webhook-signature.service.js";
import {
	CreatePaymentOrderRequestDto,
	CreatePaymentOrderResponseDto,
	PaymentWebhookRequestDto,
	ReceivePaymentWebhookResponseDto,
} from "./payment.dto.js";

export type PaymentWebhookRequest = {
	id?: string;
	type?: string;
	providerEventId?: string;
	eventType?: string;
	providerObjectId?: string;
	data?: {
		object?: {
			id?: string;
		};
	};
	[key: string]: unknown;
};

@ApiTags("payments")
@Controller("payments")
export class PaymentController {
	constructor(
		private readonly createPaymentOrderUseCase: CreatePaymentOrderUseCase,
		private readonly receivePaymentWebhookUseCase: ReceivePaymentWebhookUseCase,
		private readonly signatureService: PaymentWebhookSignatureService,
	) {}

	@Post()
	@ApiOperation({
		summary: "Create a payment order",
		description:
			"Creates a channel-specific payment order. Repeated idempotency keys return the existing payment order.",
	})
	@ApiCreatedResponse({ type: CreatePaymentOrderResponseDto })
	@ApiBadRequestResponse({
		description: "Invalid request shape or domain rule violation.",
	})
	async createPaymentOrder(
		@Body() body: CreatePaymentOrderRequestDto,
	): Promise<CreatePaymentOrderResponseDto> {
		const result = await this.createPaymentOrderUseCase.execute({
			paymentOrderId: body.paymentOrderId ?? createUuid(),
			paymentNo: body.paymentNo ?? createPublicNumber("payment"),
			orderId: body.orderId,
			channelCode: body.channelCode,
			amount: body.amount,
			currency: body.currency,
			idempotencyKey: body.idempotencyKey,
		});

		return {
			paymentOrderId: result.paymentOrder.paymentOrderId,
			paymentNo: result.paymentOrder.paymentNo,
			orderId: result.paymentOrder.orderId,
			status: result.paymentOrder.status,
			reusedIdempotency: result.reusedIdempotency,
		};
	}

	@Post("webhooks/:channel")
	@HttpCode(200)
	@ApiOperation({
		summary: "Receive a payment provider webhook",
		description:
			"Verifies the webhook carrier, stores the provider event idempotently, and returns before downstream business processing.",
	})
	@ApiHeader({
		name: "stripe-signature",
		required: false,
		description: "Required when channel is stripe.",
	})
	@ApiBody({
		type: PaymentWebhookRequestDto,
		description:
			"Provider webhook payload. Unknown provider fields are preserved for raw event storage.",
	})
	@ApiOkResponse({ type: ReceivePaymentWebhookResponseDto })
	@ApiBadRequestResponse({
		description: "Missing signature carrier or provider event identity.",
	})
	async receiveWebhook(
		@Param("channel") channelCode: string,
		@Body() body: PaymentWebhookRequest,
		@Headers("stripe-signature") stripeSignature: string | undefined,
	): Promise<ReceivePaymentWebhookResponseDto> {
		this.signatureService.assertSignatureCarrier({
			channelCode,
			signatureHeader: stripeSignature,
			rawPayload: body,
		});

		const providerEventId = body.providerEventId ?? body.id;
		const eventType = body.eventType ?? body.type;
		const providerObjectId = body.providerObjectId ?? body.data?.object?.id;

		if (!providerEventId || !eventType) {
			throw new BadRequestException({
				code: "PAYMENT_WEBHOOK_EVENT_ID_OR_TYPE_REQUIRED",
				message: "Payment webhook provider event id and event type are required.",
			});
		}

		const result = await this.receivePaymentWebhookUseCase.execute({
			channelCode,
			providerEventId,
			eventType,
			...(providerObjectId ? { providerObjectId } : {}),
			...(stripeSignature ? { signatureHeader: stripeSignature } : {}),
			rawPayload: body,
		});

		return {
			webhookEventId: result.webhookEventId,
			inserted: result.inserted,
			accepted: true,
		};
	}
}
