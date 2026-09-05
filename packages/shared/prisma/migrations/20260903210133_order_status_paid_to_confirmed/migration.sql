-- Rename the OrderStatus value `paid` -> `confirmed` in place. This keeps every
-- existing order row valid (Postgres updates all uses of the value atomically).
-- COD orders are never "paid" up front, so the admin marks them "confirmed".
ALTER TYPE "OrderStatus" RENAME VALUE 'paid' TO 'confirmed';
