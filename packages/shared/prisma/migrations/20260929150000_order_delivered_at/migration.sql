-- AlterTable (additive, nullable — no existing row is invalidated)
ALTER TABLE "orders" ADD COLUMN "deliveredAt" TIMESTAMP(3);

-- Backfill: orders already delivered had no timestamp. Their "updatedAt" is the
-- moment the status last changed, which for a normal order is the delivery — an
-- approximation, but better than blank for the manager's delivery-time export.
UPDATE "orders" SET "deliveredAt" = "updatedAt" WHERE "status" = 'delivered';
