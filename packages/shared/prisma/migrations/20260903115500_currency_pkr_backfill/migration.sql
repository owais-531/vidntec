-- Point the single-row store config at the new default currency.
-- (orders / pending_checkouts pick up 'pkr' from the column default going
-- forward; none predate this change.)
UPDATE "store_settings" SET "currency" = 'pkr' WHERE "currency" = 'usd';
