import { ValidationPipe } from "@nestjs/common";

export function createApiValidationPipe(): ValidationPipe {
	return new ValidationPipe({
		forbidNonWhitelisted: true,
		transform: true,
		validationError: {
			target: false,
			value: false,
		},
		whitelist: true,
	});
}
