import type { AppEnvironment } from "@cross-border/config";
import type { DomainEventType, OrderStatus } from "@cross-border/shared";

export type HealthResponse = {
	status: "ok";
	service: "cross-border-api";
	environment: AppEnvironment;
	checkedAt: string;
	contracts: {
		coreTables: string[];
		firstOrderStatus: OrderStatus;
		primaryPaymentEvent: DomainEventType | undefined;
	};
};
