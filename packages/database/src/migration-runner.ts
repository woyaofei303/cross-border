import { Client } from "pg";
import {
	defaultMigrationsDir,
	listMigrationFiles,
	readMigrationFile,
	type MigrationFile,
} from "./migrations.js";

export type AppliedMigration = {
	id: string;
	name: string;
	checksum: string;
	applied_at: Date;
};

export type MigrationRunResult = {
	applied: string[];
	rolledBack: string[];
	skipped: string[];
};

export type MigrationStatus = {
	id: string;
	filename: string;
	applied: boolean;
	checksum: string;
	appliedChecksum: string | null;
	checksumMatches: boolean | null;
};

export type MigrationRunnerOptions = {
	connectionString?: string;
	migrationsDir?: string;
	logger?: Pick<Console, "log">;
};

type MigrationCommandOptions = MigrationRunnerOptions & {
	steps?: number;
};

function resolveConnectionString(connectionString?: string): string {
	const resolved = connectionString ?? process.env.DATABASE_URL;

	if (!resolved) {
		throw new Error("DATABASE_URL is required to run database migrations.");
	}

	return resolved;
}

async function withClient<T>(
	options: MigrationRunnerOptions,
	callback: (client: Client) => Promise<T>,
): Promise<T> {
	const client = new Client({
		connectionString: resolveConnectionString(options.connectionString),
	});

	await client.connect();

	try {
		return await callback(client);
	} finally {
		await client.end();
	}
}

async function ensureMigrationsTable(client: Client): Promise<void> {
	await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getAppliedMigrations(
	client: Client,
): Promise<Map<string, AppliedMigration>> {
	const result = await client.query<AppliedMigration>(`
    SELECT id, name, checksum, applied_at
    FROM schema_migrations
    ORDER BY id ASC
  `);

	return new Map(result.rows.map((migration) => [migration.id, migration]));
}

async function applyMigration(
	client: Client,
	migration: MigrationFile,
): Promise<void> {
	await client.query("BEGIN");

	try {
		await client.query(migration.sql);
		await client.query(
			`
        INSERT INTO schema_migrations (id, name, checksum)
        VALUES ($1, $2, $3)
      `,
			[migration.id, migration.filename, migration.checksum],
		);
		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	}
}

async function rollbackMigration(
	client: Client,
	migration: AppliedMigration,
	migrationsDir: string,
): Promise<void> {
	const downMigration = await readMigrationFile(
		migrationsDir,
		`${migration.id}.down.sql`,
	);

	await client.query("BEGIN");

	try {
		await client.query(downMigration.sql);
		await client.query("DELETE FROM schema_migrations WHERE id = $1", [
			migration.id,
		]);
		await client.query("COMMIT");
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	}
}

export async function runMigrations(
	options: MigrationRunnerOptions = {},
): Promise<MigrationRunResult> {
	const migrationsDir = options.migrationsDir ?? defaultMigrationsDir;

	return withClient(options, async (client) => {
		await ensureMigrationsTable(client);

		const applied = await getAppliedMigrations(client);
		const migrations = await listMigrationFiles("up", migrationsDir);
		const result: MigrationRunResult = {
			applied: [],
			rolledBack: [],
			skipped: [],
		};

		for (const migration of migrations) {
			const appliedMigration = applied.get(migration.id);

			if (appliedMigration) {
				if (appliedMigration.checksum !== migration.checksum) {
					throw new Error(
						`Migration checksum mismatch for ${migration.id}. Applied migrations are immutable.`,
					);
				}

				result.skipped.push(migration.id);
				continue;
			}

			await applyMigration(client, migration);
			options.logger?.log(`Applied migration ${migration.id}`);
			result.applied.push(migration.id);
		}

		return result;
	});
}

export async function rollbackMigrations(
	options: MigrationCommandOptions = {},
): Promise<MigrationRunResult> {
	const migrationsDir = options.migrationsDir ?? defaultMigrationsDir;
	const steps = options.steps ?? 1;

	if (!Number.isInteger(steps) || steps <= 0) {
		throw new Error(`Rollback steps must be a positive integer: ${steps}`);
	}

	return withClient(options, async (client) => {
		await ensureMigrationsTable(client);

		const applied = [...(await getAppliedMigrations(client)).values()]
			.sort((left, right) => right.id.localeCompare(left.id))
			.slice(0, steps);

		const result: MigrationRunResult = {
			applied: [],
			rolledBack: [],
			skipped: [],
		};

		for (const migration of applied) {
			await rollbackMigration(client, migration, migrationsDir);
			options.logger?.log(`Rolled back migration ${migration.id}`);
			result.rolledBack.push(migration.id);
		}

		return result;
	});
}

export async function getMigrationStatus(
	options: MigrationRunnerOptions = {},
): Promise<MigrationStatus[]> {
	const migrationsDir = options.migrationsDir ?? defaultMigrationsDir;

	return withClient(options, async (client) => {
		await ensureMigrationsTable(client);

		const applied = await getAppliedMigrations(client);
		const migrations = await listMigrationFiles("up", migrationsDir);

		return migrations.map((migration) => {
			const appliedMigration = applied.get(migration.id);

			return {
				id: migration.id,
				filename: migration.filename,
				applied: Boolean(appliedMigration),
				checksum: migration.checksum,
				appliedChecksum: appliedMigration?.checksum ?? null,
				checksumMatches: appliedMigration
					? appliedMigration.checksum === migration.checksum
					: null,
			};
		});
	});
}
