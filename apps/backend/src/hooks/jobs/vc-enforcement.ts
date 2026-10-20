import { joinVoiceChannel, createAudioPlayer, createAudioResource, VoiceConnectionStatus, AudioPlayerStatus } from "@discordjs/voice";
import type { Job } from "agenda";
import chalk from "chalk";
import path from "path";
import type { ReminderDataType } from "../../commands/reminder";
import { client } from "../../new";
import { agenda } from "../cron";
import { prisma } from "../../db";
import cn from 'classnames'
import { BaseGuildVoiceChannel, EmbedBuilder, type VoiceChannel } from "discord.js";

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
  } catch (e) {
    console.log(cn(chalk.bgRed.white("DESTROY JOB FAILED (some part)"), JSON.stringify(e)));
  }
}

export const defineVCEnforcementJob = () => {
  agenda.define('vc-enforcement', async (data: Job<VCEnforcementDataType>) => {
    // We have 10 seconds to give to the user to turn on camera, camera/screenshare, this is why this has triggered, warn this mf
    console.log('vc-enforcement triggered', JSON.stringify(data.attrs.data));

    const { user, guild, interval, vcChannelId, warnings } = data.attrs.data;

    const guildFetch = client.guilds.cache.get(guild);
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

    if (!guildFetch || !guildDBChannelConfig) return console.log('VC-Enforcement:', JSON.stringify(data), '\nError: couldnt fetch guild info.');

    try {
      const member = await guildFetch.members.fetch(user);
      const channel = await guildFetch.channels.fetch(vcChannelId) as BaseGuildVoiceChannel;

      const warning1 = guildDBChannelConfig.type == 'CAM_ONLY' ? 'Camera-only Productivity Channel' : 'Camera/Screenshare-only Productivity Channel'
      const warning2 = guildDBChannelConfig.type == 'CAM_ONLY' ? 'keep your Camera on' : 'keep either your Camera or Screenshare on'

      // if camera, cam/screenshare on, skip.
      if (guildDBChannelConfig.type == 'CAM_ONLY') {
        if (member.voice.selfVideo) return;
      } else if (guildDBChannelConfig.type == 'CAM_SCREENSHARE') {
        if (member.voice.selfVideo || member.voice.streaming) return;
      }

      const embed = new EmbedBuilder()
        .setTitle(`WARNING! <@${member.id}>`)
        .setColor('Red')
        .setDescription(`You're currently in a **${warning1}**, where you're required to ${warning2}. Please do so as soon as possible to avoid getting kicked from this voice channel!`)
        .setThumbnail(guildDBFetch.serverIcon || 'https://loom-static.arunnya.com/loom.jpg')
        .setFooter({ text: `Voice Features • ${guildDBFetch.shortName}`, iconURL: guildDBFetch.serverIcon || 'https://loom-static.arunnya.com/loom.jpg' })
        .setTimestamp(new Date());

      // Warn and exit here
      if (warnings === 0) {
        channel.send({
          embeds: [embed],
        });

        data.attrs.data = {
          ...data.attrs.data,
          warnings: warnings + 1
        };

        console.log(`WARNED USER, @${member.user.username}, #${member.voice.channel?.name}, Server: ${member.guild.name}`);

        await data.save();
      } else {
        // ge out kardo
        const embed = new EmbedBuilder()
          .setTitle(`Kicked <@${member.user.id}>`)
          .setColor('DarkRed')
          .setDescription(`You've been kicked for violating Voice Channel rules for this room.`)
          .setThumbnail(guildDBFetch.serverIcon || 'https://loom-static.arunnya.com/loom.jpg')
          .setFooter({ text: `Voice Features • ${guildDBFetch.shortName}`, iconURL: guildDBFetch.serverIcon || 'https://loom-static.arunnya.com/loom.jpg' })
          .setTimestamp(new Date());

        await member.voice.disconnect();
        channel.send({
          embeds: [embed]
        });

        console.log(`KICKED USER, @${member.user.username}, #${channel.id}, Server: ${member.guild.name}`);
        await data.remove();
      };

      return;
    } catch (error) {
      console.log(cn(chalk.bgRed.white('VC-Enforcement Function Failure: '), JSON.stringify(error)));
      return await data.remove();
    }
  });
};