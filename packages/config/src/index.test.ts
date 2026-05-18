import { describe, expect, it } from "vitest";
import { createRuntimeConfig, readRequiredEnv } from "./index.js";

describe("runtime config", () => {
	it("builds a config with safe defaults", () => {
		expect(createRuntimeConfig({})).toMatchObject({
			nodeEnv: "development",
			port: 3000,
		});
	});

	it("validates port values", () => {
		expect(() => createRuntimeConfig({ PORT: "not-a-port" })).toThrow(
			"Invalid port",
		);
	});

	it("throws for missing required values", () => {
		expect(() => readRequiredEnv({}, "DATABASE_URL")).toThrow(
			"Missing required environment variable: DATABASE_URL",
		);
	});
});
