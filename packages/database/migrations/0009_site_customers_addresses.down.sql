DROP INDEX IF EXISTS ix_site_customer_addresses_site;
DROP INDEX IF EXISTS ix_site_customer_addresses_customer;
DROP INDEX IF EXISTS ux_site_customer_addresses_default;
DROP TABLE IF EXISTS site_customer_addresses;

DROP INDEX IF EXISTS ix_site_customers_email;
DROP INDEX IF EXISTS ix_site_customers_brand_created;
DROP INDEX IF EXISTS ix_site_customers_vertical_created;
DROP INDEX IF EXISTS ix_site_customers_site_created;
DROP INDEX IF EXISTS ux_site_customers_guest;
DROP INDEX IF EXISTS ux_site_customers_global_user;
DROP TABLE IF EXISTS site_customers;
