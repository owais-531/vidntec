-- Bring the existing single-row store config in line with the new default.
UPDATE "store_settings" SET "storeName" = 'VIDNTEC' WHERE "storeName" = 'vidntec';
