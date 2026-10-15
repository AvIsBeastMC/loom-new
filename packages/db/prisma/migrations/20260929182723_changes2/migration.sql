/*
  Warnings:

  - The primary key for the `GuildMember` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `GuildMember` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "GuildMember_VerificationResponse" DROP CONSTRAINT "GuildMember_VerificationResponse_guildMemberId_fkey";

-- AlterTable
ALTER TABLE "GuildMember" DROP CONSTRAINT "GuildMember_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "GuildMember_pkey" PRIMARY KEY ("userId");

-- AddForeignKey
ALTER TABLE "GuildMember_VerificationResponse" ADD CONSTRAINT "GuildMember_VerificationResponse_guildMemberId_fkey" FOREIGN KEY ("guildMemberId") REFERENCES "GuildMember"("userId") ON DELETE CASCADE ON UPDATE CASCADE;


-- Ensure publication exists (so Prisma shadow database doesn't crash)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 1. Hook the new table into Supabase Realtime's logical replication stream
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    WHERE p.pubname = 'supabase_realtime' 
      AND c.relname = 'voice_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE voice_sessions;
  END IF;
END $$;
-- 2. Emit all previous column values on UPDATE so Realtime sends both old and new data to your dashboard
ALTER TABLE voice_sessions REPLICA IDENTITY FULL;

-- 3. High-efficiency partial index targeting only users currently active in VC
CREATE INDEX IF NOT EXISTS idx_voice_sessions_open 
  ON voice_sessions (guild_id, user_id) 
  WHERE status = 'ACTIVE';