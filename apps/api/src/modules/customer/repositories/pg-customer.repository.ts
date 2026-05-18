import { Injectable } from "@nestjs/common";
import type { QueryResultRow } from "pg";
import {
	type AdminScope,
	canAccessSiteDimensions,
	hasGlobalAdminScope,
} from "../../../common/admin/admin-access.js";
import type { SiteDimensions } from "../../../common/site/site-context.js";
import { getPgClient } from "../../database/pg/pg-transaction-manager.js";
import type { TransactionContext } from "../../../common/application/application-ports.js";
import type { CustomerRepositoryPort } from "../customer.ports.js";
import type {
	AdminCustomerListInput,
	AdminCustomerListItem,
	GetSiteCustomerInput,
	GlobalUserSummary,
	SiteCustomerAddress,
	SiteCustomerAddressInput,
	SiteCustomerProfile,
	SiteCustomerSummary,
	UpsertSiteCustomerAddressInput,
	UpsertSiteCustomerInput,
} from "../customer.types.js";

type CustomerRow = QueryResultRow & {
	site_customer_id: string;
	global_user_id: string | null;
	guest_token: string | null;
	site_id: string;
	vertical_id: string;
	brand_id: string;
	customer_email: string | null;
	customer_phone: string | null;
	nickname: string | null;
	membership_level: string;
	points: number;
	customer_status: "active" | "disabled" | "blocked";
	customer_created_at: Date;
	customer_updated_at: Date;
	user_id: string | null;
	user_email: string | null;
	user_phone: string | null;
	user_status: "active" | "disabled" | "blocked" | null;
	user_type: "guest" | "registered" | null;
	risk_level: "normal" | "watch" | "high" | "blocked" | null;
	user_created_at: Date | null;
	user_updated_at: Date | null;
};

type AddressRow = QueryResultRow & {
	address_id: string;
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
	created_at: Date;
	updated_at: Date;
};

type AdminCustomerRow = CustomerRow & {
	default_address_id: string | null;
	default_address_email: string | null;
	default_full_name: string | null;
	default_phone: string | null;
	default_country_code: string | null;
	default_region: string | null;
	default_city: string | null;
	default_postal_code: string | null;
	default_address_line1: string | null;
	default_address_line2: string | null;
	default_address_created_at: Date | null;
	default_address_updated_at: Date | null;
	order_count: string | number | null;
	lifetime_spend: string | null;
	currency: string | null;
};

function toIso(value: Date | string) {
	return value instanceof Date ? value.toISOString() : value;
}

function optionalString(value: string | null | undefined) {
	return value ?? undefined;
}

function mapCustomer(row: CustomerRow): SiteCustomerSummary {
	return {
		siteCustomerId: row.site_customer_id,
		...(row.global_user_id ? { globalUserId: row.global_user_id } : {}),
		...(row.guest_token ? { guestToken: row.guest_token } : {}),
		siteId: row.site_id,
		verticalId: row.vertical_id,
		brandId: row.brand_id,
		...(row.customer_email ? { email: row.customer_email } : {}),
		...(row.customer_phone ? { phone: row.customer_phone } : {}),
		...(row.nickname ? { nickname: row.nickname } : {}),
		membershipLevel: row.membership_level,
		points: row.points,
		status: row.customer_status,
		createdAt: toIso(row.customer_created_at),
		updatedAt: toIso(row.customer_updated_at),
	};
}

function mapGlobalUser(row: CustomerRow): GlobalUserSummary | undefined {
	if (!row.user_id || !row.user_status || !row.user_type || !row.risk_level) {
		return undefined;
	}

	return {
		userId: row.user_id,
		...(row.user_email ? { email: row.user_email } : {}),
		...(row.user_phone ? { phone: row.user_phone } : {}),
		status: row.user_status,
		userType: row.user_type,
		riskLevel: row.risk_level,
		createdAt: toIso(row.user_created_at ?? row.customer_created_at),
		updatedAt: toIso(row.user_updated_at ?? row.customer_updated_at),
	};
}

