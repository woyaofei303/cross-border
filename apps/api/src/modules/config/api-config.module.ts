import { Module } from "@nestjs/common";
import { createRuntimeConfig } from "@cross-border/config";
import { RUNTIME_CONFIG } from "./runtime-config.token.js";
import type { ApiRuntimeConfig } from "./runtime-config.types.js";

function createApiRuntimeConfig(): ApiRuntimeConfig {
	return createRuntimeConfig({
		...process.env,
		PORT: process.env.API_PORT ?? process.env.PORT ?? "4000",
	});
}

@Module({
	providers: [
		{
			provide: RUNTIME_CONFIG,
			useFactory: createApiRuntimeConfig,
		},
	],
	exports: [RUNTIME_CONFIG],
})
export class ApiConfigModule {}
