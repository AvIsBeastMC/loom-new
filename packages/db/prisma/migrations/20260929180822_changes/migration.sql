-- CreateEnum
CREATE TYPE "USERVERIFIEDSTATUS" AS ENUM ('UNVERIFIED', 'DM_SENT', 'PENDING_APPROVAL', 'VERIFIED');

-- CreateTable
CREATE TABLE "GuildMember" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "verificationStatus" "USERVERIFIEDSTATUS" NOT NULL DEFAULT 'UNVERIFIED',

    CONSTRAINT "GuildMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMember_VerificationResponse" (
    "id" TEXT NOT NULL,
    "guildMemberId" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMember_VerificationResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildMember_VerificationResponse_guildMemberId_key" ON "GuildMember_VerificationResponse"("guildMemberId");

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "DiscordServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember_VerificationResponse" ADD CONSTRAINT "GuildMember_VerificationResponse_guildMemberId_fkey" FOREIGN KEY ("guildMemberId") REFERENCES "GuildMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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