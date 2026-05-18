export type AppEnvironment = "development" | "test" | "production";

export type RuntimeConfig = {
	nodeEnv: AppEnvironment;
	port: number;
	databaseUrl: string | undefined;
	redisUrl: string | undefined;
	stripeWebhookSecret: string | undefined;
};

type EnvRecord = Record<string, string | undefined>;

export function readRequiredEnv(env: EnvRecord, key: string): string {
	const value = env[key];

	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}

	return value;
}

export function readOptionalEnv(
	env: EnvRecord,
	key: string,
	fallback?: string,
): string | undefined {
	return env[key] ?? fallback;
}

export function readPort(env: EnvRecord, key: string, fallback: number): number {
	const value = readOptionalEnv(env, key);

	if (!value) {
		return fallback;
	}

	const port = Number(value);

	if (!Number.isInteger(port) || port <= 0 || port > 65535) {
		throw new Error(`Invalid port in ${key}: ${value}`);
	}

	return port;
}

export function readAppEnvironment(env: EnvRecord): AppEnvironment {
	const nodeEnv = readOptionalEnv(env, "NODE_ENV", "development");

	if (
		nodeEnv !== "development" &&
		nodeEnv !== "test" &&
		nodeEnv !== "production"
	) {
		throw new Error(`Invalid NODE_ENV: ${nodeEnv}`);
	}

	return nodeEnv;
}

export function createRuntimeConfig(env: EnvRecord): RuntimeConfig {
	return {
		nodeEnv: readAppEnvironment(env),
		port: readPort(env, "PORT", 3000),
		databaseUrl: readOptionalEnv(env, "DATABASE_URL"),
		redisUrl: readOptionalEnv(env, "REDIS_URL"),
		stripeWebhookSecret: readOptionalEnv(env, "STRIPE_WEBHOOK_SECRET"),
	};
}
