import { Injectable } from "@nestjs/common";
import {
	defaultSiteContext,
	type SiteContext,
} from "../../../common/site/site-context.js";
import { PgPoolService } from "../../database/pg/pg-pool.service.js";
import type { CartRepositoryPort } from "../cart.ports.js";
import type {
	CartBuyerScope,
	CartItem,
	CartRecord,
	CartSkuSnapshot,
} from "../cart.types.js";

type CartRow = {
	id: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
	user_id: string | null;
	guest_token: string | null;
	currency: string;
	country_code: string | null;
	status: CartRecord["status"];
};

type CartSkuRow = {
	sku_id: string;
	sku_code: string;
	product_id: string;
	product_title: string;
	sku_title: string | null;
	image_url: string | null;
	unit_price: string;
	currency: string;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
};

type CartItemRow = {
	cart_item_id: string;
	sku_id: string;
	sku_code: string;
	product_id: string;
	product_title: string;
	sku_title: string | null;
	image_url: string | null;
	quantity: number;
	display_unit_price: string;
	display_currency: string;
	selected: boolean;
	site_id: string | null;
	vertical_id: string | null;
	brand_id: string | null;
};

function mapCart(row: CartRow, scope: CartBuyerScope): CartRecord {
	return {
		cartId: row.id,
		siteId: row.site_id ?? scope.siteId,
		verticalId: row.vertical_id ?? scope.verticalId,
		brandId: row.brand_id ?? scope.brandId,
		...(row.user_id ? { userId: row.user_id } : {}),
		...(row.guest_token ? { guestToken: row.guest_token } : {}),
		currency: row.currency,
		...(row.country_code ? { countryCode: row.country_code } : {}),
		status: row.status,
	};
}

function mapSku(row: CartSkuRow, site: SiteContext): CartSkuSnapshot {
	return {
		skuId: row.sku_id,
		skuCode: row.sku_code,
		productId: row.product_id,
		productTitle: row.product_title,
		...(row.sku_title ? { skuTitle: row.sku_title } : {}),
		...(row.image_url ? { imageUrl: row.image_url } : {}),
		unitPrice: row.unit_price,
		currency: row.currency,
		siteId: row.site_id ?? site.siteId,
		verticalId: row.vertical_id ?? site.verticalId,
		brandId: row.brand_id ?? site.brandId,
	};
}

function mapItem(row: CartItemRow): CartItem {
	return {
		cartItemId: row.cart_item_id,
		skuId: row.sku_id,
		skuCode: row.sku_code,
		productId: row.product_id,
		productTitle: row.product_title,
		...(row.sku_title ? { skuTitle: row.sku_title } : {}),
		...(row.image_url ? { imageUrl: row.image_url } : {}),
		quantity: row.quantity,
		displayUnitPrice: row.display_unit_price,
		displayCurrency: row.display_currency,
		selected: row.selected,
		siteId: row.site_id ?? "",
		verticalId: row.vertical_id ?? "",
		brandId: row.brand_id ?? "",
	};
}

@Injectable()
export class PgCartRepository implements CartRepositoryPort {
	constructor(private readonly pool: PgPoolService) {}

	async findActiveCart(scope: CartBuyerScope): Promise<CartRecord | null> {
		const result = scope.userId
			? await this.pool.getPool().query<CartRow>(
					`
            SELECT
              id,
              site_id,
              vertical_id,
              brand_id,
              user_id,
              guest_token,
              currency,
              country_code,
              status
            FROM carts
            WHERE user_id = $1
              AND status = 'active'
              AND (
                site_id = $2
                OR ($3::boolean AND site_id IS NULL)
              )
            ORDER BY updated_at DESC
            LIMIT 1
          `,
					[
						scope.userId,
						scope.siteId,
						scope.allowLegacyNullScope ?? false,
					],
				)
			: await this.pool.getPool().query<CartRow>(
					`
            SELECT
              id,
              site_id,
              vertical_id,
              brand_id,
              user_id,
              guest_token,
              currency,
              country_code,
              status
            FROM carts
            WHERE guest_token = $1
              AND status = 'active'
              AND (
                site_id = $2
                OR ($3::boolean AND site_id IS NULL)
              )
            ORDER BY updated_at DESC
            LIMIT 1
          `,
					[
						scope.guestToken,
						scope.siteId,
						scope.allowLegacyNullScope ?? false,
					],
				);
		const row = result.rows[0];

		return row ? mapCart(row, scope) : null;
	}

