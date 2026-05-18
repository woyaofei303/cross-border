import { assertDomainRule } from "../domain/domain-errors.js";

const maxIdempotencyKeyLength = 128;

export function assertIdempotencyKey(idempotencyKey: string): void {
	const normalized = idempotencyKey.trim();

	assertDomainRule(
		normalized.length > 0,
		"IDEMPOTENCY_KEY_REQUIRED",
		"Idempotency key is required.",
	);
	assertDomainRule(
		normalized.length <= maxIdempotencyKeyLength,
		"IDEMPOTENCY_KEY_TOO_LONG",
		`Idempotency key must be ${maxIdempotencyKeyLength} characters or less.`,
	);
}
