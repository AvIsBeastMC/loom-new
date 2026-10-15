import axios, { type AxiosResponse } from 'axios';
import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import type { RESTGetAPIGuildChannelsResult, RESTGetAPIUserResult } from 'discord-api-types/v10';
import getDiscordGuild from '../../hooks/getDiscordGuild';
import getDiscordGuildChannel from '../../hooks/getDiscordGuildChannel';
import { getGuildAPICache, getGuildChannelCache, getUserAPICache } from '../../hooks/cache';
import { env } from '../../../env';

const router: ExpressRouter = Router();

router.post('/discord/get-guild', async (req, res) => {
  try {
    const { guildID } = await z.object({ guildID: z.string() }).parseAsync(req.body);
    const cachedGuild = getGuildAPICache.get(guildID);
    if (cachedGuild) return res.json(cachedGuild);

    const result = await getDiscordGuild(guildID);
    getGuildAPICache.set(guildID, result);
    return res.json(result);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: 'Error Occurred.', e: error });
  }
});

router.post('/discord/get-user', async (req, res) => {
  try {
    const { userID } = await z.object({ userID: z.string() }).parseAsync(req.body);
    const cachedUser = getUserAPICache.get(userID);
    if (cachedUser) return res.json(cachedUser);

    const discordResponse: AxiosResponse<RESTGetAPIUserResult> = await axios.get(
      `https://discord.com/api/users/${userID}`,
      { headers: { Authorization: `Bot ${env.DISCORD_BOT}` } }
    );
    getUserAPICache.set(userID, discordResponse.data);
    return res.json(discordResponse.data);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: 'Error Occurred.', e: error });
  }
});

router.post('/discord/get-guild-channel', async (req, res) => {
  try {
    const { channelId } = await z.object({ channelId: z.string() }).parseAsync(req.body);
    const cachedChannel = getGuildChannelCache.get(channelId);
    if (cachedChannel) return res.json(cachedChannel);

    const result = await getDiscordGuildChannel(channelId);
    getGuildChannelCache.set(channelId, result);
    return res.json(result);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: 'Error Occurred.' });
  }
});

router.post('/discord/get-guild-channels', async (req, res) => {
  try {
    const { guildId } = await z.object({ guildId: z.string() }).parseAsync(req.body);
    const response: AxiosResponse<RESTGetAPIGuildChannelsResult> = await axios.get(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      { headers: { Authorization: `Bot ${env.DISCORD_BOT}` } }
    );
    return res.json(response.data);
  } catch {
    return res.status(400).json({ error: 'Error Occurred.' });
  }
});

export default router;