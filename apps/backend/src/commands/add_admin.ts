import type { ChatInputCommandInteraction, CacheType } from 'discord.js';
import { prisma } from '../db';

export default async function handleAddAdmin(interaction: ChatInputCommandInteraction<CacheType>) {
  // go
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
    const username = interaction.options.getString('username', true);
    const password = interaction.options.getString('password', true);

    const existingAdmin = await prisma.adminAccount.findUnique({
      where: {
        username: username
      },
      include: {
        discordServers: true
      }
    });

    if (existingAdmin) {
      // add linking and return.
      const updateExistingAdmin = await prisma.adminAccount.update({
        where: {
          username: existingAdmin.username
        },
        data: {
          discordServers: {
            connectOrCreate: {
              create: {
                id: interaction.guild!.id,
              },
              where: {
                id: interaction.guild!.id,
              }
            }
          }
        }
      });

      const reply = existingAdmin.discordServers.find((server) => server.id == interaction.guild!.id) ? "❌ The admin already exists and is linked to this server as one." : "✅ We have linked an existing admin account to run admin commands on this server. The user can now proceed to use admin accounts.";

      return interaction.reply({ content: reply, ephemeral: true });
    }

    const newAdmin = await prisma.adminAccount.create({
      data: {
        username,
        password,
        discordUserId: discordUser.id,
        discordServers: {
          connectOrCreate: {
            create: {
              id: interaction.guild!.id,
            },
            where: {
              id: interaction.guild!.id,
            }
          }
        }
      }
    });

    return interaction.reply({ content: `Admin account setup successfully for <@${discordUser.id}>!`, ephemeral: true });
  } catch (error) {
    console.log('Error creating admin account:', error);
    return interaction.reply({ content: 'Failed to create admin account.', ephemeral: true });
  }
}