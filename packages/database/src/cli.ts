import {
	getMigrationStatus,
	rollbackMigrations,
	runMigrations,
} from "./migration-runner.js";
import { validateMigrationFiles } from "./migrations.js";

function parseSteps(args: string[]): number | undefined {
	const stepsArg = args.find((arg) => arg.startsWith("--steps="));

	if (!stepsArg) {
		return undefined;
	}

	const rawSteps = stepsArg.replace("--steps=", "");
	const steps = Number(rawSteps);

	if (!Number.isInteger(steps) || steps <= 0) {
		throw new Error(`Invalid --steps value: ${rawSteps}`);
	}

	return steps;
}

async function main(): Promise<void> {
	const [, , command = "up", ...args] = process.argv;
	const logger = console;

	if (command === "up") {
		const result = await runMigrations({ logger });
		logger.log(JSON.stringify(result, null, 2));
		return;
	}

	if (command === "down") {
		const steps = parseSteps(args);
		const result = await rollbackMigrations({
			...(steps === undefined ? {} : { steps }),
			logger,
		});
		logger.log(JSON.stringify(result, null, 2));
		return;
	}

	if (command === "status") {
		const status = await getMigrationStatus();
		logger.log(JSON.stringify(status, null, 2));
		return;
	}

	if (command === "validate") {
		const result = await validateMigrationFiles();
		logger.log(JSON.stringify(result, null, 2));

		if (!result.valid) {
			process.exitCode = 1;
		}

		return;
	}

	throw new Error(`Unknown database migration command: ${command}`);
}

await main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(message);
	process.exitCode = 1;
});
