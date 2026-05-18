import { assertDomainRule } from "../domain/domain-errors.js";

const moneyPattern = /^\d+(\.\d{1,2})?$/;

export type Money = {
	amount: string;
	currency: string;
};

export function parseMoneyToMinorUnits(amount: string): bigint {
	assertDomainRule(
		moneyPattern.test(amount),
		"INVALID_MONEY_AMOUNT",
		`Invalid money amount: ${amount}`,
	);

	const [major, minor = ""] = amount.split(".");
	return BigInt(major) * 100n + BigInt(minor.padEnd(2, "0"));
}

export function assertSameCurrency(left: Money, right: Money): void {
	assertDomainRule(
		left.currency === right.currency,
		"CURRENCY_MISMATCH",
		`Currency mismatch: ${left.currency} !== ${right.currency}`,
	);
}

export function assertOrderTotal(input: {
	subtotalAmount: string;
	discountAmount: string;
	shippingAmount: string;
	taxAmount: string;
	totalAmount: string;
}): void {
	const expected =
		parseMoneyToMinorUnits(input.subtotalAmount) -
		parseMoneyToMinorUnits(input.discountAmount) +
		parseMoneyToMinorUnits(input.shippingAmount) +
		parseMoneyToMinorUnits(input.taxAmount);
	const actual = parseMoneyToMinorUnits(input.totalAmount);

	assertDomainRule(
		expected >= 0n,
		"ORDER_TOTAL_NEGATIVE",
		"Order total cannot be negative.",
	);
	assertDomainRule(
		actual === expected,
		"ORDER_TOTAL_MISMATCH",
		"Order total must equal subtotal minus discount plus shipping and tax.",
	);
}
