import { NextResponse } from "next/server";
import {
	getRequestSiteDomain,
	getStorefrontApiBaseUrl,
} from "@/lib/server-api-proxy";

type DemoWebhookRequest = {
	paymentOrderId?: string;
	eventSeed?: string;
};

export async function POST(request: Request) {
	const apiBaseUrl = getStorefrontApiBaseUrl();

	if (!apiBaseUrl) {
		return NextResponse.json(
			{
				code: "STOREFRONT_API_UNAVAILABLE",
				message: "API_BASE_URL is required for checkout operations.",
			},
			{ status: 503 },
		);
	}

	const body = (await request.json().catch(() => ({}))) as DemoWebhookRequest;

	if (!body.paymentOrderId) {
		return NextResponse.json(
			{
				code: "PAYMENT_ORDER_ID_REQUIRED",
				message: "Demo payment webhook requires paymentOrderId.",
			},
			{ status: 400 },
		);
	}

	const eventSeed = body.eventSeed ?? body.paymentOrderId;
	const payload = {
		providerEventId: `evt_demo_${eventSeed}`,
		eventType: "payment_intent.succeeded",
		providerObjectId: body.paymentOrderId,
		data: {
			object: {
				id: body.paymentOrderId,
			},
		},
	};
	const response = await fetch(new URL("/api/payments/webhooks/stripe", apiBaseUrl), {
		method: "POST",
		cache: "no-store",
		headers: {
			"content-type": "application/json",
			"stripe-signature": "demo-signature",
			"x-site-domain": getRequestSiteDomain(request),
		},
		body: JSON.stringify(payload),
	});
	const result = await response.json().catch(() => ({}));

	return NextResponse.json(result, { status: response.status });
}
