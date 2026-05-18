CREATE TABLE verticals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('active', 'inactive', 'archived')),
  CHECK (code = lower(code)),
  CHECK (code ~ '^[a-z0-9][a-z0-9_-]{1,62}[a-z0-9]$')
);

CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  logo_url TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('active', 'inactive', 'archived')),
  CHECK (code = lower(code)),
  CHECK (code ~ '^[a-z0-9][a-z0-9_-]{1,62}[a-z0-9]$')
);

CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id UUID NOT NULL REFERENCES verticals(id),
  brand_id UUID NOT NULL REFERENCES brands(id),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  default_domain VARCHAR(255) NOT NULL UNIQUE,
  default_language VARCHAR(16) NOT NULL DEFAULT 'en-US',
  default_currency CHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('active', 'inactive', 'archived')),
  CHECK (code = lower(code)),
  CHECK (code ~ '^[a-z0-9][a-z0-9_-]{1,62}[a-z0-9]$'),
  CHECK (default_currency = upper(default_currency))
);

CREATE INDEX ix_sites_vertical ON sites(vertical_id, status);
CREATE INDEX ix_sites_brand ON sites(brand_id, status);

CREATE TABLE site_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id),
  domain VARCHAR(255) NOT NULL UNIQUE,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status IN ('active', 'inactive')),
  CHECK (domain = lower(domain))
);

CREATE UNIQUE INDEX ux_site_domains_primary
  ON site_domains(site_id)
  WHERE is_primary = TRUE;

CREATE INDEX ix_site_domains_site ON site_domains(site_id, status);

CREATE TABLE site_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL UNIQUE REFERENCES sites(id),
  theme VARCHAR(64) NOT NULL DEFAULT 'default',
  logo_url TEXT,
  primary_color VARCHAR(32),
  homepage_layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled_languages TEXT[] NOT NULL DEFAULT ARRAY['en-US'],
  enabled_currencies TEXT[] NOT NULL DEFAULT ARRAY['USD'],
  payment_channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  shipping_countries TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  analytics_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  pixel_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO verticals (
  id,
  code,
  name,
  description,
  status
)
VALUES (
  '00000000-0000-4000-8000-000000000101',
  'default',
  'Default Vertical',
  'Default vertical for migrated single-site commerce data.',
  'active'
);

INSERT INTO brands (
  id,
  code,
  name,
  status
)
VALUES (
  '00000000-0000-4000-8000-000000000201',
  'default',
  'Default Brand',
  'active'
);

INSERT INTO sites (
  id,
  vertical_id,
  brand_id,
  code,
  name,
  default_domain,
  default_language,
  default_currency,
  status
)
VALUES (
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000201',
  'default-site',
  'Default Site',
  'localhost',
  'en-US',
  'USD',
  'active'
);

INSERT INTO site_domains (
  id,
  site_id,
  domain,
  is_primary,
  status
)
VALUES (
  '00000000-0000-4000-8000-000000000401',
  '00000000-0000-4000-8000-000000000301',
  'localhost',
  TRUE,
  'active'
);

INSERT INTO site_configs (
  id,
  site_id,
  theme,
  primary_color,
  homepage_layout,
  enabled_languages,
  enabled_currencies,
  payment_channels,
  shipping_countries,
  seo_title,
  seo_description,
  seo_keywords,
  analytics_config,
  pixel_config
)
VALUES (
  '00000000-0000-4000-8000-000000000501',
  '00000000-0000-4000-8000-000000000301',
  'default',
  '#17221b',
  '{}'::jsonb,
  ARRAY['en-US'],
  ARRAY['USD'],
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  'Default Site',
  'Default site migrated from the original single-site storefront.',
  ARRAY[]::TEXT[],
  '{}'::jsonb,
  '{}'::jsonb
);
