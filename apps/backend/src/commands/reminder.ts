import { prisma } from '../db';
import { type ChatInputCommandInteraction, type CacheType, type GuildMember, EmbedBuilder, Client } from 'discord.js';
import { agenda } from '../hooks/cron';
import parse from 'parse-duration';
import humanizeDuration from 'humanize-duration';
import { joinVoiceChannel } from '@discordjs/voice';
import type { Job } from 'agenda';
import { client } from '../new';
import chalk from 'chalk';
import classNames from 'classnames';
import { destroyJob } from '../hooks/jobs/reminder';
import { env } from '../../env';

export type ReminderDataType = {
  guild: string, user: string, interval: string
}

function processInterval(input: string) {
  // 1. Validate & Parse to Milliseconds
  const ms = parse(input);

  // If input is gibberish, parse-duration returns null
  if (ms === null || ms === 0) {
    throw new Error(`Invalid time format: "${input}"`);
  }

  // 2. Format it back to "1 hour 10 minutes"
  // We use 'en' language and can even round it if needed
  const formatted = humanizeDuration(ms, {
    language: 'en',
    conjunction: ' ',
    serialComma: false
  });

  return {
    ms: ms,
    seconds: ms / 1000,
    formatted: formatted // Always returns "1 hour 10 minutes"
  };
}

export async function handleStopReminder(interaction: ChatInputCommandInteraction<CacheType>) {
  const member = interaction.member as GuildMember

  await destroyJob({
    user: member.user.id,
    guildId: interaction.guild!.id
  })

  // reply to this that successfully cancelled
  const embed = new EmbedBuilder()
    .setTitle('Successfully cancelled your reminder!')
    .setColor('Red')
    .setDescription(`You will no longer receive reminders to study in the voice channel.`)
    .setThumbnail('https://loom-static.arunnya.com/loom.jpg')
    .setFooter({ text: 'New Features! • Loom', iconURL: 'https://loom-static.arunnya.com/loom.jpg' })
    .setTimestamp(new Date());

  return interaction.reply({ embeds: [embed] })
}

export default async function handleReminder(interaction: ChatInputCommandInteraction<CacheType>) {
  const member = interaction.member as GuildMember
  const { channel: voiceChannel } = member.voice;
  const guild = interaction.guild!.id;

  if (!voiceChannel) {
    // you have to be in a voice channel to use this command, make the embed.
    const embed = new EmbedBuilder()
      .setTitle('You have to be in a voice channel to use this command.')
      .setColor('Red')
      .setDescription('Please join a voice channel and try again.')
      .setThumbnail('https://loom-static.arunnya.com/loom.jpg')
      .setFooter({ text: 'New Features • Loom', iconURL: 'https://loom-static.arunnya.com/loom.jpg' })
      .setTimestamp(new Date());

    return interaction.reply({ embeds: [embed] })
  }

  // get time interval
  const userTimeInterval = interaction.options.getString('interval', false);

  const interval = userTimeInterval ? processInterval(userTimeInterval).formatted : env.RUN_TYPE == 'dev' ? '10 seconds' : '1 hour';

  console.log({ userTimeInterval, interval });

  try {
    const data: ReminderDataType = {
      guild,
      interval,
      user: interaction.user.id
    };

      // Cancel any existing reminder jobs for this user/guild before scheduling a new one.
      try {
        await agenda.cancel({
          name: 'reminder',
          // @ts-ignore
          'data.user': interaction.user.id,
          'data.guild': guild
        });
      } catch (error) {
        console.log(classNames(chalk.bgYellow.black('Warning cancelling previous reminder jobs.'), JSON.stringify(error)));
      }

      try {
        const res = await agenda.every(interval, 'reminder', data);

        // record or update our DB session.
        try {
          const report = await prisma.reminderSession.upsert({
            where: {
              discordUserId_guildId: {
                discordUserId: interaction.user.id,
                guildId: guild
              }
            },
            update: {
              interval,
              over: false,
              ended: null
            },
            create: {
              discordUserId: interaction.user.id,
              interval,
              guildId: guild
            }
          });
        } catch (error) {
          console.log(classNames(chalk.bgRed.white("Error recording reminder session."), JSON.stringify(error)));
        }

        console.log(classNames(chalk.bgWhite.black('New Reminder'), `for ${interaction.user.globalName}`));
      } catch (error) {
        console.log(error);
        throw error;
      }

    // reply with a 'successfully set your reminder! you will be reminded every x time to study until you leave the vc
    const embed = new EmbedBuilder()
      .setTitle('Successfully set your reminder!')
      .setColor('Green')
      .setDescription(`You will be reminded every **${processInterval(interval).formatted}** to study until you leave the voice channel.`)
      .setThumbnail('https://loom-static.arunnya.com/loom.jpg')
      .setFooter({ text: 'New Features • Loom', iconURL: 'https://loom-static.arunnya.com/loom.jpg' })
      .setTimestamp(new Date());

    return interaction.reply({ embeds: [embed] });
  } catch (error) {
    // console.log(error)
    console.log(classNames(chalk.bgRed.white("Error setting `agenda`."), JSON.stringify(error)));
  }
}
