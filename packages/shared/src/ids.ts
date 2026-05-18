export const publicIdPrefixes = {
	order: "CB",
	payment: "PAY",
	refund: "REF",
	fulfillment: "FUL",
	afterSales: "AS",
} as const;

export type PublicIdType = keyof typeof publicIdPrefixes;

export function getPublicIdPrefix(type: PublicIdType): string {
	return publicIdPrefixes[type];
}
