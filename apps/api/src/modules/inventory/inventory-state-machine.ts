import type { InventoryLockStatus } from "@cross-border/shared";
import { assertDomainRule } from "../../common/domain/domain-errors.js";

const inventoryLockTransitions: Record<
	InventoryLockStatus,
	readonly InventoryLockStatus[]
> = {
	locked: ["released", "deducted", "expired"],
	expired: ["released"],
	released: [],
	deducted: [],
};

export function assertInventoryLockTransition(
	fromStatus: InventoryLockStatus,
	toStatus: InventoryLockStatus,
): void {
	assertDomainRule(
		inventoryLockTransitions[fromStatus].includes(toStatus),
		"INVENTORY_LOCK_STATUS_TRANSITION_NOT_ALLOWED",
		`Inventory lock status cannot transition from ${fromStatus} to ${toStatus}.`,
	);
}
