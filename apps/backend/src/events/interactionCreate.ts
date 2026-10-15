// handlers.ts

import { EmbedBuilder, type ApplicationCommandDataResolvable, type GuildTextBasedChannel } from "discord.js";
import { prisma } from "../db";
import type { ClientType } from "../new";
import commandHandlers from "../commands/commandHandlers";

export function registerInteractionCreateEventFn(client: ClientType) {
  client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const handler = commandHandlers[interaction.commandName];
      if (handler) {
        await handler(interaction);
      }
    };
  });
}