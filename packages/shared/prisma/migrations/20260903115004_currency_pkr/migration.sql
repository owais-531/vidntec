-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "currency" SET DEFAULT 'pkr';

-- AlterTable
ALTER TABLE "pending_checkouts" ALTER COLUMN "currency" SET DEFAULT 'pkr';

-- AlterTable
ALTER TABLE "store_settings" ALTER COLUMN "currency" SET DEFAULT 'pkr';
