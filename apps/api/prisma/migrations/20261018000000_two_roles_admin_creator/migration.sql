-- Safe Zero-Data-Loss Migration: Restrict UserRole to ADMIN and CREATOR only

-- 1. Migrate obsolete roles in existing records
-- Map existing REVIEWER accounts to ADMIN to preserve review history and permissions
UPDATE "User" SET "role" = 'ADMIN'::text::"UserRole" WHERE "role"::text = 'REVIEWER';

-- Map BACKER or any other non-admin role to CREATOR
UPDATE "User" SET "role" = 'CREATOR'::text::"UserRole" WHERE "role"::text NOT IN ('ADMIN', 'CREATOR');

-- 2. Update default on User table
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

-- 3. Create the new enum type with exactly ADMIN and CREATOR
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'CREATOR');

-- 4. Cast column to new enum type
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");

-- 5. Drop the old enum and rename new enum
DROP TYPE "UserRole";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";

-- 6. Set new default to CREATOR
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CREATOR';
