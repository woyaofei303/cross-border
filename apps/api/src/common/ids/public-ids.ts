import { randomUUID } from "node:crypto";
import { getPublicIdPrefix, type PublicIdType } from "@cross-border/shared";

export function createUuid(): string {
	return randomUUID();
}

export function createPublicNumber(type: PublicIdType, date = new Date()): string {
	const yyyy = date.getUTCFullYear();
	const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
	const dd = String(date.getUTCDate()).padStart(2, "0");
	const randomPart = randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();

	return `${getPublicIdPrefix(type)}${yyyy}${mm}${dd}${randomPart}`;
}

export function createDefaultLockExpiry(now = new Date()): string {
	return new Date(now.getTime() + 15 * 60 * 1000).toISOString();
}
