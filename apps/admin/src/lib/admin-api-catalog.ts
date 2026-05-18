export type ApiCatalogAudience = "Storefront" | "Admin" | "Webhook" | "System";

export type ApiCatalogEndpoint = {
	audience: ApiCatalogAudience;
	method: "GET" | "POST" | "PATCH" | "DELETE";
	path: string;
	resource: string;
	description: string;
};

export const apiCatalogEndpoints: ApiCatalogEndpoint[] = [
	{
		audience: "System",
		method: "GET",
		path: "/api/health",
		resource: "Health",
		description: "API health and shared contract details.",
	},
	{
		audience: "Storefront",
		method: "GET",
		path: "/api/site/current",
		resource: "Site Context",
		description: "Resolve current site from request domain.",
	},
	{
		audience: "Storefront",
		method: "GET",
		path: "/api/products",
		resource: "Products",
		description: "List current-site products and catalog filters.",
	},
	{
		audience: "Storefront",
		method: "GET",
		path: "/api/products/attributes",
		resource: "Vertical Attributes",
		description: "List dynamic attributes for storefront filters and forms.",
	},
	{
		audience: "Storefront",
		method: "GET",
		path: "/api/cart",
		resource: "Cart",
		description: "Read current-site cart.",
	},
	{
		audience: "Storefront",
		method: "POST",
		path: "/api/cart/items",
		resource: "Cart Lines",
		description: "Add a SKU to the current-site cart.",
	},
	{
		audience: "Storefront",
		method: "PATCH",
		path: "/api/cart/items/:skuId",
		resource: "Cart Lines",
		description: "Update cart line quantity.",
	},
	{
		audience: "Storefront",
		method: "DELETE",
		path: "/api/cart/items/:skuId",
		resource: "Cart Lines",
		description: "Remove a cart line.",
	},
	{
		audience: "Storefront",
		method: "POST",
		path: "/api/orders",
		resource: "Orders",
		description: "Create an order, snapshot prices and lock inventory.",
	},
	{
		audience: "Storefront",
		method: "GET",
		path: "/api/orders",
		resource: "Orders",
		description: "List current-site shopper orders.",
	},
	{
		audience: "Storefront",
		method: "GET",
		path: "/api/orders/:orderId",
		resource: "Orders",
		description: "Read current-site shopper order detail.",
	},
	{
		audience: "Storefront",
		method: "POST",
		path: "/api/payments",
		resource: "Payment Orders",
		description: "Create a payment order with idempotency key.",
	},
	{
		audience: "Webhook",
		method: "POST",
		path: "/api/payments/webhooks/:channel",
		resource: "Payment Webhooks",
		description: "Receive provider webhook, dedupe provider event id and store first.",
	},
	{
		audience: "Storefront",
		method: "POST",
		path: "/api/after-sales/refund-requests",
		resource: "After-sales Requests",
		description: "Create a current-site refund or return-refund request.",
	},
	{
		audience: "Storefront",
		method: "POST",
		path: "/api/customers/site-customers",
		resource: "Site Customers",
		description: "Create or update current-site customer profile.",
	},
	{
		audience: "Admin",
		method: "GET",
		path: "/api/admin/access-context",
		resource: "Admin Scope",
		description: "Read admin RBAC and data-scope snapshot.",
	},
	{
		audience: "Admin",
		method: "GET",
		path: "/api/admin/products",
		resource: "Products",
		description: "List scoped products for Unified Admin.",
	},
	{
		audience: "Admin",
		method: "GET",
		path: "/api/admin/products/:productId",
		resource: "Products",
		description: "Read scoped product detail.",
	},
	{
		audience: "Admin",
		method: "GET",
		path: "/api/admin/orders",
		resource: "Orders",
		description: "List scoped orders.",
	},
	{
		audience: "Admin",
		method: "GET",
		path: "/api/admin/orders/:orderId",
		resource: "Orders",
		description: "Read scoped order operations detail.",
	},
	{
		audience: "Admin",
		method: "GET",
		path: "/api/admin/payments/orders",
		resource: "Payment Orders",
		description: "List scoped payment orders.",
	},
	{
		audience: "Admin",
		method: "GET",
		path: "/api/admin/payments/transactions",
		resource: "Payment Transactions",
		description: "List scoped payment transactions.",
	},
	{
		audience: "Admin",
		method: "GET",
		path: "/api/admin/payments/webhooks",
		resource: "Payment Webhooks",
		description: "List scoped webhook events and duplicate counters.",
	},
	{
		audience: "Admin",
		method: "GET",
		path: "/api/admin/inventory/balances",
		resource: "Inventory Balances",
		description: "List scoped SKU balances.",
	},
	{
		audience: "Admin",
		method: "GET",
		path: "/api/admin/inventory/locks",
		resource: "Inventory Locks",
		description: "List scoped inventory locks.",
	},
	{
		audience: "Admin",
		method: "GET",
		path: "/api/admin/inventory/transactions",
		resource: "Inventory Transactions",
		description: "List scoped inventory movement ledger.",
	},
	{
		audience: "Admin",
		method: "GET",
		path: "/api/admin/after-sales/requests",
		resource: "After-sales Requests",
		description: "List scoped after-sales requests.",
	},
	{
		audience: "Admin",
		method: "GET",
		path: "/api/admin/customers",
		resource: "Site Customers",
		description: "List scoped site customers and lifetime order value.",
	},
	{
		audience: "Admin",
		method: "GET",
		path: "/api/admin/audit-logs",
		resource: "Audit Logs",
		description: "List scoped high-risk audit logs.",
	},
	{
		audience: "Admin",
		method: "POST",
		path: "/api/admin/operations/process-pending-commerce",
		resource: "Commerce Pipeline",
		description: "Process pending webhook and domain-event work.",
	},
];

export function getOpenApiLinks() {
	const baseUrl =
		process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
	const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

	return {
		baseUrl: normalizedBaseUrl || "API_BASE_URL is not configured",
		docsUrl: normalizedBaseUrl ? `${normalizedBaseUrl}/api/docs` : "",
		jsonUrl: normalizedBaseUrl ? `${normalizedBaseUrl}/api/docs-json` : "",
	};
}
