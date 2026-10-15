import axios, { type AxiosResponse } from 'axios';
import _ from 'lodash';
import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import type { RESTGetAPIUserResult } from 'discord-api-types/v10';
import { prisma } from '../../db';
import { getUserAPICache } from '../../hooks/cache';
import { env } from '../../../env';
import { store } from '../../store';
import fs from 'fs/promises'
import path from 'path';
import { fileURLToPath } from 'url';
import errorLogger from '../../middleware/errorLogger';
import { parse as parseYaml } from 'yaml';
const router: ExpressRouter = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.get('/system/latest-update', async (req, res) => {
  try {
    const updatesDirectory = path.join(__dirname, '../updates');
    const files = (await fs.readdir(updatesDirectory, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && path.extname(entry.name).toLowerCase() === '.md');

    if (files.length === 0) {
      return res.status(404).json({ error: 'No updates available' });
    }

    const updates = await Promise.all(files.map(async (entry) => {
      const filePath = path.join(updatesDirectory, entry.name);
      const [markdown, fileStats] = await Promise.all([
        fs.readFile(filePath, 'utf-8'),
        fs.stat(filePath),
      ]);
      const frontMatter = markdown.match(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
      const metadata = frontMatter
        ? z.record(z.string(), z.unknown()).parse(parseYaml(frontMatter[1] ?? '') ?? {})
        : {};
      const fileDate = metadata.datetime instanceof Date
        ? metadata.datetime
        : typeof metadata.datetime === 'string'
          ? new Date(metadata.datetime)
          : fileStats.mtime;
      const datetime = Number.isNaN(fileDate.getTime()) ? fileStats.mtime : fileDate;
      const filenameTitle = path.basename(entry.name, path.extname(entry.name));

      return {
        title: typeof metadata.title === 'string' && metadata.title.trim()
          ? metadata.title.trim()
          : filenameTitle,
        datetime: datetime.toISOString(),
        content: markdown.slice(frontMatter?.[0].length ?? 0),
      };
    }));

    updates.sort((first, second) => Date.parse(first.datetime) - Date.parse(second.datetime));
    return res.json(updates[updates.length - 1]);
  } catch (error) {
    console.error('Failed to load latest update', error);
    return res.status(500).json({ error: 'Failed to load latest update' });
  }
});

router.get('/system', async (req, res) => {
  const state = store.getState();

  // check if build-info file exists or not
  try {
    const file = await fs.readFile(path.join(__dirname, '../../../build-info.json'), 'utf-8');
    const json = JSON.parse(file);

    const parser = z.object({
      timestamp: z.string(),
      branch: z.string(),
      headCommit: z.string(),
      upstream: z.string().nullable(),
      isClean: z.boolean(),
      isDirty: z.boolean(),
      commitsAhead: z.number(),
      commitsBehind: z.number(),
      uncommittedFiles: z.string().array(),
      diffSummary: z.string()
    })

    const parsedData = parser.parse(json)

    return res.json({
      store: state,
      git: parsedData
    });
  } catch (error) {
    errorLogger({
      errMessage: JSON.stringify(error),
      where: '/src/api/routes/system.ts'
    });
    console.log(error);
  };

  return res.json({
    store: state,
    git: undefined
  })
});

router.post('/system/all-test-mode', async (req, res) => {
  const validation = z.object({
    username: z.string(),
    enabled: z.boolean(),
  }).safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    await prisma.adminAccount.findUniqueOrThrow({ where: { username: validation.data.username } });
    store.setState({ allTestMode: validation.data.enabled });
    console.log(`[ALLTESTMODE] has been ${validation.data.enabled ? "enabled!" : "disabled."}`)
    return res.json({ store: store.getState() });
  } catch (error) {
    console.log(error);
    return res.status(403).json({ error: 'Admin account not found' });
  }
});

export default router;