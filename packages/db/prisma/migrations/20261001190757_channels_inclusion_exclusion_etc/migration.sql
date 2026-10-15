-- CreateEnum
CREATE TYPE "VOICE_CHANNEL_PURPOSE" AS ENUM ('PRODUCTIVITY', 'NONE');

-- CreateEnum
CREATE TYPE "VOICE_CHANNEL_TYPE" AS ENUM ('ANY', 'CAM_ONLY', 'CAM_SCREENSHARE');

-- CreateTable
CREATE TABLE "VoiceChannelConfiguration" (
    "id" TEXT NOT NULL,
    "type" "VOICE_CHANNEL_TYPE" NOT NULL DEFAULT 'ANY',
    "purpose" "VOICE_CHANNEL_PURPOSE" NOT NULL,
    "discordServerId" TEXT NOT NULL,

    CONSTRAINT "VoiceChannelConfiguration_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "VoiceChannelConfiguration" ADD CONSTRAINT "VoiceChannelConfiguration_discordServerId_fkey" FOREIGN KEY ("discordServerId") REFERENCES "DiscordServer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