function mapAddress(row: AddressRow): SiteCustomerAddress {
	return {
		addressId: row.address_id,
		siteCustomerId: row.site_customer_id,
		siteId: row.site_id,
		verticalId: row.vertical_id,
		brandId: row.brand_id,
		...(row.label ? { label: row.label } : {}),
		email: row.email,
		fullName: row.full_name,
		...(row.phone ? { phone: row.phone } : {}),
		countryCode: row.country_code,
		...(row.region ? { region: row.region } : {}),
		city: row.city,
		postalCode: row.postal_code,
		addressLine1: row.address_line1,
		...(row.address_line2 ? { addressLine2: row.address_line2 } : {}),
		isDefault: row.is_default,
		createdAt: toIso(row.created_at),
		updatedAt: toIso(row.updated_at),
	};
}

function buildAddressFromAdminRow(
	row: AdminCustomerRow,
): SiteCustomerAddress | undefined {
	if (!row.default_address_id || !row.default_address_email || !row.default_full_name) {
		return undefined;
	}

	return {
		addressId: row.default_address_id,
		siteCustomerId: row.site_customer_id,
		siteId: row.site_id,
		verticalId: row.vertical_id,
		brandId: row.brand_id,
		email: row.default_address_email,
		fullName: row.default_full_name,
		...(row.default_phone ? { phone: row.default_phone } : {}),
		countryCode: row.default_country_code ?? "",
		...(row.default_region ? { region: row.default_region } : {}),
		city: row.default_city ?? "",
		postalCode: row.default_postal_code ?? "",
		addressLine1: row.default_address_line1 ?? "",
		...(row.default_address_line2
			? { addressLine2: row.default_address_line2 }
			: {}),
		isDefault: true,
		createdAt: toIso(row.default_address_created_at ?? row.customer_created_at),
		updatedAt: toIso(row.default_address_updated_at ?? row.customer_updated_at),
	};
}

function normalizeAddress(
	address: SiteCustomerAddressInput,
): Required<Omit<SiteCustomerAddressInput, "phone" | "addressLine2" | "region" | "label">> &
	Pick<SiteCustomerAddressInput, "phone" | "addressLine2" | "region" | "label"> {
	return {
		email: address.email.trim().toLowerCase(),
		fullName: address.fullName.trim(),
		...(address.phone ? { phone: address.phone.trim() } : {}),
		countryCode: address.countryCode.trim().toUpperCase(),
		...(address.region ? { region: address.region.trim() } : {}),
		city: address.city.trim(),
		postalCode: address.postalCode.trim(),
		addressLine1: address.addressLine1.trim(),
		...(address.addressLine2 ? { addressLine2: address.addressLine2.trim() } : {}),
		...(address.label ? { label: address.label.trim() } : {}),
		isDefault: address.isDefault ?? true,
	};
}

function customerSelectSql() {
	return `
    SELECT
      site_customers.id AS site_customer_id,
      site_customers.global_user_id,
      site_customers.guest_token,
      site_customers.site_id,
      site_customers.vertical_id,
      site_customers.brand_id,
      site_customers.email AS customer_email,
      site_customers.phone AS customer_phone,
      site_customers.nickname,
      site_customers.membership_level,
      site_customers.points,
      site_customers.status AS customer_status,
      site_customers.created_at AS customer_created_at,
      site_customers.updated_at AS customer_updated_at,
      users.id AS user_id,
      users.email AS user_email,
      users.phone AS user_phone,
      users.status AS user_status,
      users.user_type,
      users.risk_level,
      users.created_at AS user_created_at,
      users.updated_at AS user_updated_at
    FROM site_customers
    LEFT JOIN users ON users.id = site_customers.global_user_id
  `;
}

