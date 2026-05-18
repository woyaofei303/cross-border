import { Controller, Get, Req } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AdminAccessAwareRequest } from "../../../common/admin/admin-access.js";
import { AdminAccessService } from "../../admin-access/admin-access.service.js";
import { SiteResolverService } from "../site.service.js";
import {
	AdminAccessContextResponseDto,
	AdminBrandsResponseDto,
	AdminSitesResponseDto,
	AdminVerticalsResponseDto,
} from "./site.dto.js";

@ApiTags("admin-sites")
@Controller("admin")
export class AdminSiteController {
	constructor(
		private readonly siteResolver: SiteResolverService,
		private readonly adminAccess: AdminAccessService,
	) {}

	@Get("access-context")
	@ApiOperation({
		summary: "Resolve current admin RBAC data scope",
		description:
			"Reads the current admin identity carrier and returns the data scopes that will be applied to admin queries.",
	})
	@ApiOkResponse({ type: AdminAccessContextResponseDto })
	async getAccessContext(
		@Req() request: AdminAccessAwareRequest,
	): Promise<AdminAccessContextResponseDto> {
		return this.adminAccess.resolveForRequest(request);
	}

	@Get("sites")
	@ApiOperation({
		summary: "List sites for unified admin site switcher",
		description:
			"Returns the current site catalog filtered by the admin RBAC data scope.",
	})
	@ApiOkResponse({ type: AdminSitesResponseDto })
	async listSites(
		@Req() request: AdminAccessAwareRequest,
	): Promise<AdminSitesResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);

		return {
			sites: await this.siteResolver.listAdminSites(access),
		};
	}

	@Get("verticals")
	@ApiOperation({
		summary: "List verticals for unified admin",
	})
	@ApiOkResponse({ type: AdminVerticalsResponseDto })
	async listVerticals(
		@Req() request: AdminAccessAwareRequest,
	): Promise<AdminVerticalsResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);

		return {
			verticals: await this.siteResolver.listAdminVerticals(access),
		};
	}

	@Get("brands")
	@ApiOperation({
		summary: "List brands for unified admin",
	})
	@ApiOkResponse({ type: AdminBrandsResponseDto })
	async listBrands(
		@Req() request: AdminAccessAwareRequest,
	): Promise<AdminBrandsResponseDto> {
		const access = await this.adminAccess.resolveForRequest(request);

		return {
			brands: await this.siteResolver.listAdminBrands(access),
		};
	}
}