	async createCart(input: {
		scope: CartBuyerScope;
		currency: string;
		countryCode?: string;
	}): Promise<CartRecord> {
		const result = await this.pool.getPool().query<CartRow>(
			`
        INSERT INTO carts (
          site_id,
          vertical_id,
          brand_id,
          user_id,
          guest_token,
          currency,
          country_code,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
        RETURNING
          id,
          site_id,
          vertical_id,
          brand_id,
          user_id,
          guest_token,
          currency,
          country_code,
          status
      `,
			[
				input.scope.siteId,
				input.scope.verticalId,
				input.scope.brandId,
				input.scope.userId ?? null,
				input.scope.guestToken ?? null,
				input.currency,
				input.countryCode ?? null,
			],
		);
		const row = result.rows[0];

		if (!row) {
			throw new Error("Failed to create cart.");
		}

		return mapCart(row, input.scope);
	}

	async findSkuForSite(input: {
		site: SiteContext;
		skuId: string;
		currency: string;
	}): Promise<CartSkuSnapshot | null> {
		const allowLegacyNullScope = input.site.siteCode === "default-site";
		const result = await this.pool.getPool().query<CartSkuRow>(
			`
        SELECT
          product_skus.id AS sku_id,
          product_skus.sku_code,
          products.id AS product_id,
          products.title AS product_title,
          product_skus.title AS sku_title,
          product_media.url AS image_url,
          COALESCE(sku_prices.sale_price, sku_prices.list_price)::text AS unit_price,
          sku_prices.currency,
          products.site_id,
          products.vertical_id,
          products.brand_id
        FROM product_skus
        JOIN products
          ON products.id = product_skus.product_id
         AND products.status = 'active'
         AND (
           products.site_id = $2
           OR ($5::boolean AND products.site_id IS NULL)
         )
         AND (
           products.vertical_id = $3
           OR ($5::boolean AND products.vertical_id IS NULL)
         )
         AND (
           products.brand_id = $4
           OR ($5::boolean AND products.brand_id IS NULL)
         )
        LEFT JOIN LATERAL (
          SELECT url
          FROM product_media
          WHERE product_media.product_id = products.id
            AND product_media.media_type = 'image'
            AND (
              product_media.site_id = $2
              OR ($5::boolean AND product_media.site_id IS NULL)
            )
          ORDER BY product_media.sort_order ASC, product_media.created_at ASC
          LIMIT 1
        ) product_media ON TRUE
        JOIN LATERAL (
          SELECT currency, list_price, sale_price
          FROM sku_prices
          WHERE sku_prices.sku_id = product_skus.id
            AND sku_prices.currency = $6
            AND (
              sku_prices.site_id = $2
              OR ($5::boolean AND sku_prices.site_id IS NULL)
            )
          ORDER BY sku_prices.region_code NULLS FIRST, sku_prices.created_at DESC
          LIMIT 1
        ) sku_prices ON TRUE
        WHERE product_skus.id = $1
          AND product_skus.status = 'active'
          AND (
            product_skus.site_id = $2
            OR ($5::boolean AND product_skus.site_id IS NULL)
          )
          AND (
            product_skus.vertical_id = $3
            OR ($5::boolean AND product_skus.vertical_id IS NULL)
          )
          AND (
            product_skus.brand_id = $4
            OR ($5::boolean AND product_skus.brand_id IS NULL)
          )
        LIMIT 1
      `,
			[
				input.skuId,
				input.site.siteId,
				input.site.verticalId,
				input.site.brandId,
				allowLegacyNullScope,
				input.currency,
			],
		);
		const row = result.rows[0];

		return row ? mapSku(row, input.site) : null;
	}

