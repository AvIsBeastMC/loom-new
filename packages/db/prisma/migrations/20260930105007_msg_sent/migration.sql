/*
  Warnings:

  - The values [DM_SENT] on the enum `USERVERIFIEDSTATUS` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "USERVERIFIEDSTATUS_new" AS ENUM ('UNVERIFIED', 'MSG_SENT', 'PENDING_APPROVAL', 'VERIFIED');
ALTER TABLE "public"."GuildMember" ALTER COLUMN "verificationStatus" DROP DEFAULT;
ALTER TABLE "GuildMember" ALTER COLUMN "verificationStatus" TYPE "USERVERIFIEDSTATUS_new" USING ("verificationStatus"::text::"USERVERIFIEDSTATUS_new");
ALTER TYPE "USERVERIFIEDSTATUS" RENAME TO "USERVERIFIEDSTATUS_old";
ALTER TYPE "USERVERIFIEDSTATUS_new" RENAME TO "USERVERIFIEDSTATUS";
DROP TYPE "public"."USERVERIFIEDSTATUS_old";
ALTER TABLE "GuildMember" ALTER COLUMN "verificationStatus" SET DEFAULT 'UNVERIFIED';
COMMIT;
