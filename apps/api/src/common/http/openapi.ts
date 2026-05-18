import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

export function setupOpenApi(app: INestApplication): void {
	const config = new DocumentBuilder()
		.setTitle("Cross Border Commerce OS API")
		.setDescription(
			"API First contract for the modular monolith commerce system.",
		)
		.setVersion("0.1.0")
		.addBearerAuth()
		.build();
	const document = SwaggerModule.createDocument(app, config);

	SwaggerModule.setup("api/docs", app, document);
}
