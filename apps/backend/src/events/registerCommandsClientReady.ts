// handlers.ts

import { EmbedBuilder, SlashCommandBuilder, type ApplicationCommandDataResolvable, type GuildTextBasedChannel } from "discord.js";
import { prisma } from "../db";
import type { ClientType } from "../new";

export function registerCommandsClientReady(client: ClientType) {
  client.once('clientReady', async () => {
    const commands = [
      new SlashCommandBuilder()
        .setName('leaderboards')
        .setDescription("Check out who's leading with the numbers!")
        .addStringOption(option =>
          option
            .setName('duration')
            .setDescription('For what time period?')
            .setRequired(true)
            .addChoices(
              { name: '24 Hours', value: '24h' },
              { name: '1 month', value: '1month' },
              { name: '1 year', value: '1year' },
              // { name: 'Maybe', value: 'maybe' }
            )
        )
    ]

    const promises = commands.map((c) => client.application?.commands.set(commands));

    try {
      await Promise.allSettled(promises);
      console.log("- CLEARED ALL COMMANDS")
    } catch (error) {
      console.log('Error while trying to register commands.', error);
    }
  })
}