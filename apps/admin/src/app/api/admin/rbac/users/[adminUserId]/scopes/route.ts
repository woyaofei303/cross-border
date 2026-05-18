import { proxyAdminPost } from "@/lib/admin-api-proxy";

type AdminScopeRouteContext = {
	params: Promise<{
		adminUserId: string;
	}>;
};

export async function POST(request: Request, context: AdminScopeRouteContext) {
	const { adminUserId } = await context.params;

	return proxyAdminPost(
		request,
		`/api/admin/rbac/users/${encodeURIComponent(adminUserId)}/scopes`,
	);
}
