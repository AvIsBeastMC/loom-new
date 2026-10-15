-- CreateEnum
CREATE TYPE "LogsType" AS ENUM ('FATAL', 'WARNING', 'INFO', 'SETTINGS_SET', 'SETTINGS_CHANGE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'PAST');

-- CreateTable
CREATE TABLE "AdminAccount" (
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,

    CONSTRAINT "AdminAccount_pkey" PRIMARY KEY ("username")
);

-- CreateTable
CREATE TABLE "Violation" (
    "id" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "guildId" TEXT,
    "time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalContent" TEXT NOT NULL,

    CONSTRAINT "Violation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordServer" (
    "id" TEXT NOT NULL,
    "leaveAnnounceChannel" TEXT,
    "test_channel" TEXT,
    "test_mode" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DiscordServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Logs" (
    "id" TEXT NOT NULL,
    "discordChannel" TEXT,
    "content" TEXT NOT NULL,
    "type" "LogsType" NOT NULL,
    "serverid" TEXT NOT NULL,

    CONSTRAINT "Logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderSession" (
    "id" TEXT NOT NULL,
    "discordUserId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended" TIMESTAMP(3),
    "over" BOOLEAN NOT NULL DEFAULT false,
    "interval" TEXT NOT NULL,

    CONSTRAINT "ReminderSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMessages" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "user" JSONB NOT NULL,
    "content" TEXT NOT NULL,
    "rawData" JSONB NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildMessages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViolationReports" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "report" JSONB NOT NULL,

    CONSTRAINT "ViolationReports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_sessions" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMPTZ,
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "voice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AdminAccountToDiscordServer" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AdminAccountToDiscordServer_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminAccount_username_key" ON "AdminAccount"("username");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordServer_id_key" ON "DiscordServer"("id");

-- CreateIndex
CREATE UNIQUE INDEX "ReminderSession_discordUserId_guildId_key" ON "ReminderSession"("discordUserId", "guildId");

-- CreateIndex
CREATE INDEX "idx_voice_sessions_user" ON "voice_sessions"("guild_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_voice_sessions_channel" ON "voice_sessions"("guild_id", "channel_id");

-- CreateIndex
CREATE INDEX "idx_voice_sessions_active_user" ON "voice_sessions"("guild_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "idx_voice_sessions_recent" ON "voice_sessions"("joined_at" DESC);

-- CreateIndex
CREATE INDEX "_AdminAccountToDiscordServer_B_index" ON "_AdminAccountToDiscordServer"("B");

-- AddForeignKey
ALTER TABLE "Logs" ADD CONSTRAINT "Logs_serverid_fkey" FOREIGN KEY ("serverid") REFERENCES "DiscordServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViolationReports" ADD CONSTRAINT "ViolationReports_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "DiscordServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_sessions" ADD CONSTRAINT "voice_sessions_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "DiscordServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdminAccountToDiscordServer" ADD CONSTRAINT "_AdminAccountToDiscordServer_A_fkey" FOREIGN KEY ("A") REFERENCES "AdminAccount"("username") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AdminAccountToDiscordServer" ADD CONSTRAINT "_AdminAccountToDiscordServer_B_fkey" FOREIGN KEY ("B") REFERENCES "DiscordServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ensure publication exists (so Prisma shadow database doesn't crash)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 1. Hook the new table into Supabase Realtime's logical replication stream
ALTER PUBLICATION supabase_realtime ADD TABLE voice_sessions;

-- 2. Emit all previous column values on UPDATE so Realtime sends both old and new data to your dashboard
ALTER TABLE voice_sessions REPLICA IDENTITY FULL;

-- 3. High-efficiency partial index targeting only users currently active in VC
CREATE INDEX IF NOT EXISTS idx_voice_sessions_open 
  ON voice_sessions (guild_id, user_id) 
  WHERE status = 'ACTIVE';