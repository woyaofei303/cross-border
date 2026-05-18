import {
  BadRequestException,
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import { DomainRuleViolationError } from "./domain-errors.js";

type HttpResponse = {
	status(code: number): {
		json(body: unknown): void;
	};
};

@Catch(DomainRuleViolationError)
export class DomainRuleViolationFilter implements ExceptionFilter {
	catch(error: DomainRuleViolationError, host: ArgumentsHost): void {
		const response = host.switchToHttp().getResponse<HttpResponse>();
		const exception = new BadRequestException({
			code: error.code,
			message: error.message,
		});
		const exceptionResponse = exception.getResponse();

		response.status(exception.getStatus()).json(exceptionResponse);
	}
}
