// handlers.ts

import { EmbedBuilder, type ApplicationCommandDataResolvable, type GuildTextBasedChannel } from "discord.js";
import { prisma } from "../db";
import type { ClientType } from "../new";

export function registerCommandsClientReady(client: ClientType) {
  client.once('clientReady', async () => {
    const commands: ApplicationCommandDataResolvable[] = [
      // {
      //   name: 'list',
      //   description: 'List messages deleted due to guideline violations.'
      // },
      // {
      //   name: 'add_admin',
      //   description: 'Add an admin account (for admin tools access) linked to a discord user.',
      //   options: [
      //     {
      //       name: 'discord_user',
      //       description: 'The Discord user to link this admin account to.',
      //       type: 6, // USER
      //       required: true
      //     },
      //     {
      //       name: 'username',
      //       description: 'The username for the admin account.',
      //       type: 3, // STRING
      //       required: true
      //     },
      //     {
      //       name: 'password',
      //       description: 'The password for the admin account.',
      //       type: 3, // STRING
      //       required: true
      //     },
      //   ]
      // },
      // {
      //   name: 'remove_admin',
      //   description: 'Remove an admin account/permissions from a member/ex-member of your server.',
      //   options: [
      //     {
      //       name: 'discord_user',
      //       description: 'The Discord user to link this admin account to.',
      //       type: 6, // USER
      //       required: true
      //     }
      //   ]
      // },
      // {
      //   name: 'stop_reminder',
      //   description: 'Stop the study reminder.'
      // },
      // {
      //   name: 'reminder',
      //   description: "Enable/disable: This will make the bot join your vc to remind you to study (please don't mute it!)",
      //   options: [
      //     {
      //       name: 'interval',
      //       description: `Syntax: "1h", "1h 30m", "30m", ...`,
      //       type: 3, // USER
      //       required: false
      //     }
      //   ]
      // },
      // {
      //   name: 'test_mode',
      //   description: "Enable/disable: Note, will disable normal bot functionality and concentrate functions only in test channel.",
      // },
    ]

    const promises = commands.map((c) => client.application?.commands.create(c));

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.log('Error while trying to register commands.', error);
    }
  })
}