async function getProfileById(
	transaction: TransactionContext,
	input: GetSiteCustomerInput,
): Promise<SiteCustomerProfile | null> {
	const client = getPgClient(transaction);
	const customerResult = await client.query<CustomerRow>(
		`${customerSelectSql()}
     WHERE site_customers.id = $1
       AND site_customers.site_id = $2
     LIMIT 1`,
		[input.siteCustomerId, input.siteId],
	);
	const row = customerResult.rows[0];

	if (!row) {
		return null;
	}

	const addressResult = await client.query<AddressRow>(
		`
      SELECT
        id AS address_id,
        site_customer_id,
        site_id,
        vertical_id,
        brand_id,
        label,
        email,
        full_name,
        phone,
        country_code,
        region,
        city,
        postal_code,
        address_line1,
        address_line2,
        is_default,
        created_at,
        updated_at
      FROM site_customer_addresses
      WHERE site_customer_id = $1
        AND site_id = $2
      ORDER BY is_default DESC, created_at DESC
    `,
		[input.siteCustomerId, input.siteId],
	);
	const addresses = addressResult.rows.map(mapAddress);
	const globalUser = mapGlobalUser(row);

	return {
		...(globalUser ? { globalUser } : {}),
		siteCustomer: mapCustomer(row),
		addresses,
		...(addresses[0] ? { defaultAddress: addresses[0] } : {}),
	};
}

function buildAdminScopePredicate(
	alias: string,
	scopes: readonly AdminScope[],
	params: unknown[],
) {
	if (hasGlobalAdminScope(scopes)) {
		return "TRUE";
	}

	const clauses: string[] = [];

	for (const scope of scopes) {
		if (scope.scopeType === "site" && scope.scopeId) {
			params.push(scope.scopeId);
			clauses.push(`${alias}.site_id = $${params.length}`);
		}

		if (scope.scopeType === "vertical" && scope.scopeId) {
			params.push(scope.scopeId);
			clauses.push(`${alias}.vertical_id = $${params.length}`);
		}

		if (scope.scopeType === "brand" && scope.scopeId) {
			params.push(scope.scopeId);
			clauses.push(`${alias}.brand_id = $${params.length}`);
		}
	}

	return clauses.length ? `(${clauses.join(" OR ")})` : "FALSE";
}

function buildSelectedScopePredicate(
	alias: string,
	scope: AdminScope | undefined,
	params: unknown[],
) {
	if (!scope || scope.scopeType === "global") {
		return "TRUE";
	}

	if (scope.scopeType === "site" && scope.scopeId) {
		params.push(scope.scopeId);
		return `${alias}.site_id = $${params.length}`;
	}

	if (scope.scopeType === "vertical" && scope.scopeId) {
		params.push(scope.scopeId);
		return `${alias}.vertical_id = $${params.length}`;
	}

	if (scope.scopeType === "brand" && scope.scopeId) {
		params.push(scope.scopeId);
		return `${alias}.brand_id = $${params.length}`;
	}

	return "FALSE";
}

