CREATE TABLE admin_user_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  scope_type VARCHAR(32) NOT NULL,
  scope_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (scope_type IN ('global', 'vertical', 'brand', 'site')),
  CHECK (
    (scope_type = 'global' AND scope_id IS NULL)
    OR
    (scope_type <> 'global' AND scope_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX ux_admin_user_scopes_global
  ON admin_user_scopes(admin_user_id)
  WHERE scope_type = 'global';

CREATE UNIQUE INDEX ux_admin_user_scopes_resource
  ON admin_user_scopes(admin_user_id, scope_type, scope_id)
  WHERE scope_type <> 'global';

CREATE INDEX ix_admin_user_scopes_admin
  ON admin_user_scopes(admin_user_id, scope_type);

CREATE INDEX ix_admin_user_scopes_resource_lookup
  ON admin_user_scopes(scope_type, scope_id);

INSERT INTO admin_user_scopes (admin_user_id, scope_type, scope_id)
SELECT id, 'global', NULL
FROM admin_users
ON CONFLICT DO NOTHING;
