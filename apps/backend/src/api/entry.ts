// handlers.ts
import express from 'express';
import { EmbedBuilder, type GuildTextBasedChannel } from "discord.js";
import { prisma } from "../db";
import type { Express } from "express";
import path from "path";
import requestLogger from "../middleware/requestLogger";
import cors from 'cors'
import apiRoutes from './routes';

export function apiEntryPoint(app: Express) {
  // Configure CORS to allow your frontend origin
  app.use(requestLogger);
  app.use(cors({
    origin: /^http:\/\/localhost:\d+$/
  }));
  app.use(express.json());
  app.use('/api', apiRoutes);
  app.use('/static', express.static('assets'));
  app.use(express.static(path.join(__dirname, './web')));
}