@Injectable()
export class PgCustomerRepository implements CustomerRepositoryPort {
	async upsertSiteCustomerWithDefaultAddress(
		transaction: TransactionContext,
		input: UpsertSiteCustomerInput,
	): Promise<SiteCustomerProfile> {
		const client = getPgClient(transaction);
		const email = input.email.trim().toLowerCase();
		const nickname = input.nickname?.trim() || email;
		const userResult = await client.query<{ id: string }>(
			`
        INSERT INTO users (
          email,
          phone,
          status,
          user_type,
          default_currency,
          site_id,
          vertical_id,
          brand_id
        )
        VALUES ($1, $2, 'active', 'registered', 'USD', $3, $4, $5)
        ON CONFLICT (email) DO UPDATE
        SET
          phone = COALESCE(users.phone, EXCLUDED.phone),
          updated_at = now()
        RETURNING id
      `,
			[
				email,
				optionalString(input.phone),
				input.siteId,
				input.verticalId,
				input.brandId,
			],
		);
		const globalUserId = userResult.rows[0]?.id;

		if (!globalUserId) {
			throw new Error("Global user upsert did not return an id.");
		}

		const existingCustomerResult = await client.query<{ id: string }>(
			`
        SELECT id
        FROM site_customers
        WHERE site_id = $1
          AND (
            global_user_id = $2
            OR ($3::varchar IS NOT NULL AND guest_token = $3::varchar)
          )
        ORDER BY updated_at DESC
        LIMIT 1
      `,
			[input.siteId, globalUserId, input.guestToken ?? null],
		);
		const existingCustomerId = existingCustomerResult.rows[0]?.id;
		const customerResult = existingCustomerId
			? await client.query<{ id: string }>(
					`
            UPDATE site_customers
            SET
              global_user_id = $2,
              guest_token = COALESCE(guest_token, $3),
              email = $4,
              phone = $5,
              nickname = $6,
              status = 'active',
              updated_at = now()
            WHERE id = $1
            RETURNING id
          `,
					[
						existingCustomerId,
						globalUserId,
						input.guestToken ?? null,
						email,
						optionalString(input.phone),
						nickname,
					],
				)
			: await client.query<{ id: string }>(
					`
            INSERT INTO site_customers (
              global_user_id,
              site_id,
              vertical_id,
              brand_id,
              guest_token,
              email,
              phone,
              nickname,
              status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
            RETURNING id
          `,
					[
						globalUserId,
						input.siteId,
						input.verticalId,
						input.brandId,
						optionalString(input.guestToken),
						email,
						optionalString(input.phone),
						nickname,
					],
				);
		const siteCustomerId = customerResult.rows[0]?.id;

		if (!siteCustomerId) {
			throw new Error("Site customer upsert did not return an id.");
		}

		if (input.defaultAddress) {
			await this.upsertDefaultAddress(transaction, {
				siteId: input.siteId,
				verticalId: input.verticalId,
				brandId: input.brandId,
				siteCustomerId,
				address: input.defaultAddress,
			});
		}

		const profile = await getProfileById(transaction, {
			siteId: input.siteId,
			siteCustomerId,
		});

		if (!profile) {
			throw new Error("Site customer profile was not readable after upsert.");
		}

		return profile;
	}

	async upsertDefaultAddress(
		transaction: TransactionContext,
		input: UpsertSiteCustomerAddressInput,
	): Promise<SiteCustomerProfile | null> {
		const client = getPgClient(transaction);
		const customerResult = await client.query<{ id: string }>(
			`
        SELECT id
        FROM site_customers
        WHERE id = $1
          AND site_id = $2
        LIMIT 1
      `,
			[input.siteCustomerId, input.siteId],
		);

		if (!customerResult.rows[0]) {
			return null;
		}

		const address = normalizeAddress(input.address);

		await client.query(
			`
        INSERT INTO site_customer_addresses (
          site_customer_id,
          site_id,
          vertical_id,
          brand_id,
          label,
          email,
          full_name,
          phone,
          country_code,
          region,
          city,
          postal_code,
          address_line1,
          address_line2,
          is_default
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, TRUE)
        ON CONFLICT (site_customer_id) WHERE is_default = TRUE
        DO UPDATE
        SET
          label = EXCLUDED.label,
          email = EXCLUDED.email,
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          country_code = EXCLUDED.country_code,
          region = EXCLUDED.region,
          city = EXCLUDED.city,
          postal_code = EXCLUDED.postal_code,
          address_line1 = EXCLUDED.address_line1,
          address_line2 = EXCLUDED.address_line2,
          updated_at = now()
      `,
			[
				input.siteCustomerId,
				input.siteId,
				input.verticalId,
				input.brandId,
				address.label ?? "Default",
				address.email,
				address.fullName,
				address.phone ?? null,
				address.countryCode,
				address.region ?? null,
				address.city,
				address.postalCode,
				address.addressLine1,
				address.addressLine2 ?? null,
			],
		);

		return getProfileById(transaction, {
			siteId: input.siteId,
			siteCustomerId: input.siteCustomerId,
		});
	}

	async findSiteCustomerProfile(
		transaction: TransactionContext,
		input: GetSiteCustomerInput,
	): Promise<SiteCustomerProfile | null> {
		return getProfileById(transaction, input);
	}

