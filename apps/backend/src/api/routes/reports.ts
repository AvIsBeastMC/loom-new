import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { prisma } from '../../db';
import getDiscordGuild from '../../hooks/getDiscordGuild';

const router: ExpressRouter = Router();

router.post('/ai_reports', async (req, res) => {
  try {
    const { username } = await z.object({ username: z.string() }).parseAsync(req.body);
    try {
      const { discordServers } = await prisma.adminAccount.findUniqueOrThrow({
        where: { username },
        include: { discordServers: true },
      });
      const reportsForServers = await prisma.violationReports.findMany({
        where: { guild: { id: { in: discordServers.map((server) => server.id) } } },
        include: { guild: true },
      });
      const serverResults = await Promise.allSettled(discordServers.map((server) => getDiscordGuild(server.id)));
      const servers = serverResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => result.value);
      const dataWithGuild = servers.map((server) => ({
        server,
        reports: reportsForServers.filter((report) => report.guildId === server.id),
      }));
      return res.json({ data: dataWithGuild });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }
});

router.post('/get-messages', async (req, res) => {
  try {
    const { messageIdList } = await z.object({ messageIdList: z.array(z.string()) }).parseAsync(req.body);
    try {
      const messages = await prisma.guildMessages.findMany({
        where: { id: { in: messageIdList } },
        orderBy: { dateTime: 'asc' },
      });
      const formattedMessages = messages.map((message) => ({
        id: message.id,
        guildId: message.guildId,
        user: message.user,
        content: message.content,
        rawData: message.rawData,
        dateTime: message.dateTime,
      }));
      return res.json({ messages: formattedMessages });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }
});

export default router;