import { env } from '../env';

import { Client, GatewayIntentBits, EmbedBuilder, GuildMember, type GuildTextBasedChannel, type ApplicationCommandDataResolvable } from 'discord.js';
import moment from 'moment'
import { prisma } from './db';
import _ from 'lodash'
import path from 'path';
import { fileURLToPath } from 'url';

// Setting up Express server to serve files.
import express from 'express';
import { agenda } from './hooks/cron';
import { defineReminderJob } from './hooks/jobs/reminder';
import { defineSystemJob } from './hooks/jobs/system';
import { registerGuildMemberRemoveFn } from './events/guildMemberRemove';
import { apiEntryPoint } from './api/entry';
import { registerCommandsClientReady } from './events/registerCommandsClientReady';
import { registerInteractionCreateEventFn } from './events/interactionCreate';
import { registerMessageCreateEventFn } from './events/messageCreate';
import { setupVerificationEmbedMsg } from './events/setupVerificationEmbed';
import { handleButtons } from './events/handleButtons';
import { registerAllServers } from './events/getAllServers';
import { registerVoiceTracking } from './events/voiceTracking';
import { defineVCEnforcementJob } from './hooks/jobs/vc-enforcement';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//
//
// EXPRESS API DEFINITION
//
//
const app = express();
apiEntryPoint(app);

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

export type ClientType = typeof client;

registerCommandsClientReady(client);
registerGuildMemberRemoveFn(client);
registerVoiceTracking(client);
registerInteractionCreateEventFn(client);
registerMessageCreateEventFn(client);
registerAllServers(client);
setupVerificationEmbedMsg(client);
handleButtons(client);

// Define all jobs BEFORE starting agenda
defineReminderJob();
defineSystemJob();
defineVCEnforcementJob();

void (async () => {
  try {
    await agenda.start();

    // spin up agendas
    // await agenda.every('50 23 * * *', 'ai_messages_check', { systemWide: "true" }, {
    //   skipImmediate: true
    // });

    console.log('✅ Agenda Connected')
  } catch (error) {
    console.log('Agenda Failed.', error)
  }
})()


client.once('clientReady', async () => {
  console.log('✅ Bot Ready.'); // Log "Ready!"

  // Command Registrations done @ events/clientReady.ts
  // Interaction Create for managing how command is handled @ events/interactionCreate.ts
  // Message Create for managing moderation is handled @ events/messageCreate.ts

  // Fetch all sessions currently marked ACTIVE in the database
  if (env.RUN_TYPE == "prod") {
    const deleteDanglingSessions = await prisma.voiceSession.deleteMany({
      where: { status: "ACTIVE" }
    });
  }
});

client.login(env.DISCORD_BOT);

app.listen(env.RUN_TYPE !== 'prod' ? 1500 : 3000, (e) => {
  console.log('✅ Express ready.')
})