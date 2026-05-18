export class DomainRuleViolationError extends Error {
	constructor(
		message: string,
		readonly code: string,
	) {
		super(message);
		this.name = "DomainRuleViolationError";
	}
}

export function assertDomainRule(
	condition: boolean,
	code: string,
	message: string,
): asserts condition {
	if (!condition) {
		throw new DomainRuleViolationError(message, code);
	}
}
