import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import { Pool } from "pg";
import { RUNTIME_CONFIG } from "../../config/runtime-config.token.js";
import type { ApiRuntimeConfig } from "../../config/runtime-config.types.js";

@Injectable()
export class PgPoolService implements OnModuleDestroy {
	private pool: Pool | null = null;

	constructor(
		@Inject(RUNTIME_CONFIG)
		private readonly config: ApiRuntimeConfig,
	) {}

	getPool(): Pool {
		if (!this.config.databaseUrl) {
			throw new Error("DATABASE_URL is required for PostgreSQL operations.");
		}

		this.pool ??= new Pool({
			connectionString: this.config.databaseUrl,
		});

		return this.pool;
	}

	async onModuleDestroy(): Promise<void> {
		if (this.pool) {
			await this.pool.end();
			this.pool = null;
		}
	}
}
