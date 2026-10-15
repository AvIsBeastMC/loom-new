/*
  Warnings:

  - A unique constraint covering the columns `[userId,guildId]` on the table `GuildMember` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "GuildMember_userId_guildId_key" ON "GuildMember"("userId", "guildId");


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