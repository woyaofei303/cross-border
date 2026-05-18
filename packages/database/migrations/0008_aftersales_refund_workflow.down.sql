DROP INDEX IF EXISTS ix_payment_refunds_after_sales_request;

ALTER TABLE payment_refunds
  DROP COLUMN IF EXISTS after_sales_request_id;

DROP INDEX IF EXISTS ux_after_sales_requests_site_idempotency;

ALTER TABLE after_sales_requests
  DROP COLUMN IF EXISTS idempotency_key;
