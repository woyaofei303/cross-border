import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { SiteAwareRequest } from "../../common/site/site-context.js";
import { readHeaderValue } from "../../common/site/site-context.js";
import { SiteResolverService } from "./site.service.js";

@Injectable()
export class SiteContextMiddleware implements NestMiddleware {
	constructor(private readonly siteResolver: SiteResolverService) {}

	async use(
		request: SiteAwareRequest,
		_response: unknown,
		next: () => void,
	): Promise<void> {
		request.siteResolution = await this.siteResolver.resolveForRequest({
			host: readHeaderValue(request.headers.host),
			forwardedHost: readHeaderValue(request.headers["x-forwarded-host"]),
			siteDomain: readHeaderValue(request.headers["x-site-domain"]),
		});

		next();
	}
}
