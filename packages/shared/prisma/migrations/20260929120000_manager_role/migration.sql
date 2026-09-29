-- AlterEnum (additive: existing users keep their role; managers are granted
-- manually in the database, never through the app)
ALTER TYPE "Role" ADD VALUE 'manager';
