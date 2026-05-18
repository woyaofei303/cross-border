import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { createApiValidationPipe } from "./common/http/api-validation.pipe.js";
import { setupOpenApi } from "./common/http/openapi.js";
import { RUNTIME_CONFIG } from "./modules/config/runtime-config.token.js";
import type { ApiRuntimeConfig } from "./modules/config/runtime-config.types.js";

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	const config = app.get<ApiRuntimeConfig>(RUNTIME_CONFIG);

	app.setGlobalPrefix("api");
	app.useGlobalPipes(createApiValidationPipe());
	setupOpenApi(app);
	app.enableShutdownHooks();

	await app.listen(config.port);
}

await bootstrap();
