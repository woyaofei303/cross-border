import { Module } from "@nestjs/common";
import { ApiConfigModule } from "../config/api-config.module.js";
import { DatabaseContractService } from "./database-contract.service.js";
import { PgEventProcessLogRepository } from "./pg/pg-event-process-log.repository.js";
import { PgOutboxRepository } from "./pg/pg-outbox.repository.js";
import { PgPoolService } from "./pg/pg-pool.service.js";
import { PgTransactionManager } from "./pg/pg-transaction-manager.js";

@Module({
	imports: [ApiConfigModule],
	providers: [
		DatabaseContractService,
		PgPoolService,
		PgTransactionManager,
		PgOutboxRepository,
		PgEventProcessLogRepository,
	],
	exports: [
		DatabaseContractService,
		PgPoolService,
		PgTransactionManager,
		PgOutboxRepository,
		PgEventProcessLogRepository,
	],
})
export class DatabaseModule {}
