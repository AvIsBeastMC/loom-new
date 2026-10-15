import axios, { type AxiosResponse } from 'axios';
import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import type { DiscordResponse } from '@repo/extra-types/API';
import { prisma } from '../../db';
import { env } from '../../../env';

const router: ExpressRouter = Router();

router.post('/auth', async (req, res) => {
  try {
    const { username, password } = await z.object({
      username: z.string(),
      password: z.string(),
    }).parseAsync(req.body);

    try {
      const admin = await prisma.adminAccount.findFirstOrThrow({ where: { username, password } });
      const discordResponse: AxiosResponse<DiscordResponse> = await axios.get(
        `https://discord.com/api/users/${admin.discordUserId}`,
        { headers: { Authorization: `Bot ${env.DISCORD_BOT}` } }
      );

      return res.json({ discord: discordResponse.data, main: admin });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: 'Failed to fetch admin.' });
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: 'Invalid request body' });
  }
});

export default router;