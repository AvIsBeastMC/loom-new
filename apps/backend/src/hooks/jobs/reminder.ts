import { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus, AudioPlayerStatus } from "@discordjs/voice";
import type { Job } from "agenda";
import chalk from "chalk";
import path from "path";
import type { ReminderDataType } from "../../commands/reminder";
import { client } from "../../new";
import { agenda } from "../cron";
import { prisma } from "../../db";
import cn from 'classnames'

export const destroyJob = async ({ user, guildId }: { user: string, guildId: string }) => {
  try {
    await agenda.cancel({
      name: 'reminder',
      // @ts-ignore
      'data.user': user,
      'data.guild': guildId
    });

    // end database report record
    await prisma.reminderSession.update({
      where: {
        discordUserId_guildId: {
          discordUserId: user,
          guildId
        }
      },
      data: {
        over: true,
        ended: new Date()
      }
    });
  } catch (e) {
    console.log(cn(chalk.bgRed.white("DESTROY JOB FAILED (some part)"), JSON.stringify(e)));
  }
}

export const defineReminderJob = () => {
  agenda.define('reminder', async (data: Job<ReminderDataType>) => {
    console.log('reminder triggered', JSON.stringify(data.attrs.data));
    const { user, guild } = data.attrs.data;

    const guildFetch = client.guilds.cache.get(guild);

    if (!guildFetch) return console.log('Reminder:', JSON.stringify(data), '\nError: couldnt fetch guild');

    try {
      const member = await guildFetch.members.fetch(user);
      const voiceChannelId = member.voice.channelId;

      if (!voiceChannelId) {
        // yeah we done
        return await destroyJob({ guildId: guild, user });
      };

      // bot join, sound, leave.
      const connection = joinVoiceChannel({
        channelId: voiceChannelId,
        guildId: guild,
        adapterCreator: guildFetch.voiceAdapterCreator,
        selfDeaf: true,
        selfMute: false,
      });

      try {
        const player = createAudioPlayer();
        const resource = createAudioResource(path.join(import.meta.dirname, '../../../assets', 'reminder-1.mp3'));

        connection.on(VoiceConnectionStatus.Ready, () => {
          // console.log('The connection has entered the Ready state!');
          player.play(resource);
          connection.subscribe(player);

          player.on(AudioPlayerStatus.Idle, () => {
            console.log('Audio finished. Leaving channel...');
            connection.destroy();
          });

          // Optional: Error handling to prevent the bot from getting "stuck"
          player.on('error', (error) => {
            console.error('Error during playback:', error);
            connection.destroy();
          });
        });
      } catch (e) {
        console.log("Player Failure.")
        console.log(e);

        throw e;
      }
      // console.log(connection);
    } catch (error) {
      console.log(cn(chalk.bgRed.white('Reminder Function Failure: '), JSON.stringify(error)));
      return await data.remove();
    }
  });
};