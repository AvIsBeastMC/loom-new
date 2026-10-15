// handlers.ts

import { EmbedBuilder, type GuildTextBasedChannel } from "discord.js";
import { prisma } from "../db";
import type { ClientType } from "../new";

export function registerGuildMemberRemoveFn(client: ClientType) {
  client.on('guildMemberRemove', async (member) => {
    if (member.user.bot) return;
    // see if there's a set channel.
    try {
      const guild = await prisma.discordServer.findUniqueOrThrow({
        where: {
          id: member.guild.id
        }
      });

      if (!guild.leaveAnnounceChannel) return;

      // setup a super nice embedded, goodbye message
      const embed = new EmbedBuilder()
        .setTitle(`Goodbye, ${member.user.username}...`)
        .setDescription(`**${member.displayName}** has left the server. We wish them all the best!`)
        .setColor(0xE04B4B)
        .setAuthor({ name: `${guild.shortName} Moderation`, iconURL: guild.serverIcon || 'https://loom-static.arunnya.com/loom.jpg' })
        .setThumbnail(member.user.displayAvatarURL())
        .setFooter({ text: 'Community Guidelines', iconURL: guild.serverIcon || 'https://loom-static.arunnya.com/loom.jpg' })
        .setTimestamp(new Date());

      const announceChannel = member.guild.channels.cache.get(guild.leaveAnnounceChannel) as GuildTextBasedChannel | undefined;

      if (announceChannel) {
        await announceChannel.send({ embeds: [embed] });
      } else {
        console.log(`Leave announce channel with ID ${guild.leaveAnnounceChannel} not found in guild ${member.guild.id}`);
      }
    } catch (error) {

    }
  });
}