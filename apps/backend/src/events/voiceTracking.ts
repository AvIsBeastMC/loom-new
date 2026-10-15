// handlers.ts
import { EmbedBuilder, type ApplicationCommandDataResolvable, type GuildTextBasedChannel } from "discord.js";
import { prisma } from "../db";
import type { ClientType } from "../new";
import commandHandlers from "../commands/commandHandlers";
import errorLogger from "../middleware/errorLogger";
import moment from "moment";
import chalk from "chalk";
import cn from "classnames";
import isProductivityVC from "../hooks/isProductivityVC";
import { getServerWideTestMode } from "../hooks/getTestMode";

// hooks
const closeActiveSessions = async ({ userId, guildId, client }: { userId: string, guildId: string, client: ClientType }) => {
  try {
    const now = new Date();

    const activeSession = await prisma.voiceSession.findFirst({
      where: {
        guildId,
        userId,
        status: "ACTIVE",
      },
    });

    if (!activeSession) return;

    const durationSeconds = Math.max(
      0,
      Math.floor((now.getTime() - activeSession.joinedAt.getTime()) / 1000)
    );

    // Realtime fires an UPDATE event
    await prisma.voiceSession.update({
      where: { id: activeSession.id },
      data: {
        status: "PAST",
        leftAt: now,
        durationSeconds,
      },
    });
  } catch (error) {
    errorLogger({ errMessage: "Something failed at closeActiveSessions", where: "/src/events/voiceTracking.ts" });
    console.log(error);
    return;
  }
};

// Helper: Start a new active session
const openActiveSession = async ({ userId, guildId, client, newChannelId }: { userId: string, guildId: string, newChannelId: string, client: ClientType }) => {
  const now = new Date();

  try {
    // Ensure DiscordServer record exists in DB to prevent foreign key errors
    await prisma.discordServer.upsert({
      where: { id: guildId },
      update: {},
      create: { id: guildId },
    });

    await prisma.voiceSession.create({
      data: {
        guildId: guildId,
        userId: userId,
        channelId: newChannelId,
        status: "ACTIVE",
        joinedAt: now,
        leftAt: null,
      },
    });
  } catch (error) {
    errorLogger({ errMessage: "Couldn't create new session... has the record already been created?", where: "openActiveSession | /src/events/voiceTracking.ts" });
    console.log(error);
  }
  // Realtime fires an INSERT event
};

export function registerVoiceTracking(client: ClientType) {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (getServerWideTestMode()) return console.log('[ALLTESTMODE ENABLED] Quitting VoiceStateUpdate Inherent - Record VC Sessions Function.');

    try {
      const userId = newState.id;
      const guildId = newState.guild.id;
      const oldChannelId = oldState.channelId;
      const newChannelId = newState.channelId;

      if (newState.member?.user.bot || oldChannelId === newChannelId) return;

      if ((oldChannelId == null && newChannelId)) {
        // New connection to VC
        console.log(chalk.white(cn(
          chalk.bgGreen.black.bold(" JOIN "),
          chalk.gray(moment().format("lll")),
          chalk.bold(newState.member?.user.displayName ?? newState.member?.user.username),
          chalk.gray(`(@${newState.member?.user.username})`),
        )));

        await closeActiveSessions({ userId, guildId, client });
        const isProductive = await isProductivityVC({ channelId: newChannelId })
        if (isProductive) await openActiveSession({ client, guildId, userId, newChannelId })
      } else if ((oldChannelId && newChannelId)) {
        // Moved to another VC
        console.log(chalk.white(cn(
          chalk.bgBlue.white.bold(" MOVE "),
          chalk.gray(moment().format("lll")),
          chalk.bold(newState.member?.user.displayName ?? newState.member?.user.username),
          chalk.gray(`(@${newState.member?.user.username})`),
        )));

        await closeActiveSessions({ userId, guildId, client });
        const isProductive = await isProductivityVC({ channelId: newChannelId })
        if (isProductive) await openActiveSession({ client, guildId, userId, newChannelId })
      } else if ((oldChannelId && !newChannelId)) {
        // Disconnected from VC, stop all active sessions
        console.log(chalk.white(cn(
          chalk.bgRed.white.bold(" LEFT "),
          chalk.gray(moment().format("lll")),
          chalk.bold(newState.member?.user.displayName ?? newState.member?.user.username),
          chalk.gray(`(@${newState.member?.user.username})`),
        )));

        await closeActiveSessions({ userId, guildId, client });
      } else if ((!oldChannelId && !newChannelId)) {
        console.log(chalk.white(cn(
          chalk.bgRed.white.bold(" LEFT "),
          chalk.gray(moment().format("lll")),
          chalk.bold(newState.member?.user.displayName ?? newState.member?.user.username),
          chalk.gray(`(@${newState.member?.user.username})`),
        )));

        await closeActiveSessions({ userId, guildId, client });
      }
    } catch (error) {
      errorLogger({ errMessage: "voiceStateUpdate MASTER function", where: "/src/events/voiceTracking.ts" });
      console.log(error);
      return;
    }
  });
}