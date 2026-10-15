import axios, { type AxiosResponse } from 'axios';
import _ from 'lodash';
import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import type { RESTGetAPIUserResult } from 'discord-api-types/v10';
import { prisma } from '../../db';
import { getUserAPICache } from '../../hooks/cache';
import { env } from '../../../env';

const router: ExpressRouter = Router();

router.post('/violations-parsed-by-guild', async (req, res) => {
  try {
    const { guildId } = await z.object({
      username: z.string(),
      guildId: z.string(),
    }).parseAsync(req.body);

    const violations = await prisma.violation.findMany({ where: { guildId } });
    const members = _.uniq(violations.flatMap((violation) => violation.user));

    const discordMembersQuery = members.map(async (memberId) => {
      const cachedUser = getUserAPICache.get(memberId);
      if (cachedUser) return cachedUser;

      const discordResponse: AxiosResponse<RESTGetAPIUserResult> = await axios.get(
        `https://discord.com/api/users/${memberId}`,
        { headers: { Authorization: `Bot ${env.DISCORD_BOT}` } }
      );
      getUserAPICache.set(memberId, discordResponse.data);
      return discordResponse.data;
    });

    try {
      const discordMembersData = await Promise.allSettled(discordMembersQuery);
      const fulfilledMembers = discordMembersData
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);
      const violationsWithDiscord = violations.map((violation) => ({
        ...violation,
        discordUser: fulfilledMembers.find((member) => member.id === violation.user),
      }));
      const withDiscordUser = violationsWithDiscord.filter((violation) => violation.discordUser !== undefined);
      const countsByName = _.mapValues(_.groupBy(withDiscordUser, 'discordUser.global_name'), 'length');
      const sorted = _.chain(countsByName)
        .toPairs()
        .orderBy([1], ['desc'])
        .fromPairs()
        .value();
      return res.json(sorted);
    } catch (error) {
      console.log('Error while trying to fetch users for violations.', error);
    }
  } catch (error) {
    console.log('[/violations] Error');
    console.log(error);
    return res.status(400).json({ error: 'Error Occurred.' });
  }
});

router.post('/violations', async (req, res) => {
  try {
    const { username } = await z.object({ username: z.string() }).parseAsync(req.body);
    const admin = await prisma.adminAccount.findUniqueOrThrow({
      where: { username },
      include: { discordServers: true },
    });
    const guildFilters = admin.discordServers.map((server) => ({ guildId: server.id }));
    const violations = await prisma.violation.findMany({
      where: { OR: guildFilters },
      orderBy: { time: 'desc' },
    });
    return res.json(violations);
  } catch (error) {
    console.log('[/violations] Error');
    console.log(error);
    return res.status(400).json({ error: 'Error Occurred.' });
  }
});

export default router;