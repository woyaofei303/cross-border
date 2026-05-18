import type { Metadata } from "next";
import { AccountLitePage } from "@/components/AccountLitePage";
import { resolveCurrentSiteContext } from "@/lib/server-site-context";

export async function generateMetadata(): Promise<Metadata> {
	const site = await resolveCurrentSiteContext();

	return {
		title: `Account | ${site.siteName}`,
		description: "Manage current-site guest account context and address draft.",
	};
}

export default async function StorefrontAccountRoutePage() {
	const site = await resolveCurrentSiteContext();

	return <AccountLitePage site={site} />;
}
