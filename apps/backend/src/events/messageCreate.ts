// handlers.ts

import { EmbedBuilder, type ApplicationCommandDataResolvable, type GuildTextBasedChannel } from "discord.js";
import { prisma } from "../db";
import type { ClientType } from "../new";
import commandHandlers from "../commands/commandHandlers";
import chalk from "chalk";
import _ from "lodash";
import moment from "moment";
import { getUserViolations } from "../hooks/dbGetUserViolations";
import errorLogger from "../middleware/errorLogger";
import { DataSet, RegExpMatcher, TextCensor, englishDataset, englishRecommendedTransformers, pattern } from 'obscenity';
import cn from 'classnames'
import { testModeEmbed } from "../embeds/testMode";
import { getTestMode } from "../hooks/getTestMode";
import { env } from "../../env";
import { warnEmbedCreator } from "../embeds/messageCreate";

const matcher = new RegExpMatcher({
  // ...badWordDataset.build(),
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

export function registerMessageCreateEventFn(client: ClientType) {
  client.on('messageCreate', async (msg) => {
    if (!msg || !msg.author) return;
    if (msg.author.bot) return;
    if (client.user && msg.author.id === client.user.id) return;

    const censor = new TextCensor();
    let matches: any[] = matcher.getAllMatches(msg.content || '')

    // Check for Bot Testing Mode
    const serverId = msg.guildId;
    if (!serverId) return;

    const serverDb = await prisma.discordServer.findUnique({
      where: {
        id: serverId
      },
      select: {
        shortName: true,
        serverIcon: true,
      }
    });

    const testModeSettings = await getTestMode(serverId)

    if (!serverDb) return errorLogger({ errMessage: "Server not found in Database", where: "new.ts | messageCreate" });

    if (testModeSettings.server.allTestMode) return console.log('[ALLTESTMODE ENABLED] Quitting MessageCreate Inherent - Text Moderation Function');

    const warnEmbed = warnEmbedCreator({ authorId: msg.author.id, serverDb, matchesLength: matches.length })

    if (matches.length > 0) {
      const channel = msg.channel as GuildTextBasedChannel;

      if (testModeSettings.guild.test_mode) {
        if (msg.channelId == testModeSettings.guild.test_channel) {
          try {
            // if test_mode... only have to send in test channel, otherwise no
            await msg.reply({ embeds: [warnEmbed, testModeEmbed] });
          } catch (err) {
            console.log('Failed to send warning message', err);
          }
        } else {
          // Nothing.
        };

        return;
      } else {
        try {
          await msg.reply({ embeds: [warnEmbed] });
        } catch (err) {
          errorLogger({ errMessage: 'Could not send warning embed message', where: "messageCreate.ts" })
          console.log(err);
        }
      }

      const consoleReport = (dbSuccess: boolean) => {
        console.log(chalk.white(
          cn(
            dbSuccess ? chalk.bgYellow('✔') : chalk.bgRed('✕'),
            chalk.bgMagenta(moment(msg.createdTimestamp).format('hh:mm A, Do MMM')),
            chalk.white('Swear Alert!'),
            msg.member?.displayName ?? msg.author.username,
            chalk.bgWhite(msg.author.username),
            'has sworn in',
            chalk.bgGray(`#${(channel && channel.name) || channel.id}`)
          )
        ))
      }

      try {
        await prisma.violation.create({
          data: {
            channel: msg.channel.id,
            user: msg.author.id,
            originalContent: msg.content,
            guildId: msg.guild?.id ?? null,
          }
        })

        consoleReport(true)
      } catch (error) {
        console.log(error)
        consoleReport(false)
      }

      try { await msg.delete(); } catch (e) { }

      // Violations Timeout
      const violationsOver10m = await getUserViolations(msg.author.id);

      if (violationsOver10m.length > 10) {
        try {
          const guild = msg.guild;
          if (guild) {
            const member = await guild.members.fetch(msg.author.id);
            await member.timeout(30 * 60 * 1000);
          }

          const muteEmbed = new EmbedBuilder()
            .setAuthor({ name: `${serverDb.shortName} Moderation`, iconURL: serverDb.serverIcon || 'https://loom-static.arunnya.com/loom.jpg' })
            .setTitle(`${_.capitalize(msg.member?.displayName ?? '')}, you have been muted for 15 minutes`)
            .setDescription(`you wouldn't stop swearing here so we have to shut you up.\n - Before communicating again, please read the rules.`)
            .setImage('https://c.tenor.com/7JwCTxMpArIAAAAd/tenor.gif')
            .setColor(0xFF0000)
            .setFooter({ text: `Repeated Offenses by ${_.capitalize(msg.member?.displayName ?? '')}`, iconURL: msg.author.displayAvatarURL?.() || serverDb.serverIcon || 'https://loom-static.arunnya.com/loom.jpg' })
            .setTimestamp(new Date());

          await msg.channel.send({ embeds: [muteEmbed] });
        } catch (error) {
          console.log('Error', error)
        }
      }

      return;
    } else {
      // record user message in db.
      const user = await client.users.fetch(msg.author.id);

      try {
        const recordUserMessage = await prisma.guildMessages.create({
          data: {
            id: msg.id,
            user: {
              icon: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`,
              id: user.id,
              username: user.username
            },
            guildId: msg.guild?.id ?? "",
            rawData: {
              channelId: msg.channelId,
              messageId: msg.id
            },
            content: msg.content,
          }
        })
      } catch (error) {
        // make a nice console.log with chalk for failure. 
        console.log(chalk.white(
          cn(
            chalk.bgRed('✕'),
            chalk.bgMagenta(moment(msg.createdTimestamp).format('hh:mm A, Do MMM')),
            chalk.white('Failed to record message in DB for user'),
            msg.member?.displayName ?? msg.author.username,
            chalk.bgWhite(msg.author.username),
            'in',
            chalk.bgGray(`#${(msg.channel as GuildTextBasedChannel)?.name || msg.channelId}`)
          )
        ));
        console.log(error);
      }
    }
  });
}