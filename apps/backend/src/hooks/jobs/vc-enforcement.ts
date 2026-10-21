import { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus, AudioPlayerStatus } from "@discordjs/voice";
import type { Job } from "agenda";
import chalk from "chalk";
import path from "path";
import type { ReminderDataType } from "../../commands/reminder";
import { client } from "../../new";
import { agenda } from "../cron";
import { prisma } from "../../db";
import cn from 'classnames'
import { BaseGuildVoiceChannel, EmbedBuilder, userMention, type VoiceChannel } from "discord.js";

export type VCEnforcementDataType = {
  vcChannelId: string, guild: string, user: string, interval: string, warnings: number
}

export const destroyVCEnforcementJob = async ({ user, guildId }: { user: string, guildId: string }) => {
  try {
    await agenda.cancel({
      name: 'vc-enforcement',
      // @ts-ignore
      'data.user': user,
      'data.guild': guildId
    });
    console.log(cn(chalk.bgRedBright.white('VC Enforcement job DESTROYED'), JSON.stringify({ user, guildId })))
  } catch (e) {
    console.log(cn(chalk.bgRed.white("DESTROY JOB FAILED (some part)"), JSON.stringify(e)));
  }
}

export const defineVCEnforcementJob = () => {
  agenda.define('vc-enforcement', async (data: Job<VCEnforcementDataType>) => {
    // We have 10 seconds to give to the user to turn on camera, camera/screenshare, this is why this has triggered, warn this mf
    console.log('vc-enforcement triggered', JSON.stringify(data.attrs.data));

    const { user, guild, interval, vcChannelId, warnings } = data.attrs.data;

    try {
      const guildFetch = client.guilds.cache.get(guild);
      if (!guildFetch) {
        throw new Error(`Guild ${guild} is not available in the client cache.`);
      }

      const guildDBFetch = await prisma.discordServer.findUniqueOrThrow({
        where: {
          id: guild
        },
        include: {
          voiceChannelConfigurations: {
            where: {
              id: vcChannelId
            }
          }
        }
      });

      const guildDBChannelConfig = guildDBFetch.voiceChannelConfigurations[0];
      if (!guildDBChannelConfig) {
        await data.remove();
        return;
      }

      const member = await guildFetch.members.fetch(user);
      const channel = await guildFetch.channels.fetch(vcChannelId) as BaseGuildVoiceChannel;

      if (member.voice.channelId !== vcChannelId) {
        await data.remove();
        return;
      }

      const isCompliant = () => guildDBChannelConfig.type === 'CAM_ONLY'
        ? member.voice.selfVideo
        : guildDBChannelConfig.type === 'CAM_SCREENSHARE'
          ? member.voice.selfVideo || member.voice.streaming
          : true;

      if (isCompliant()) {
        await data.remove();
        return;
      }

      const requirement = guildDBChannelConfig.type === 'CAM_ONLY'
        ? 'Camera must stay on'
        : 'Camera or screen share must stay on';
      const serverIcon = guildDBFetch.serverIcon || 'https://loom-static.arunnya.com/loom.jpg';

      // Warn and exit here
      if (warnings === 0) {
        const embed = new EmbedBuilder()
          .setAuthor({ name: `${guildDBFetch.shortName} • Voice Features`, iconURL: serverIcon })
          .setTitle('Reminder!')
          .setColor(0xF0B429)
          .setDescription(`${userMention(member.user.id)}, please meet the channel requirement to stay in **${channel.name}**.`)
          .addFields(
            { name: 'Channel requirement', value: requirement, inline: true },
            { name: 'Time to respond', value: interval, inline: true },
            { name: 'Next step', value: 'Turn it on before the next check to avoid being removed.' }
          )
          .setThumbnail(member.displayAvatarURL({ size: 128 }))
          .setFooter({ text: `${guildDBFetch.shortName}` })
          .setTimestamp();

        await channel.send({
          embeds: [embed],
        });

        if (member.voice.channelId !== vcChannelId || isCompliant()) {
          await data.remove();
          return;
        }

        data.attrs.data = {
          ...data.attrs.data,
          warnings: warnings + 1
        };

        console.log(`WARNED USER, @${member.user.username}, #${member.voice.channel?.name}, Server: ${member.guild.name}`);

        await data.save();
      } else {
        // ge out kardo
        const embed = new EmbedBuilder()
          .setAuthor({ name: `${guildDBFetch.shortName} • Voice Features`, iconURL: serverIcon })
          .setTitle('You were removed from the voice channel')
          .setColor(0xD64545)
          .setDescription(`${userMention(member.user.id)}, you were removed from **${channel.name}** because the channel requirement wasn't met.`)
          .addFields(
            { name: 'Channel requirement', value: requirement },
            { name: 'To rejoin', value: 'Meet the channel requirement before joining again.' }
          )
          .setThumbnail(member.displayAvatarURL({ size: 128 }))
          .setFooter({ text: `Voice channel enforcement • ${guildDBFetch.shortName}` })
          .setTimestamp();

        if (member.voice.channelId !== vcChannelId || isCompliant()) {
          await data.remove();
          return;
        }

        await member.voice.disconnect();
        await channel.send({
          embeds: [embed]
        });

        console.log(`KICKED USER, @${member.user.username}, #${channel.id}, Server: ${member.guild.name}`);
        await data.remove();
      };

      return;
    } catch (error) {
      console.error(cn(chalk.bgRed.white('VC-Enforcement Function Failure: ')), error);
    }
  });
};