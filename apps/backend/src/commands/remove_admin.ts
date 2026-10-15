import { prisma } from '../db';
import type { ChatInputCommandInteraction, CacheType } from 'discord.js';

export default async function handleRemoveAdmin(interaction: ChatInputCommandInteraction<CacheType>) {
  try {
    // check if command-user is on the database
    try {
      const adminAccount = await prisma.adminAccount.findFirstOrThrow({
        where: {
          discordUserId: interaction.user.id,
          discordServers: {
            some: {
              id: interaction.guild!.id
            }
          }
        }
      });
    } catch (error) {
      // ur not admin
      return interaction.reply({ content: 'You do not have permission to use this command. You are not admin on this server.', ephemeral: true });
    }

    const discordUser = interaction.options.getUser('discord_user', true);
    const existingAdmin = await prisma.adminAccount.findFirst({
      where: {
        discordUserId: discordUser.id,
        discordServers: {
          some: {
            id: interaction.guild!.id
          }
        }
      },
      include: {
        discordServers: true
      }
    });

    if (!existingAdmin) {
      return interaction.reply({ content: '❌ No admin account linked to this user on this server was found.', ephemeral: true });
    }

    // remove the link between the admin account and the server.
    const updateAdmin = await prisma.adminAccount.update({
      where: {
        username: existingAdmin.username
      },
      data: {
        discordServers: {
          disconnect: {
            id: interaction.guild!.id
          }
        }
      }
    });

    return interaction.reply({ content: `✅ Successfully removed admin permissions for <@${discordUser.id}> on this server.`, ephemeral: true });
  } catch (error) {
    console.log('Error removing admin account:', error);
    return interaction.reply({ content: 'Failed to remove admin account.', ephemeral: true });
  }
}