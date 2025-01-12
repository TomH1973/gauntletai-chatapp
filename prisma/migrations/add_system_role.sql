-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "systemRole" "SystemRole" NOT NULL DEFAULT 'MEMBER';

-- Create indexes
CREATE INDEX "User_systemRole_idx" ON "User"("systemRole");

-- Migrate existing admin users (optional)
-- UPDATE "User" SET "systemRole" = 'ADMIN' WHERE email LIKE '%@admin%'; 