CREATE TABLE vertical_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id UUID NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  code VARCHAR(128) NOT NULL,
  type VARCHAR(32) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  searchable BOOLEAN NOT NULL DEFAULT FALSE,
  filterable BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (vertical_id, code),
  CHECK (type IN ('text', 'number', 'boolean', 'select', 'multiselect', 'json')),
  CHECK (status IN ('active', 'inactive', 'archived'))
);

CREATE INDEX ix_vertical_attributes_vertical
  ON vertical_attributes(vertical_id, status, sort_order);

CREATE INDEX ix_vertical_attributes_filterable
  ON vertical_attributes(vertical_id, filterable, status)
  WHERE filterable = TRUE;

CREATE TABLE vertical_attribute_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id UUID NOT NULL REFERENCES vertical_attributes(id) ON DELETE CASCADE,
  label VARCHAR(128) NOT NULL,
  value VARCHAR(128) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attribute_id, value)
);

CREATE INDEX ix_vertical_attribute_options_attribute
  ON vertical_attribute_options(attribute_id, sort_order);

CREATE TABLE product_attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES sites(id),
  vertical_id UUID NOT NULL REFERENCES verticals(id),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku_id UUID REFERENCES product_skus(id) ON DELETE CASCADE,
  attribute_id UUID NOT NULL REFERENCES vertical_attributes(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_product_attribute_values_product_attribute
  ON product_attribute_values(site_id, product_id, attribute_id)
  WHERE sku_id IS NULL;

CREATE UNIQUE INDEX ux_product_attribute_values_sku_attribute
  ON product_attribute_values(site_id, product_id, sku_id, attribute_id)
  WHERE sku_id IS NOT NULL;

CREATE INDEX ix_product_attribute_values_site_product
  ON product_attribute_values(site_id, product_id);

CREATE INDEX ix_product_attribute_values_attribute
  ON product_attribute_values(attribute_id);

INSERT INTO vertical_attributes (
  vertical_id,
  code,
  name,
  type,
  searchable,
  filterable,
  sort_order
)
SELECT verticals.id, attrs.code, attrs.name, attrs.type, attrs.searchable, attrs.filterable, attrs.sort_order
FROM verticals
CROSS JOIN (
  VALUES
    ('origin', 'Origin', 'text', TRUE, TRUE, 10),
    ('badge', 'Merchandising Badge', 'text', FALSE, TRUE, 20),
    ('ships_in', 'Dispatch Promise', 'text', FALSE, TRUE, 30)
) AS attrs(code, name, type, searchable, filterable, sort_order)
WHERE verticals.code = 'default'
ON CONFLICT (vertical_id, code) DO NOTHING;
