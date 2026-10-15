import type { ChatInputCommandInteraction, CacheType } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { prisma } from '../db';

export default async function handleList(interaction: ChatInputCommandInteraction<CacheType>) {
  try {
    // check if user is admin for this server
    const adminAccount = await prisma.adminAccount.findFirst({
      where: {
        discordUserId: interaction.user.id,
        discordServers: {
          some: {
            id: interaction.guild!.id
          }
        }
      }
    });

    if (!adminAccount) return interaction.reply({ content: 'You do not have permission to use this command. You are not admin on this server.', ephemeral: true });

    // instead of fetchign from db, make this embed a link to the dashboard where theres gonna be the full list, its gonna be at https://solace.arunnya.com?username=...&password=...

    const embed = new EmbedBuilder()
      .setTitle('Violation Logs')
      .setDescription(`For a detailed list of recent violations, please visit [this dashboard link](https://solace.arunnya.com?username=${adminAccount.username}&password=${adminAccount.password}).`)
      .setColor(0xE04B4B)
      .setAuthor({ name: 'Loom', iconURL: 'https://loom-static.arunnya.com/loom.jpg' })
      .setThumbnail('https://loom-static.arunnya.com/loom.jpg')
      .setFooter({ text: 'Admininistration • Loom', iconURL: 'https://loom-static.arunnya.com/loom.jpg' })
      .setTimestamp(new Date());

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.log('Failed', error);
    return interaction.reply({ content: 'Failed command.', ephemeral: true });
  }
}