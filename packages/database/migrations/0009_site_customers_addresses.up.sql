CREATE TABLE site_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_user_id UUID REFERENCES users(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  vertical_id UUID NOT NULL REFERENCES verticals(id),
  brand_id UUID NOT NULL REFERENCES brands(id),
  guest_token VARCHAR(128),
  email VARCHAR(255),
  phone VARCHAR(64),
  nickname VARCHAR(128),
  membership_level VARCHAR(64) NOT NULL DEFAULT 'standard',
  points INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('active', 'disabled', 'blocked')),
  CHECK (points >= 0),
  CHECK (
    global_user_id IS NOT NULL
    OR guest_token IS NOT NULL
    OR email IS NOT NULL
    OR phone IS NOT NULL
  )
);

CREATE UNIQUE INDEX ux_site_customers_global_user
  ON site_customers(site_id, global_user_id)
  WHERE global_user_id IS NOT NULL;

CREATE UNIQUE INDEX ux_site_customers_guest
  ON site_customers(site_id, guest_token)
  WHERE guest_token IS NOT NULL;

CREATE INDEX ix_site_customers_site_created
  ON site_customers(site_id, created_at DESC);

CREATE INDEX ix_site_customers_vertical_created
  ON site_customers(vertical_id, created_at DESC);

CREATE INDEX ix_site_customers_brand_created
  ON site_customers(brand_id, created_at DESC);

CREATE INDEX ix_site_customers_email
  ON site_customers(site_id, lower(email))
  WHERE email IS NOT NULL;

CREATE TABLE site_customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_customer_id UUID NOT NULL REFERENCES site_customers(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id),
  vertical_id UUID NOT NULL REFERENCES verticals(id),
  brand_id UUID NOT NULL REFERENCES brands(id),
  label VARCHAR(64),
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  phone VARCHAR(64),
  country_code VARCHAR(8) NOT NULL,
  region VARCHAR(120),
  city VARCHAR(120) NOT NULL,
  postal_code VARCHAR(32) NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_site_customer_addresses_default
  ON site_customer_addresses(site_customer_id)
  WHERE is_default = TRUE;

CREATE INDEX ix_site_customer_addresses_customer
  ON site_customer_addresses(site_customer_id, created_at DESC);

CREATE INDEX ix_site_customer_addresses_site
  ON site_customer_addresses(site_id, created_at DESC);

WITH default_dimensions AS (
  SELECT
    sites.id AS site_id,
    sites.vertical_id,
    sites.brand_id
  FROM sites
  WHERE sites.code = 'default-site'
  LIMIT 1
)
INSERT INTO site_customers (
  global_user_id,
  site_id,
  vertical_id,
  brand_id,
  email,
  phone,
  status,
  created_at,
  updated_at
)
SELECT
  users.id,
  COALESCE(users.site_id, default_dimensions.site_id),
  COALESCE(users.vertical_id, default_dimensions.vertical_id),
  COALESCE(users.brand_id, default_dimensions.brand_id),
  users.email,
  users.phone,
  users.status,
  users.created_at,
  users.updated_at
FROM users
CROSS JOIN default_dimensions
ON CONFLICT DO NOTHING;

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
  is_default,
  created_at,
  updated_at
)
SELECT
  site_customers.id,
  site_customers.site_id,
  site_customers.vertical_id,
  site_customers.brand_id,
  'Default',
  COALESCE(users.email, 'unknown@example.com'),
  user_addresses.recipient_name,
  user_addresses.recipient_phone,
  user_addresses.country_code,
  user_addresses.province,
  user_addresses.city,
  COALESCE(user_addresses.postal_code, ''),
  user_addresses.address_line1,
  user_addresses.address_line2,
  user_addresses.is_default,
  user_addresses.created_at,
  user_addresses.updated_at
FROM user_addresses
JOIN site_customers
  ON site_customers.global_user_id = user_addresses.user_id
JOIN users
  ON users.id = user_addresses.user_id
ON CONFLICT DO NOTHING;
