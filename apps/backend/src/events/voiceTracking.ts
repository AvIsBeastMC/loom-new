// handlers.ts
import { BaseGuildVoiceChannel, EmbedBuilder, Guild, GuildMember, VoiceState, type ApplicationCommandDataResolvable, type GuildTextBasedChannel } from "discord.js";
import { prisma } from "../db";
import type { ClientType } from "../new";
import commandHandlers from "../commands/commandHandlers";
import errorLogger from "../middleware/errorLogger";
import moment from "moment";
import chalk from "chalk";
import cn from "classnames";
import isProductivityVC from "../hooks/isProductivityVC";
import { getServerWideTestMode, getTestMode } from "../hooks/getTestMode";
import { destroyVCEnforcementJob, type VCEnforcementDataType } from "../hooks/jobs/vc-enforcement";
import { agenda } from "../hooks/cron";

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

const checkAndCreateEnforcementJob = async (member: GuildMember, guild: Guild, channel: BaseGuildVoiceChannel) => {
  // const jobs = await agenda.queryJobs({
  //   name: "vc-enforcement",
  //   data: {
  //     'guild': member.guild.id,
  //     'user': member.user.id
  //   }
  // });

  // if (jobs.jobs.length > 0) return;

  const payload: VCEnforcementDataType = {
    guild: guild.id,
    interval: "10 seconds",
    user: member.user.id,
    vcChannelId: channel.id,
    warnings: 0
  }

  // enable timer.
  const job = agenda.create('vc-enforcement', payload);
  // Only matches an existing document IF BOTH fields match
  job.unique({
    'data.user': member.user.id,
    'data.guild': guild.id
  });

  job.repeatEvery('10 seconds', { skipImmediate: true });
  await job.save();
  
  console.log(cn(chalk.bgYellow.white('VC Enforcement job created'), JSON.stringify(payload)))
};

const enforcementCheckRun = async (oldState: VoiceState, newState: VoiceState) => {
  const member = newState.member ?? oldState.member;
  const guild = newState.guild ?? oldState.guild;
  const channel = newState.channel;

  if (!member || !channel) return;

  // if its a VC which has enforcement, check db:
  const dbVC = await prisma.voiceChannelConfiguration.findUnique({
    where: {
      id: channel.id
    }
  });

  if (!dbVC) {
    await destroyVCEnforcementJob({ user: member.user.id, guildId: guild.id });
    return;
  };
  // you have to check here for cam/screenshare: if both video and screenshare are OFF, then create
  const isCamOk = !!newState.selfVideo;
  const isStreamOk = dbVC.type === 'CAM_SCREENSHARE' && !!newState.streaming;

  if (isCamOk || isStreamOk) {
    // Compliant -> cancel timers
    await destroyVCEnforcementJob({ user: member.user.id, guildId: guild.id });
  } else {
    // Non-compliant -> schedule enforcement
    await checkAndCreateEnforcementJob(member, guild, channel);
  }
}

export function registerVoiceTracking(client: ClientType) {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (getServerWideTestMode()) return console.log('[ALLTESTMODE ENABLED] Quitting VoiceStateUpdate Inherent - Record VC Sessions Function.');

    try {
      const member = newState.member ?? oldState.member;
      const userId = member?.id;
      const guildId = newState.guild?.id ?? oldState.guild?.id;
      const oldChannelId = oldState.channelId;
      const newChannelId = newState.channelId;

      if (!guildId || !member || member.user.bot || !userId) return;
      // const testmode = await getTestMode(guildId);

      if (oldChannelId === newChannelId) {
        if (oldState.selfVideo !== newState.selfVideo || oldState.streaming !== newState.streaming) {
          await enforcementCheckRun(oldState, newState);
        }
        return;
      };

      if ((oldChannelId == null && newChannelId)) {
        // 
        // 
        // New connection to VC
        // 
        // 

        console.log(chalk.white(cn(
          chalk.bgGreen.black.bold(" JOIN "),
          chalk.gray(moment().format("lll")),
          chalk.bold(newState.member?.user.displayName ?? newState.member?.user.username),
          chalk.gray(`(@${newState.member?.user.username})`),
        )));

        await destroyVCEnforcementJob({ user: userId, guildId: guildId })
        await closeActiveSessions({ userId, guildId, client });

        const isProductive = await isProductivityVC({ channelId: newChannelId })
        if (isProductive) {
          await openActiveSession({ client, guildId, userId, newChannelId })
          await enforcementCheckRun(oldState, newState);
        }
      } else if ((oldChannelId && newChannelId)) {

        // Moved to another VC
        console.log(chalk.white(cn(
          chalk.bgBlue.white.bold(" MOVE "),
          chalk.gray(moment().format("lll")),
          chalk.bold(newState.member?.user.displayName ?? newState.member?.user.username),
          chalk.gray(`(@${newState.member?.user.username})`),
        )));

        await destroyVCEnforcementJob({ user: userId, guildId: guildId })
        await closeActiveSessions({ userId, guildId, client });

        const isProductive = await isProductivityVC({ channelId: newChannelId })
        if (isProductive) {
          await openActiveSession({ client, guildId, userId, newChannelId })
          await enforcementCheckRun(oldState, newState);
        } 
      } else if ((oldChannelId && !newChannelId)) {
        const targetUserId = userId; // already extracted from newState.id
        const targetGuildId = guildId;

        await destroyVCEnforcementJob({ user: targetUserId, guildId: targetGuildId });
        await closeActiveSessions({ userId: targetUserId, guildId: targetGuildId, client });
        // Disconnected from VC, stop all active sessions
        console.log(chalk.white(cn(
          chalk.bgRed.white.bold(" LEFT "),
          chalk.gray(moment().format("lll")),
          chalk.bold(newState.member?.user.displayName ?? newState.member?.user.username),
          chalk.gray(`(@${newState.member?.user.username})`),
        )));
      } else if ((!oldChannelId && !newChannelId)) {
        console.log(chalk.white(cn(
          chalk.bgRed.white.bold(" LEFT "),
          chalk.gray(moment().format("lll")),
          chalk.bold(newState.member?.user.displayName ?? newState.member?.user.username),
          chalk.gray(`(@${newState.member?.user.username})`),
        )));

        await destroyVCEnforcementJob({ user: userId, guildId: guildId });
        await closeActiveSessions({ userId, guildId, client });
      }
    } catch (error) {
      errorLogger({ errMessage: "voiceStateUpdate MASTER function", where: "/src/events/voiceTracking.ts" });
      console.log(error);
      return;
    }
  });
}