	async upsertItem(input: {
		cart: CartRecord;
		sku: CartSkuSnapshot;
		quantity: number;
	}): Promise<void> {
		await this.pool.getPool().query(
			`
        INSERT INTO cart_items (
          cart_id,
          site_id,
          vertical_id,
          brand_id,
          sku_id,
          quantity,
          display_unit_price,
          display_currency,
          selected
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
        ON CONFLICT (cart_id, sku_id)
        DO UPDATE SET
          quantity = cart_items.quantity + EXCLUDED.quantity,
          display_unit_price = EXCLUDED.display_unit_price,
          display_currency = EXCLUDED.display_currency,
          site_id = EXCLUDED.site_id,
          vertical_id = EXCLUDED.vertical_id,
          brand_id = EXCLUDED.brand_id,
          selected = TRUE,
          updated_at = now()
      `,
			[
				input.cart.cartId,
				input.cart.siteId,
				input.cart.verticalId,
				input.cart.brandId,
				input.sku.skuId,
				input.quantity,
				input.sku.unitPrice,
				input.sku.currency,
			],
		);
	}

	async removeItem(input: { cart: CartRecord; skuId: string }): Promise<void> {
		await this.pool.getPool().query(
			`
        DELETE FROM cart_items
        WHERE cart_id = $1
          AND sku_id = $2
          AND (
            site_id = $3
            OR ($4::boolean AND site_id IS NULL)
          )
      `,
			[
				input.cart.cartId,
				input.skuId,
				input.cart.siteId,
				input.cart.siteId === defaultSiteContext.siteId,
			],
		);
	}

	async updateItemQuantity(input: {
		cart: CartRecord;
		skuId: string;
		quantity: number;
	}): Promise<void> {
		await this.pool.getPool().query(
			`
        UPDATE cart_items
        SET
          quantity = $3,
          updated_at = now()
        WHERE cart_id = $1
          AND sku_id = $2
          AND (
            site_id = $4
            OR ($5::boolean AND site_id IS NULL)
          )
      `,
			[
				input.cart.cartId,
				input.skuId,
				input.quantity,
				input.cart.siteId,
				input.cart.siteId === defaultSiteContext.siteId,
			],
		);
	}

	async listItems(cartId: string): Promise<CartItem[]> {
		const result = await this.pool.getPool().query<CartItemRow>(
			`
        SELECT
          cart_items.id AS cart_item_id,
          cart_items.sku_id,
          product_skus.sku_code,
          products.id AS product_id,
          products.title AS product_title,
          product_skus.title AS sku_title,
          product_media.url AS image_url,
          cart_items.quantity,
          cart_items.display_unit_price::text,
          cart_items.display_currency,
          cart_items.selected,
          COALESCE(cart_items.site_id, carts.site_id) AS site_id,
          COALESCE(cart_items.vertical_id, carts.vertical_id) AS vertical_id,
          COALESCE(cart_items.brand_id, carts.brand_id) AS brand_id
        FROM cart_items
        JOIN carts ON carts.id = cart_items.cart_id
        JOIN product_skus ON product_skus.id = cart_items.sku_id
        JOIN products ON products.id = product_skus.product_id
        LEFT JOIN LATERAL (
          SELECT url
          FROM product_media
          WHERE product_media.product_id = products.id
            AND product_media.media_type = 'image'
            AND (
              product_media.site_id = COALESCE(cart_items.site_id, carts.site_id)
              OR product_media.site_id IS NULL
            )
          ORDER BY product_media.sort_order ASC, product_media.created_at ASC
          LIMIT 1
        ) product_media ON TRUE
        WHERE cart_items.cart_id = $1
        ORDER BY cart_items.created_at ASC
      `,
			[cartId],
		);

		return result.rows.map(mapItem);
	}
}
