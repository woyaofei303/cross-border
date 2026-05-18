import {
	Controller,
	Get,
	Headers,
	NotFoundException,
} from "@nestjs/common";
import {
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from "@nestjs/swagger";
import { SiteResolverService } from "../site.service.js";
import { CurrentSiteResponseDto } from "./site.dto.js";

@ApiTags("site")
@Controller("site")
export class SiteController {
	constructor(private readonly siteResolver: SiteResolverService) {}

	@Get("current")
	@ApiOperation({
		summary: "Resolve the current site from request domain",
		description:
			"Resolves the active site from x-site-domain, x-forwarded-host, or host. Localhost maps to default-site for backwards compatibility.",
	})
	@ApiOkResponse({ type: CurrentSiteResponseDto })
	@ApiNotFoundResponse({ description: "No active site is configured for domain." })
	async getCurrentSite(
		@Headers("host") host: string | undefined,
		@Headers("x-forwarded-host") forwardedHost: string | undefined,
		@Headers("x-site-domain") siteDomain: string | undefined,
	): Promise<CurrentSiteResponseDto> {
		const result = await this.siteResolver.resolveForRequest({
			host,
			forwardedHost,
			siteDomain,
		});

		if (result.status === "unresolved") {
			throw new NotFoundException({
				code: "SITE_NOT_FOUND",
				message: `No active site is configured for domain ${result.domain}.`,
				reason: result.reason,
			});
		}

		return {
			...result.site,
			resolvedFrom: result.resolvedFrom,
		};
	}
}
