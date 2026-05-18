import { Body, Controller, Get, NotFoundException, Param, Post, Req } from "@nestjs/common";
import {
	ApiCreatedResponse,
	ApiNotFoundResponse,
	ApiOkResponse,
	ApiOperation,
	ApiTags,
} from "@nestjs/swagger";
import {
	getResolvedSiteFromRequest,
	getSiteDimensions,
	type SiteAwareRequest,
} from "../../../common/site/site-context.js";
import {
	GetStorefrontSiteCustomerUseCase,
	UpsertStorefrontSiteCustomerAddressUseCase,
	UpsertStorefrontSiteCustomerUseCase,
} from "../customer.use-cases.js";
import {
	SiteCustomerProfileDto,
	UpsertSiteCustomerAddressDto,
	UpsertSiteCustomerDto,
} from "./customer.dto.js";

function resolveSiteOrThrow(request: SiteAwareRequest) {
	const site = getResolvedSiteFromRequest(request);

	if (!site) {
		throw new NotFoundException({
			code: "SITE_NOT_FOUND",
			message: "No active site is configured for this request domain.",
		});
	}

	return site;
}

@ApiTags("customers")
@Controller("customers")
export class CustomerController {
	constructor(
		private readonly upsertSiteCustomer: UpsertStorefrontSiteCustomerUseCase,
		private readonly upsertSiteCustomerAddress: UpsertStorefrontSiteCustomerAddressUseCase,
		private readonly getSiteCustomer: GetStorefrontSiteCustomerUseCase,
	) {}

	@Post("site-customers")
	@ApiOperation({
		summary: "Create or update a current-site customer profile",
		description:
			"Uses resolved site context; Storefront must not provide trusted site_id.",
	})
	@ApiCreatedResponse({ type: SiteCustomerProfileDto })
	async upsertCurrentSiteCustomer(
		@Req() request: SiteAwareRequest,
		@Body() body: UpsertSiteCustomerDto,
	): Promise<SiteCustomerProfileDto> {
		const site = resolveSiteOrThrow(request);
		const dimensions = getSiteDimensions(site);

		return this.upsertSiteCustomer.execute({
			...dimensions,
			...(body.guestToken ? { guestToken: body.guestToken } : {}),
			email: body.email,
			...(body.phone ? { phone: body.phone } : {}),
			...(body.nickname ? { nickname: body.nickname } : {}),
			...(body.defaultAddress ? { defaultAddress: body.defaultAddress } : {}),
		});
	}

	@Get("site-customers/:siteCustomerId")
	@ApiOperation({ summary: "Read a current-site customer profile by id" })
	@ApiOkResponse({ type: SiteCustomerProfileDto })
	@ApiNotFoundResponse({ description: "Site customer not found in current site." })
	async getCurrentSiteCustomer(
		@Req() request: SiteAwareRequest,
		@Param("siteCustomerId") siteCustomerId: string,
	): Promise<SiteCustomerProfileDto> {
		const site = resolveSiteOrThrow(request);
		const profile = await this.getSiteCustomer.execute({
			siteId: site.siteId,
			siteCustomerId,
		});

		if (!profile) {
			throw new NotFoundException({
				code: "SITE_CUSTOMER_NOT_FOUND",
				message: "Site customer was not found for this site.",
			});
		}

		return profile;
	}

	@Post("site-customers/:siteCustomerId/addresses")
	@ApiOperation({ summary: "Create or update current-site customer default address" })
	@ApiOkResponse({ type: SiteCustomerProfileDto })
	async upsertCurrentSiteCustomerAddress(
		@Req() request: SiteAwareRequest,
		@Param("siteCustomerId") siteCustomerId: string,
		@Body() body: UpsertSiteCustomerAddressDto,
	): Promise<SiteCustomerProfileDto> {
		const site = resolveSiteOrThrow(request);
		const profile = await this.upsertSiteCustomerAddress.execute({
			...getSiteDimensions(site),
			siteCustomerId,
			address: body,
		});

		if (!profile) {
			throw new NotFoundException({
				code: "SITE_CUSTOMER_NOT_FOUND",
				message: "Site customer was not found for this site.",
			});
		}

		return profile;
	}
}