	async listAdminCustomers(
		transaction: TransactionContext,
		input: AdminCustomerListInput,
	): Promise<AdminCustomerListItem[]> {
		const client = getPgClient(transaction);
		const params: unknown[] = [];
		const accessPredicate = buildAdminScopePredicate(
			"site_customers",
			input.adminScopes,
			params,
		);
		const selectedPredicate = buildSelectedScopePredicate(
			"site_customers",
			input.selectedScope,
			params,
		);
		const limit = input.limit ?? 100;
		params.push(limit);
		const result = await client.query<AdminCustomerRow>(
			`
        SELECT
          site_customers.id AS site_customer_id,
          site_customers.global_user_id,
          site_customers.guest_token,
          site_customers.site_id,
          site_customers.vertical_id,
          site_customers.brand_id,
          site_customers.email AS customer_email,
          site_customers.phone AS customer_phone,
          site_customers.nickname,
          site_customers.membership_level,
          site_customers.points,
          site_customers.status AS customer_status,
          site_customers.created_at AS customer_created_at,
          site_customers.updated_at AS customer_updated_at,
          users.id AS user_id,
          users.email AS user_email,
          users.phone AS user_phone,
          users.status AS user_status,
          users.user_type,
          users.risk_level,
          users.created_at AS user_created_at,
          users.updated_at AS user_updated_at,
          default_address.id AS default_address_id,
          default_address.email AS default_address_email,
          default_address.full_name AS default_full_name,
          default_address.phone AS default_phone,
          default_address.country_code AS default_country_code,
          default_address.region AS default_region,
          default_address.city AS default_city,
          default_address.postal_code AS default_postal_code,
          default_address.address_line1 AS default_address_line1,
          default_address.address_line2 AS default_address_line2,
          default_address.created_at AS default_address_created_at,
          default_address.updated_at AS default_address_updated_at,
	          order_stats.order_count,
	          order_stats.lifetime_spend,
	          order_stats.currency
        FROM site_customers
        LEFT JOIN users ON users.id = site_customers.global_user_id
        LEFT JOIN LATERAL (
          SELECT *
          FROM site_customer_addresses
          WHERE site_customer_addresses.site_customer_id = site_customers.id
          ORDER BY is_default DESC, created_at DESC
          LIMIT 1
        ) AS default_address ON TRUE
	        LEFT JOIN LATERAL (
	          SELECT
	            COUNT(*) AS order_count,
	            COALESCE(SUM(orders.total_amount), 0)::TEXT AS lifetime_spend,
	            MAX(orders.currency) AS currency
	          FROM orders
	          WHERE orders.site_id = site_customers.site_id
	            AND (
	              (site_customers.global_user_id IS NOT NULL AND orders.user_id = site_customers.global_user_id)
	              OR (site_customers.guest_token IS NOT NULL AND orders.guest_token = site_customers.guest_token)
	            )
	        ) AS order_stats ON TRUE
	        WHERE ${accessPredicate}
	          AND ${selectedPredicate}
	        ORDER BY site_customers.created_at DESC
        LIMIT $${params.length}
      `,
			params,
		);

		return result.rows.map((row) => {
			const dimensions: SiteDimensions = {
				siteId: row.site_id,
				verticalId: row.vertical_id,
				brandId: row.brand_id,
			};

			if (!canAccessSiteDimensions(input.adminScopes, dimensions)) {
				throw new Error("Admin customer query returned out-of-scope row.");
			}

			const globalUser = mapGlobalUser(row);
			const defaultAddress = buildAddressFromAdminRow(row);

			return {
				...mapCustomer(row),
				...(globalUser ? { globalUser } : {}),
				...(defaultAddress ? { defaultAddress } : {}),
				orderCount: Number(row.order_count ?? 0),
				lifetimeSpend: row.lifetime_spend ?? "0.00",
				...(row.currency ? { currency: row.currency } : {}),
			};
		});
	}
}
