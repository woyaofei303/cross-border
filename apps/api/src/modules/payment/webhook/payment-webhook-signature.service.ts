import { BadRequestException, Injectable } from "@nestjs/common";

export type WebhookSignatureInput = {
	channelCode: string;
	signatureHeader: string | undefined;
	rawPayload: Record<string, unknown>;
};

@Injectable()
export class PaymentWebhookSignatureService {
	assertSignatureCarrier(input: WebhookSignatureInput): void {
		if (input.channelCode === "stripe" && !input.signatureHeader) {
			throw new BadRequestException({
				code: "PAYMENT_WEBHOOK_SIGNATURE_REQUIRED",
				message: "Stripe webhook requires the stripe-signature header.",
			});
		}

		if (Object.keys(input.rawPayload).length === 0) {
			throw new BadRequestException({
				code: "PAYMENT_WEBHOOK_PAYLOAD_REQUIRED",
				message: "Payment webhook payload is required.",
			});
		}
	}
}
