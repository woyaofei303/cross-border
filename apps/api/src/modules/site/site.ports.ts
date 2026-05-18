import type { SiteContext } from "../../common/site/site-context.js";
import type {
	BrandAdminSummary,
	SiteAdminSummary,
	VerticalAdminSummary,
} from "./site.service.js";

export interface SiteLookupRepositoryPort {
	findActiveByDomain(domain: string): Promise<SiteContext | null>;
	findSitesForAdmin(): Promise<SiteAdminSummary[]>;
	findVerticalsForAdmin(): Promise<VerticalAdminSummary[]>;
	findBrandsForAdmin(): Promise<BrandAdminSummary[]>;
}
