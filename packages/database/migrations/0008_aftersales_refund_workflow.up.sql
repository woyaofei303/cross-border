ALTER TABLE after_sales_requests
  ADD COLUMN idempotency_key VARCHAR(128);

CREATE UNIQUE INDEX ux_after_sales_requests_site_idempotency
  ON after_sales_requests(site_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE payment_refunds
  ADD COLUMN after_sales_request_id UUID REFERENCES after_sales_requests(id);

CREATE INDEX ix_payment_refunds_after_sales_request
  ON payment_refunds(after_sales_request_id)
  WHERE after_sales_request_id IS NOT NULL;
