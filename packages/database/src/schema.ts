import type {
	AfterSalesRequestType,
	AfterSalesRequestStatus,
	AftersalesStatus,
	FulfillmentOrderStatus,
	FulfillmentStatus,
	InventoryLockStatus,
	InventoryTransactionType,
	OrderStatus,
	PaymentChargebackStatus,
	PaymentOrderStatus,
	PaymentRefundStatus,
	PaymentStatus,
	PaymentTransactionStatus,
	PaymentTransactionType,
	PaymentWebhookStatus,
	ShipmentStatus,
} from "@cross-border/shared";

export type Timestamp = Date;
export type DecimalString = string;

export type SiteDimensionColumns = {
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
};

export type AdminScopeType = "global" | "vertical" | "brand" | "site";
export type AnalyticsScopeType = "global" | "vertical" | "brand" | "site";

export type ProductAttributeType =
	| "text"
	| "number"
	| "boolean"
	| "select"
	| "multiselect"
	| "json";

export type UsersTable = SiteDimensionColumns & {
	id: string;
	email: string | null;
	phone: string | null;
	status: "active" | "disabled" | "blocked";
	user_type: "guest" | "registered";
	default_locale: string | null;
	default_currency: string | null;
	risk_level: "normal" | "watch" | "high" | "blocked";
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type SiteCustomersTable = {
	id: string;
	global_user_id: string | null;
	site_id: string;
	vertical_id: string;
	brand_id: string;
	guest_token: string | null;
	email: string | null;
	phone: string | null;
	nickname: string | null;
	membership_level: string;
	points: number;
	status: "active" | "disabled" | "blocked";
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type SiteCustomerAddressesTable = {
	id: string;
	site_customer_id: string;
	site_id: string;
	vertical_id: string;
	brand_id: string;
	label: string | null;
	email: string;
	full_name: string;
	phone: string | null;
	country_code: string;
	region: string | null;
	city: string;
	postal_code: string;
	address_line1: string;
	address_line2: string | null;
	is_default: boolean;
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type VerticalsTable = {
	id: string;
	code: string;
	name: string;
	description: string | null;
	status: "active" | "inactive" | "archived";
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type BrandsTable = {
	id: string;
	code: string;
	name: string;
	logo_url: string | null;
	status: "active" | "inactive" | "archived";
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type SitesTable = {
	id: string;
	vertical_id: string;
	brand_id: string;
	code: string;
	name: string;
	default_domain: string;
	default_language: string;
	default_currency: string;
	status: "active" | "inactive" | "archived";
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type SiteDomainsTable = {
	id: string;
	site_id: string;
	domain: string;
	is_primary: boolean;
	status: "active" | "inactive";
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type SiteConfigsTable = {
	id: string;
	site_id: string;
	theme: string;
	logo_url: string | null;
	primary_color: string | null;
	homepage_layout: unknown;
	enabled_languages: string[];
	enabled_currencies: string[];
	payment_channels: string[];
	shipping_countries: string[];
	seo_title: string | null;
	seo_description: string | null;
	seo_keywords: string[];
	analytics_config: unknown;
	pixel_config: unknown;
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type VerticalAttributesTable = {
	id: string;
	vertical_id: string;
	name: string;
	code: string;
	type: ProductAttributeType;
	required: boolean;
	searchable: boolean;
	filterable: boolean;
	sort_order: number;
	status: "active" | "inactive" | "archived";
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type VerticalAttributeOptionsTable = {
	id: string;
	attribute_id: string;
	label: string;
	value: string;
	sort_order: number;
	created_at: Timestamp;
};

export type ProductAttributeValuesTable = {
	id: string;
	site_id: string;
	vertical_id: string;
	product_id: string;
	sku_id: string | null;
	attribute_id: string;
	value: unknown;
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type OrdersTable = SiteDimensionColumns & {
	id: string;
	order_no: string;
	user_id: string | null;
	guest_token: string | null;
	order_status: OrderStatus;
	payment_status: PaymentStatus;
	fulfillment_status: FulfillmentStatus;
	aftersales_status: AftersalesStatus;
	currency: string;
	subtotal_amount: DecimalString;
	discount_amount: DecimalString;
	shipping_amount: DecimalString;
	tax_amount: DecimalString;
	total_amount: DecimalString;
	country_code: string | null;
	shipping_address_snapshot: unknown;
	billing_address_snapshot: unknown | null;
	price_snapshot: unknown;
	idempotency_key: string;
	created_at: Timestamp;
	updated_at: Timestamp;
	paid_at: Timestamp | null;
	cancelled_at: Timestamp | null;
	closed_at: Timestamp | null;
};

export type OrderItemsTable = SiteDimensionColumns & {
	id: string;
	order_id: string;
	product_id: string;
	sku_id: string;
	sku_code: string;
	product_title: string;
	sku_title: string | null;
	image_url: string | null;
	unit_price: DecimalString;
	quantity: number;
	discount_amount: DecimalString;
	total_amount: DecimalString;
	snapshot: unknown;
	created_at: Timestamp;
};

export type OrderStatusLogsTable = SiteDimensionColumns & {
	id: string;
	order_id: string;
	status_type: "order" | "payment" | "fulfillment" | "aftersales";
	from_status: string | null;
	to_status: string;
	reason: string | null;
	operator_type: "user" | "admin" | "system";
	operator_id: string | null;
	metadata: unknown;
	created_at: Timestamp;
};

export type PaymentOrdersTable = SiteDimensionColumns & {
	id: string;
	order_id: string;
	payment_no: string;
	channel_code: string;
	status: PaymentOrderStatus;
	amount: DecimalString;
	currency: string;
	provider_payment_id: string | null;
	idempotency_key: string;
	request_payload: unknown | null;
	response_payload: unknown | null;
	created_at: Timestamp;
	updated_at: Timestamp;
	succeeded_at: Timestamp | null;
	failed_at: Timestamp | null;
};

export type PaymentTransactionsTable = SiteDimensionColumns & {
	id: string;
	payment_order_id: string;
	channel_code: string;
	provider_transaction_id: string;
	transaction_type: PaymentTransactionType;
	status: PaymentTransactionStatus;
	amount: DecimalString;
	currency: string;
	raw_payload: unknown;
	created_at: Timestamp;
};

export type PaymentWebhookEventsTable = SiteDimensionColumns & {
	id: string;
	payment_order_id: string | null;
	channel_code: string;
	provider_event_id: string;
	event_type: string;
	provider_object_id: string | null;
	raw_payload: unknown;
	signature_header: string | null;
	status: PaymentWebhookStatus;
	error_message: string | null;
	received_at: Timestamp;
	processed_at: Timestamp | null;
};

export type PaymentRefundsTable = SiteDimensionColumns & {
	id: string;
	payment_order_id: string;
	order_id: string;
	after_sales_request_id: string | null;
	refund_no: string;
	provider_refund_id: string | null;
	status: PaymentRefundStatus;
	amount: DecimalString;
	currency: string;
	reason: string | null;
	idempotency_key: string;
	request_payload: unknown | null;
	response_payload: unknown | null;
	created_at: Timestamp;
	updated_at: Timestamp;
	succeeded_at: Timestamp | null;
	failed_at: Timestamp | null;
};

export type PaymentChargebacksTable = SiteDimensionColumns & {
	id: string;
	payment_order_id: string;
	order_id: string;
	provider_dispute_id: string;
	status: PaymentChargebackStatus;
	amount: DecimalString;
	currency: string;
	reason: string | null;
	raw_payload: unknown;
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type SkuInventoryTable = SiteDimensionColumns & {
	id: string;
	sku_id: string;
	warehouse_id: string;
	available_qty: number;
	locked_qty: number;
	physical_qty: number;
	inbound_qty: number;
	safety_qty: number;
	version: number;
	updated_at: Timestamp;
};

export type InventoryLocksTable = SiteDimensionColumns & {
	id: string;
	order_id: string;
	order_item_id: string;
	sku_id: string;
	warehouse_id: string;
	quantity: number;
	status: InventoryLockStatus;
	expires_at: Timestamp;
	released_at: Timestamp | null;
	deducted_at: Timestamp | null;
	idempotency_key: string;
	created_at: Timestamp;
};

export type InventoryTransactionsTable = SiteDimensionColumns & {
	id: string;
	sku_id: string;
	warehouse_id: string;
	order_id: string | null;
	type: InventoryTransactionType;
	quantity: number;
	before_available: number;
	after_available: number;
	before_locked: number;
	after_locked: number;
	before_physical: number;
	after_physical: number;
	idempotency_key: string;
	created_at: Timestamp;
};

export type FulfillmentOrdersTable = SiteDimensionColumns & {
	id: string;
	order_id: string;
	fulfillment_no: string;
	warehouse_id: string | null;
	status: FulfillmentOrderStatus;
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type ShipmentsTable = SiteDimensionColumns & {
	id: string;
	fulfillment_order_id: string;
	provider_id: string;
	tracking_no: string;
	status: ShipmentStatus;
	shipped_at: Timestamp | null;
	delivered_at: Timestamp | null;
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type AfterSalesRequestsTable = SiteDimensionColumns & {
	id: string;
	order_id: string;
	user_id: string | null;
	request_no: string;
	type: AfterSalesRequestType;
	status: AfterSalesRequestStatus;
	reason: string;
	requested_amount: DecimalString | null;
	approved_amount: DecimalString | null;
	idempotency_key: string | null;
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type DomainEventsTable = SiteDimensionColumns & {
	id: string;
	event_type: string;
	aggregate_type: string;
	aggregate_id: string;
	payload: unknown;
	status: "pending" | "processing" | "processed" | "failed" | "dead_letter";
	retry_count: number;
	next_retry_at: Timestamp | null;
	created_at: Timestamp;
	processed_at: Timestamp | null;
};

export type AnalyticsEventsTable = SiteDimensionColumns & {
	id: string;
	event_type: string;
	subject_type: string | null;
	subject_id: string | null;
	user_id: string | null;
	guest_token: string | null;
	order_id: string | null;
	product_id: string | null;
	sku_id: string | null;
	channel_code: string | null;
	currency: string | null;
	amount: DecimalString | null;
	properties: unknown;
	idempotency_key: string;
	occurred_at: Timestamp;
	created_at: Timestamp;
};

export type DailySalesStatsTable = SiteDimensionColumns & {
	id: string;
	stat_date: string;
	scope_type: AnalyticsScopeType;
	scope_key: string;
	currency: string;
	gmv_amount: DecimalString;
	net_sales_amount: DecimalString;
	refund_amount: DecimalString;
	chargeback_amount: DecimalString;
	order_count: number;
	paid_order_count: number;
	refunded_order_count: number;
	chargeback_count: number;
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type ChannelPerformanceStatsTable = SiteDimensionColumns & {
	id: string;
	stat_date: string;
	scope_type: AnalyticsScopeType;
	scope_key: string;
	channel_code: string;
	currency: string;
	order_count: number;
	gmv_amount: DecimalString;
	net_sales_amount: DecimalString;
	refund_amount: DecimalString;
	chargeback_amount: DecimalString;
	ad_spend_amount: DecimalString;
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type ProductPerformanceStatsTable = SiteDimensionColumns & {
	id: string;
	stat_date: string;
	scope_type: AnalyticsScopeType;
	scope_key: string;
	product_id: string;
	sku_id: string;
	currency: string;
	units_sold: number;
	order_count: number;
	gmv_amount: DecimalString;
	net_sales_amount: DecimalString;
	refund_amount: DecimalString;
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type CustomerLtvStatsTable = SiteDimensionColumns & {
	id: string;
	scope_type: AnalyticsScopeType;
	scope_key: string;
	customer_identity_type: "user" | "guest";
	customer_identity_key: string;
	user_id: string | null;
	guest_token: string | null;
	currency: string;
	first_order_at: Timestamp;
	last_order_at: Timestamp;
	order_count: number;
	gross_sales_amount: DecimalString;
	net_sales_amount: DecimalString;
	refund_amount: DecimalString;
	created_at: Timestamp;
	updated_at: Timestamp;
};

export type AuditLogsTable = SiteDimensionColumns & {
	id: string;
	actor_type: "user" | "admin" | "system";
	actor_id: string | null;
	action: string;
	resource_type: string;
	resource_id: string | null;
	before_snapshot: unknown | null;
	after_snapshot: unknown | null;
	ip_address: string | null;
	user_agent: string | null;
	request_id: string | null;
	created_at: Timestamp;
};

export type AdminOperationLogsTable = SiteDimensionColumns & {
	id: string;
	admin_user_id: string;
	action: string;
	resource_type: string;
	resource_id: string | null;
	before_snapshot: unknown | null;
	after_snapshot: unknown | null;
	ip_address: string | null;
	user_agent: string | null;
	request_id: string | null;
	created_at: Timestamp;
};

export type AdminUserScopesTable = {
	id: string;
	admin_user_id: string;
	scope_type: AdminScopeType;
	scope_id: string | null;
	created_at: Timestamp;
};

export type DatabaseSchema = {
	users: UsersTable;
	site_customers: SiteCustomersTable;
	site_customer_addresses: SiteCustomerAddressesTable;
	verticals: VerticalsTable;
	brands: BrandsTable;
	sites: SitesTable;
	site_domains: SiteDomainsTable;
	site_configs: SiteConfigsTable;
	vertical_attributes: VerticalAttributesTable;
	vertical_attribute_options: VerticalAttributeOptionsTable;
	product_attribute_values: ProductAttributeValuesTable;
	orders: OrdersTable;
	order_items: OrderItemsTable;
	order_status_logs: OrderStatusLogsTable;
	payment_orders: PaymentOrdersTable;
	payment_transactions: PaymentTransactionsTable;
	payment_webhook_events: PaymentWebhookEventsTable;
	payment_refunds: PaymentRefundsTable;
	payment_chargebacks: PaymentChargebacksTable;
	sku_inventory: SkuInventoryTable;
	inventory_locks: InventoryLocksTable;
	inventory_transactions: InventoryTransactionsTable;
	fulfillment_orders: FulfillmentOrdersTable;
	shipments: ShipmentsTable;
	after_sales_requests: AfterSalesRequestsTable;
	domain_events: DomainEventsTable;
	analytics_events: AnalyticsEventsTable;
	daily_sales_stats: DailySalesStatsTable;
	channel_performance_stats: ChannelPerformanceStatsTable;
	product_performance_stats: ProductPerformanceStatsTable;
	customer_ltv_stats: CustomerLtvStatsTable;
	audit_logs: AuditLogsTable;
	admin_operation_logs: AdminOperationLogsTable;
	admin_user_scopes: AdminUserScopesTable;
};
