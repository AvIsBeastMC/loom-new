// handlers.ts

import { ChannelType, EmbedBuilder, GuildMember, PermissionFlagsBits, type ApplicationCommandDataResolvable, type GuildTextBasedChannel } from "discord.js";
import { prisma } from "../db";
import type { ClientType } from "../new";
import commandHandlers from "../commands/commandHandlers";
import fs from 'fs/promises'
import path from "path";
import { fileURLToPath } from "node:url";
import errorLogger from "../middleware/errorLogger";
import moment from "moment";
import { getDiscordGuildCached } from "../hooks/getDiscordGuild";
import { getServerEmbedInfo } from "../hooks/getServerEmbedInfo";

export function handleButtons(client: ClientType) {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'verification') {
      if (!interaction.guild || !interaction.member) return;
      const guild = interaction.guild;
      const member = interaction.member

      // Try to DM user here,   
      try {
        // 1. Build your embed
        // fetch md
        const __dirname = path.dirname(fileURLToPath(import.meta.url));
        const filePath = path.join(__dirname, '../messages/DMverify.md');

        const serverEmbedInfo = await getServerEmbedInfo(guild.id)
        const serverDisplayName = serverEmbedInfo.shortName ?? guild.name;
        const serverIconUrl = serverEmbedInfo.serverIcon || 'https://loom-static.arunnya.com/loom.jpg';

        try {
          const content = await fs.readFile(filePath, 'utf8');

          const verifyEmbed = new EmbedBuilder()
            .setColor("Blue")
            .setThumbnail('https://loom-static.arunnya.com/welcome.jpg')
            .setDescription(content)
            .setTimestamp();

          const pleaseWaitEmbed = new EmbedBuilder()
            .setAuthor({ name: `Welcome to ${serverDisplayName}`, iconURL: serverIconUrl })
            .setColor("Blue")
            .setThumbnail('https://loom-static.arunnya.com/welcome.jpg')
            .setTitle('⏱️ Please Wait...')
            .setDescription(`We're setting up the verification process for you...`)
            .setTimestamp();

          await interaction.deferReply({
            ephemeral: true
          })

          const query = await prisma.guildMember.upsert({
            where: {
              guild: {
                id: interaction.guildId!,
              },
              userId: interaction.user.id,
            },
            create: {
              guild: {
                connectOrCreate: {
                  where: {
                    id: interaction.guildId!,
                  },
                  create: {
                    id: interaction.guildId!
                  }
                }
              },
              userId: interaction.user.id,
            },
            update: {
              guild: {
                connectOrCreate: {
                  where: {
                    id: interaction.guildId!,
                  },
                  create: {
                    id: interaction.guildId!
                  }
                }
              },
              userId: interaction.user.id,
            }
          })

          // const verification_failed = new EmbedBuilder()
          //   .setAuthor({ name: 'Welcome to Loom', iconURL: 'https://loom-static.arunnya.com/loom.jpg' })
          //   .setColor("Red")
          //   .setThumbnail('https://loom-static.arunnya.com/welcome.jpg')
          //   .setTitle('❌ We could not send you the message...')
          //   .setDescription("Please check your settings to allow direct messages to be received from this server so our bot could proceed with the verificaation in your DMs...")
          //   .setTimestamp();

          if (interaction.member instanceof GuildMember) {
            // Autocomplete works here: interaction.member.roles is GuildMemberRoleManager
            const hasRole = interaction.member.roles.cache.has('1498379748986847304');

            const verification_alreadyVerified = new EmbedBuilder()
              .setAuthor({ name: `Welcome to ${serverDisplayName}`, iconURL: serverIconUrl })
              .setColor("Purple")
              .setThumbnail('https://loom-static.arunnya.com/welcome.jpg')
              .setTitle(`✅ You're already verified!`)
              .setDescription(`Hey! We've already verified you! Nothing to worry 'bout anymore! :D`)

            if (hasRole) {
              await interaction.editReply({
                embeds: [verification_alreadyVerified],
              })

              return;
            }

          }

          if (query.verificationStatus == 'MSG_SENT' && query.verificationChannelId) {
            // first check if the channel still exists or not, reset if it doesn't. 
            try {
              const channel = await client.channels.fetch(query.verificationChannelId)

              const verification_alreadySent = new EmbedBuilder()
                .setAuthor({ name: `Welcome to ${serverDisplayName}`, iconURL: serverIconUrl })
                .setColor("Green")
                .setThumbnail('https://loom-static.arunnya.com/welcome.jpg')
                .setTitle('ℹ️ Verification Thready already been created!')
                .setDescription(`Hey! Our bot has already created a verification thread for you and sent message with instructions there on how to proceed: <#${query.verificationChannelId}>, please work with us there! <3`)

              try {
                await interaction.editReply({
                  embeds: [verification_alreadySent],
                });
              } catch (error) {
                errorLogger({ errMessage: `Thread is already created but couldnt send alreadySent ephemeral, failed to send ephemeral "alreadySent"`, where: "src/events/handleButtons.ts | user verification" });
                console.log(error);
              };

              return;
            } catch (error) {
              // @ts-ignore
              if (error.code === 10003) {
                console.log('Channel does not exist or was deleted. Continuing... ')
              } else {
                errorLogger({ errMessage: "Channel fetching error", where: "/src/events/handleButtons.ts" })
                console.error('An error occurred:', error);
                return;
              }
            }
          };

          try {
            // Create channel under category, send message there.
            const channel = await guild.channels.create({
              name: `${interaction.user.username}`,
              parent: "1554799191253848064",
              type: ChannelType.GuildText,
              topic: `Verification for user ${interaction.user.displayName} / username: ${interaction.user.username}, created: ${moment().format("lll")}`,
              permissionOverwrites: [
                // 1. Block everyone else from seeing the channel
                {
                  id: guild.roles.everyone.id,
                  deny: [PermissionFlagsBits.ViewChannel],
                },
                // 2. Grant full read/write/history to Admin
                {
                  id: "1498320546679623791",
                  allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                  ],
                },
                // 3. Grant full read/write/history to User
                {
                  id: interaction.user.id,
                  allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                  ],
                },
              ],
            })

            await channel.send({
              embeds: [verifyEmbed]
            });

            const verification_success = new EmbedBuilder()
              .setAuthor({ name: `Welcome to ${serverDisplayName}`, iconURL: serverIconUrl })
              .setColor("Yellow")
              .setThumbnail('https://loom-static.arunnya.com/welcome.jpg')
              .setTitle('✅ Verification Thread created successfully!')
              .setDescription(`Instructions have been sent at <#${channel.id}> Please respond there and we'll have you onboard soon!!`)
              .setTimestamp();

            await prisma.guildMember.update({
              where: {
                userId_guildId: {
                  guildId: guild.id,
                  userId: member.user.id
                }
              },
              data: {
                verificationChannelId: channel.id,
                verificationStatus: 'MSG_SENT'
              }
            })

            await interaction.editReply({
              embeds: [verification_success],
            });
          } catch (error) {
            errorLogger({ errMessage: "Something went wrong in the main process of verification creation", where: "/src/events/handleButtons.ts" });
            console.log(error);
            return;
          }
        } catch (error) {
          errorLogger({ errMessage: "Something went wrong.", where: "src/events/handleButtons.ts | customId = verification" })
          console.log(error);
          return;
        }
      } catch (error) {
        // 4. Handle cases where the user has DMs closed/blocked
        console.error(`Something went wrong:`, error);

        await interaction.reply({
          content: 'You were verified, but I could not send you a DM (your DMs might be closed).',
          ephemeral: true,
        });
      }
    }
  });
}