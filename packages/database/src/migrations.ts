import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export type MigrationDirection = "up" | "down";

export type MigrationFile = {
	id: string;
	direction: MigrationDirection;
	filename: string;
	filepath: string;
	sql: string;
	checksum: string;
};

export type MigrationValidationResult = {
	valid: boolean;
	ids: string[];
	errors: string[];
};

const migrationFilenamePattern =
	/^(?<id>\d{4}_[a-z0-9_]+)\.(?<direction>up|down)\.sql$/;

export const defaultMigrationsDir = fileURLToPath(
	new URL("../migrations", import.meta.url),
);

export function calculateChecksum(sql: string): string {
	return createHash("sha256").update(sql).digest("hex");
}

export function parseMigrationFilename(filename: string): {
	id: string;
	direction: MigrationDirection;
} | null {
	const match = migrationFilenamePattern.exec(filename);
	const groups = match?.groups;

	if (!groups) {
		return null;
	}

	return {
		id: groups.id,
		direction: groups.direction as MigrationDirection,
	};
}

export async function readMigrationFile(
	migrationsDir: string,
	filename: string,
): Promise<MigrationFile> {
	const parsed = parseMigrationFilename(filename);

	if (!parsed) {
		throw new Error(`Invalid migration filename: ${filename}`);
	}

	const filepath = join(migrationsDir, filename);
	const sql = await readFile(filepath, "utf8");

	return {
		id: parsed.id,
		direction: parsed.direction,
		filename,
		filepath,
		sql,
		checksum: calculateChecksum(sql),
	};
}

export async function listMigrationFiles(
	direction: MigrationDirection,
	migrationsDir = defaultMigrationsDir,
): Promise<MigrationFile[]> {
	const filenames = await readdir(migrationsDir);
	const migrationFilenames = filenames
		.filter((filename) => {
			const parsed = parseMigrationFilename(filename);
			return parsed?.direction === direction;
		})
		.sort();

	return Promise.all(
		migrationFilenames.map((filename) =>
			readMigrationFile(migrationsDir, filename),
		),
	);
}

export async function validateMigrationFiles(
	migrationsDir = defaultMigrationsDir,
): Promise<MigrationValidationResult> {
	const filenames = await readdir(migrationsDir);
	const errors: string[] = [];
	const ids = new Set<string>();
	const directionsById = new Map<string, Set<MigrationDirection>>();

	for (const filename of filenames) {
		if (!filename.endsWith(".sql")) {
			continue;
		}

		const parsed = parseMigrationFilename(filename);

		if (!parsed) {
			errors.push(`Invalid migration filename: ${filename}`);
			continue;
		}

		const directions = directionsById.get(parsed.id) ?? new Set();

		if (directions.has(parsed.direction)) {
			errors.push(
				`Duplicate ${parsed.direction} migration for ${parsed.id}: ${filename}`,
			);
		}

		directions.add(parsed.direction);
		directionsById.set(parsed.id, directions);
		ids.add(parsed.id);

		const migration = await readMigrationFile(migrationsDir, filename);

		if (migration.sql.trim().length === 0) {
			errors.push(`Empty migration file: ${filename}`);
		}
	}

	for (const [id, directions] of directionsById) {
		if (!directions.has("up")) {
			errors.push(`Missing up migration for ${id}`);
		}

		if (!directions.has("down")) {
			errors.push(`Missing down migration for ${id}`);
		}
	}

	return {
		valid: errors.length === 0,
		ids: [...ids].sort(),
		errors,
	};
}
