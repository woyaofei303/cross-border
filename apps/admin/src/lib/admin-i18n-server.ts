import { cookies, headers } from "next/headers";
import {
	adminLocaleCookieName,
	defaultAdminLocale,
	normalizeAdminLocale,
	type AdminLocale,
} from "@/lib/admin-i18n";

function firstAcceptedLanguage(value: string | null) {
	return value?.split(",")[0]?.trim();
}

export async function getRequestAdminLocale(): Promise<AdminLocale> {
	const cookieStore = await cookies();
	const cookieLocale = cookieStore.get(adminLocaleCookieName)?.value;

	if (cookieLocale) {
		return normalizeAdminLocale(cookieLocale);
	}

	const requestHeaders = await headers();
	const acceptedLanguage = firstAcceptedLanguage(
		requestHeaders.get("accept-language"),
	);

	return acceptedLanguage
		? normalizeAdminLocale(acceptedLanguage)
		: defaultAdminLocale;
}
