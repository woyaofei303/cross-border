import { getAdminApiBaseUrl } from "@/lib/admin-sites";

function jsonError(message: string, status: number) {
	return Response.json({ message }, { status });
}

export async function proxyAdminPost(request: Request, pathname: string) {
	const apiBaseUrl = getAdminApiBaseUrl();

	if (!apiBaseUrl) {
		return jsonError("Admin API base URL is not configured.", 503);
	}

	const body = await request.text();
	const contentType = request.headers.get("content-type") ?? "application/json";
	const headers = new Headers({
		"content-type": contentType,
	});

	for (const name of [
		"authorization",
		"cookie",
		"user-agent",
		"x-admin-user-id",
		"x-correlation-id",
		"x-forwarded-for",
		"x-request-id",
	]) {
		const value = request.headers.get(name);

		if (value) {
			headers.set(name, value);
		}
	}

	const response = await fetch(new URL(pathname, apiBaseUrl), {
		method: "POST",
		headers,
		body: body.length > 0 ? body : "{}",
		cache: "no-store",
	});
	const responseBody = await response.text();
	const responseContentType =
		response.headers.get("content-type") ?? "application/json";

	return new Response(responseBody.length > 0 ? responseBody : "{}", {
		status: response.status,
		headers: {
			"content-type": responseContentType,
		},
	});
}
