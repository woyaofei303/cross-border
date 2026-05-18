import { Inject, Injectable } from "@nestjs/common";
import { domainEventTypes, orderStatuses } from "@cross-border/shared";
import { RUNTIME_CONFIG } from "../config/runtime-config.token.js";
import type { ApiRuntimeConfig } from "../config/runtime-config.types.js";
import { DatabaseContractService } from "../database/database-contract.service.js";
import type { HealthResponse } from "./health.types.js";

@Injectable()
export class HealthService {
	constructor(
		@Inject(RUNTIME_CONFIG)
		private readonly config: ApiRuntimeConfig,
		private readonly databaseContracts: DatabaseContractService,
	) {}

	getHealth(): HealthResponse {
		return {
			status: "ok",
			service: "cross-border-api",
			environment: this.config.nodeEnv,
			checkedAt: new Date().toISOString(),
			contracts: {
				coreTables: this.databaseContracts.getCoreTables(),
				firstOrderStatus: orderStatuses[0],
				primaryPaymentEvent: domainEventTypes.find(
					(eventType) => eventType === "PaymentSucceeded",
				),
			},
		};
	}
}
