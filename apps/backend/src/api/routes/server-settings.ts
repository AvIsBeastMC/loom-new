import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { prisma } from '../../db';
import getDiscordGuild, { getDiscordGuildCached } from '../../hooks/getDiscordGuild';
import { agenda } from '../../hooks/cron';
import { store } from '../../store';
import fs from 'fs/promises'
import path from 'path';
import { fileURLToPath } from 'url';

const router: ExpressRouter = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.post('/server_settings/set-short-name', async (req, res) => {
  const validation = z.object({
    username: z.string(),
    guildId: z.string(),
    shortName: z.string().trim().max(12).refine((value) => value.length === 0 || value.length >= 2, {
      message: 'Short name must be empty or between 2 and 12 characters',
    }),
  }).safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0]?.message ?? 'Invalid request body' });
  }

  const { username, guildId, shortName } = validation.data;
  try {
    const admin = await prisma.adminAccount.findUnique({
      where: { username },
      include: { discordServers: { select: { id: true } } },
    });
    if (!admin?.discordServers.some((server) => server.id === guildId)) {
      return res.status(403).json({ error: 'Admin does not have access to this server' });
    }

    const updatedServer = await prisma.discordServer.update({
      where: { id: guildId },
      data: { shortName: shortName || null },
      select: { shortName: true },
    });
    return res.json({ status: 'OK', data: updatedServer });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Failed to save server short name' });
  }
});

router.post('/server_settings/set-server-icon', async (req, res) => {
  const validation = z.object({
    username: z.string(),
    guildId: z.string(),
    serverIcon: z.string().trim().max(2048).refine((value) => {
      if (value.length === 0) return true;
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    }, { message: 'Enter a valid HTTP or HTTPS URL, or leave blank to clear' }),
  }).safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0]?.message ?? 'Invalid request body' });
  }

  const { username, guildId, serverIcon } = validation.data;
  try {
    const admin = await prisma.adminAccount.findUnique({
      where: { username },
      include: { discordServers: { select: { id: true } } },
    });
    if (!admin?.discordServers.some((server) => server.id === guildId)) {
      return res.status(403).json({ error: 'Admin does not have access to this server' });
    }

    const updatedServer = await prisma.discordServer.update({
      where: { id: guildId },
      data: { serverIcon: serverIcon || null },
      select: { serverIcon: true },
    });
    return res.json({ status: 'OK', data: updatedServer });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Failed to save server icon URL' });
  }
});

router.post('/server_settings/set-server-banner', async (req, res) => {
  const validation = z.object({
    username: z.string(),
    guildId: z.string(),
    banner: z.string().trim().max(2048).refine((value) => {
      if (value.length === 0) return true;
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    }, { message: 'Enter a valid HTTP or HTTPS URL, or leave blank to clear' }),
  }).safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({ error: validation.error.issues[0]?.message ?? 'Invalid request body' });
  }

  const { username, guildId, banner } = validation.data;
  try {
    const admin = await prisma.adminAccount.findUnique({
      where: { username },
      include: { discordServers: { select: { id: true } } },
    });
    if (!admin?.discordServers.some((server) => server.id === guildId)) {
      return res.status(403).json({ error: 'Admin does not have access to this server' });
    }

    const updatedServer = await prisma.discordServer.update({
      where: { id: guildId },
      data: { banner: banner || null },
      select: { banner: true },
    });
    return res.json({ status: 'OK', data: updatedServer });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Failed to save server banner URL' });
  }
});

