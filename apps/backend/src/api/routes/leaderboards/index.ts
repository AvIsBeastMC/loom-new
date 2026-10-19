import satori from 'satori';
import { html } from 'satori-html';
import { Resvg } from '@resvg/resvg-js';
import { Router, type Router as ExpressRouter } from 'express';
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url';
import z from 'zod';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { prisma } from '../../../db';
import { getLeaderboard as getLeaderboardHook } from '../../../hooks/getLeaderboard';
import moment from 'moment';

const router: ExpressRouter = Router();

export const fontsImport = async () => {
  const fontConfigs = [
    {
      file: './fonts/Inter_28pt-Light.ttf',
      name: 'Inter',
      weight: 300 as const,
      style: 'normal' as const,
    },
    {
      file: './fonts/Inter_28pt-Medium.ttf',
      name: 'Inter',
      weight: 500 as const,
      style: 'normal' as const,
    },
    {
      file: './fonts/Inter_28pt-SemiBold.ttf',
      name: 'Inter',
      weight: 600 as const,
      style: 'normal' as const,
    },
    {
      file: './fonts/Inter_28pt-ExtraBold.ttf',
      name: 'Inter',
      weight: 800 as const,
      style: 'normal' as const,
    },
    {
      file: './fonts/NotoSansSymbols2-Regular.ttf',
      name: 'Noto Symbols',
      weight: 400 as const,
      style: 'normal' as const,
    },
    {
      file: './fonts/NotoSansJP-Regular.ttf',
      name: 'Noto CJK',
      weight: 400 as const,
      style: 'normal' as const,
    },
    {
      file: './fonts/NotoColorEmoji-Regular.ttf',
      name: 'Noto Emoji',
      weight: 400 as const,
      style: 'normal' as const,
    },
  ];

  return Promise.all(
    fontConfigs.map(async ({ file, name, weight, style }) => {
      const data = await fs.readFile(path.join(__dirname, file));
      return {
        name,
        data, // Directly pass the Buffer
        weight,
        style,
      };
    })
  );
};

export const getLeaderboard = async ({ guildId, duration }: { guildId: string, duration: '24h' | '1month' | '1year' }) => {
  const guild = await prisma.discordServer.findUniqueOrThrow({
    where: {
      id: guildId
    }
  });

  const [value, time] = duration == '24h' ? [24, 'hours'] : duration == '1month' ? [1, 'month'] : [1, 'year'];
  const leaderboard = (await getLeaderboardHook(moment().subtract(value, time as any).toDate(), guildId))

  // Extract whatever type satori expects for its first param:
  type SatoriNode = Parameters<typeof satori>[0];

  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]!);

  const leaderboardRender = leaderboard.map((u, index) => {
    const rank = String(index + 1).padStart(2, '0');
    const rankColor = ['#c9f36a', '#d5dfd2', '#e0a879'][index] ?? '#849080';
    const avatar = u.user.avatar
      ? `https://cdn.discordapp.com/avatars/${encodeURIComponent(u.user.id)}/${encodeURIComponent(u.user.avatar)}.png?size=96`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';
    const displayName = escapeHtml(u.user.global_name ?? u.user.username);
    const username = escapeHtml(u.user.username);

    if (index > 9) return "";

    return `<div style="display:flex;align-items:center;height:68px;box-sizing:border-box;margin-bottom:5px;padding:0 12px;border:1px solid ${index < 3 ? '#35432d' : '#262c25'};border-radius:11px;background-color:${index < 3 ? '#192016' : '#141815'}">
      <div style="display:flex;width:36px;height:36px;flex-shrink:0;align-items:center;justify-content:center;margin-right:10px;border-radius:9px;background-color:${index < 3 ? '#252f1d' : '#202520'};color:${rankColor};font-size:13px;font-weight:800">${rank}</div>
      <img src="${avatar}" alt="" width="46" height="46" style="width:46px;height:46px;flex-shrink:0;object-fit:cover;border-radius:23px;border:1px solid #3b4438" />
      <div style="display:flex;flex-direction:column;justify-content:center;min-width:0;margin-left:12px">
        <span style="max-width:230px;overflow:hidden;color:#f3f5ee;font-size:15px;font-weight:600;white-space:nowrap;text-overflow:ellipsis, font-family: 'Inter', 'Noto Symbols', 'Noto CJK', 'Noto Emoji', sans-serif;">${displayName}</span>
        <span style="margin-top:3px;color:#929b8e;font-size:11px;font-weight:300">@${username}</span>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:center;margin-left:auto;padding-left:8px">
        <span style="color:${rankColor};font-size:16px;font-weight:800;white-space:nowrap">${u.formattedTimeSpent}</span>
        <span style="margin-top:2px;color:#849080;font-size:9px;font-weight:600">TOTAL TIME</span>
      </div>
    </div>`;
  });

  const durationText = duration == '24h' ? 'LAST 24 HOURS' : duration == '1month' ? 'LAST MONTH' : 'LAST YEAR'

  const file = (await fs.readFile(path.join(__dirname, './html/main.html'), 'utf-8'))
    .replaceAll('{{servericon}}', guild.serverIcon ?? "https://loom-static.arunnya.com/loom.jpg")
    .replaceAll('{{name}}', guild.shortName!)
    .replaceAll('{{leaderboard}}', leaderboardRender.join(" "))
    .replaceAll('{{timecutoff}}', durationText)

  const markup = html(file);

  const svg = await satori(markup as SatoriNode, {
    width: 600,
    height: 950,
    fonts: await fontsImport()
  });

  const png = new Resvg(svg, {
    fitTo: {
      mode: 'zoom',
      value: 3, // Renders at 1200x1900 for razor-sharp Retina display
    },
  }).render().asPng();

  return png;
}

router.get("/leaderboards/test", async (req, res) => {
  const guildParam = z.string().parse(req.query.guild);
  const durationParam = z.enum(['24h', '1month', '1year']).parse(req.query.duration);

  const png = await getLeaderboard({ guildId: guildParam, duration: durationParam });

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=60');

  return res.status(200).send(png);
})

export default router;