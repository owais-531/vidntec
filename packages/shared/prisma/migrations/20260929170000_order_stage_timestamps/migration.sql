-- AlterTable (additive, nullable — no existing row is invalidated)
ALTER TABLE "orders" ADD COLUMN "confirmedAt" TIMESTAMP(3),
ADD COLUMN "shippedAt" TIMESTAMP(3);

-- Backfill (approximation): an order currently sitting in a stage entered it at
-- its last change, i.e. "updatedAt". Orders that have already moved past a stage
-- keep NULL for it — the real moment was not recorded and cannot be recovered.
UPDATE "orders" SET "confirmedAt" = "updatedAt" WHERE "status" = 'confirmed';
UPDATE "orders" SET "shippedAt" = "updatedAt" WHERE "status" = 'fulfilled';