router.post('/server_settings/set-voice-channel-configurations', async (req, res) => {
  const validation = z.object({
    username: z.string(),
    guildId: z.string(),
    configurations: z.array(z.object({
      channelId: z.string(),
      purpose: z.enum(['PRODUCTIVITY', 'NONE']),
      type: z.enum(['ANY', 'CAM_ONLY', 'CAM_SCREENSHARE']),
    })).max(100),
  }).safeParse(req.body);

  if (!validation.success) return res.status(400).json({ error: 'Invalid request body' });

  const { username, guildId, configurations } = validation.data;
  if (new Set(configurations.map(({ channelId }) => channelId)).size !== configurations.length) {
    return res.status(400).json({ error: 'Duplicate voice channel IDs are not allowed' });
  }

  try {
    const admin = await prisma.adminAccount.findUnique({
      where: { username },
      include: { discordServers: { select: { id: true } } },
    });
    if (!admin?.discordServers.some((server) => server.id === guildId)) {
      return res.status(403).json({ error: 'Admin does not have access to this server' });
    }

    await prisma.$transaction(async (transaction) => {
      await transaction.voiceChannelConfiguration.deleteMany({ where: { discordServerId: guildId } });
      if (configurations.length > 0) {
        await transaction.voiceChannelConfiguration.createMany({
          data: configurations.map(({ channelId, purpose, type }) => ({
            id: channelId,
            discordServerId: guildId,
            purpose,
            type,
          })),
        });
      }
    });

    return res.json({ status: 'OK', data: configurations });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: 'Failed to save voice channel configurations' });
  }
});

router.post('/server_settings/set-bot-test-channel', async (req, res) => {
  try {
    const { username, guildId, newChannel } = await z.object({
      username: z.string(),
      guildId: z.string(),
      newChannel: z.string(),
    }).parseAsync(req.body);

    try {
      await prisma.adminAccount.findUniqueOrThrow({ where: { username }, include: { discordServers: true } });
      await prisma.discordServer.update({ where: { id: guildId }, data: { test_channel: newChannel } });
      return res.end('OK');
    } catch {
      return res.status(500).json({ error: 'Failed to fetch admin.' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }
});

router.post('/server_settings/set-leave-announce-channel', async (req, res) => {
  try {
    const { username, guildId, newChannel } = await z.object({
      username: z.string(),
      guildId: z.string(),
      newChannel: z.string(),
    }).parseAsync(req.body);

    try {
      await prisma.adminAccount.findUniqueOrThrow({ where: { username }, include: { discordServers: true } });
      await prisma.discordServer.update({ where: { id: guildId }, data: { leaveAnnounceChannel: newChannel } });
      return res.end('OK');
    } catch {
      return res.status(500).json({ error: 'Failed to fetch admin.' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }
});

router.post('/trigger-ai-messages-check', async (req, res) => {
  try {
    await z.object({ username: z.string(), guild: z.string() }).parseAsync(req.body);
    try {
      await agenda.now('ai_messages_check', {
        systemWide: 'true',
        triggeredBy: 'manual-user-trigger',
      });
      return res.send('OK, successfully sent.');
    } catch (error) {
      console.log(error);
      return res.status(500).send('Failed');
    }
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }
});

router.post('/toggle-bot-testing', async (req, res) => {
  try {
    const { username, guild } = await z.object({ username: z.string(), guild: z.string() }).parseAsync(req.body);
    try {
      await prisma.adminAccount.findUniqueOrThrow({ where: { username }, include: { discordServers: true } });
      const server = await prisma.discordServer.findUniqueOrThrow({ where: { id: guild } });
      const updatedServer = await prisma.discordServer.update({
        where: { id: guild },
        data: { test_mode: !server.test_mode },
      });
      return res.json({ status: 'OK', data: updatedServer });
    } catch (error) {
      console.log(error);
      return res.status(500).send('Failed');
    }
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }
});

router.post('/server_settings', async (req, res) => {
  try {
    const { username } = await z.object({ username: z.string() }).parseAsync(req.body);
    try {
      const admin = await prisma.adminAccount.findUniqueOrThrow({
        where: { username },
        include: { discordServers: { include: { voiceChannelConfigurations: true } } },
      }).catch((error) => {
        console.log('Admin not found error', error);
        throw new Error('Admin not found');
      });

      const requests = admin.discordServers.map(async (server) => ({
        ...server,
        discord: await getDiscordGuildCached(server.id),
      }));
      const withServerData = await Promise.allSettled(requests);
      const successfulServers = withServerData
        .filter((result) => result.status === 'fulfilled')
        .flatMap((result) => result.value);

      console.log(successfulServers.length)
      return res.json(successfulServers);
    } catch (error) {
      return res.status(500).json({ error });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }
});

export default router;