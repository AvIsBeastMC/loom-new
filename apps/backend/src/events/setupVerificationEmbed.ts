// handlers.ts

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type GuildTextBasedChannel } from "discord.js";
import { prisma } from "../db";
import type { ClientType } from "../new";
import commandHandlers from "../commands/commandHandlers";
import { env } from "../../env";
export function setupVerificationEmbedMsg(client: ClientType) {
  client.on('clientReady', (state) => {
    (async () => {
      if (env.SEND_EMBED_IN_VERIFICATION) {
        // clear 20 messages
        const verifyChannel = client.channels.cache.get("1554518464620797962") as (GuildTextBasedChannel | undefined);

        if (!verifyChannel) return;

        await verifyChannel.bulkDelete(50, true);

        // Create Message
        // Setup an embed message that will be sent tot his channel with a button for verify, basically the message has to contain instructions where the bot will send message to their DMs and they'll need to respond there accordingly. 

        const embed = new EmbedBuilder()
          .setTitle('Verification Required')
          .setDescription("- To get started, please click the button below to verify yourself.\n- A private thread will be created for you here on the server with the next steps, and we’ll guide you through everything from there.\n\nWe’re excited to have you with us! ❤️")
          .setColor(0xE04B4B)
          .setThumbnail('https://loom-static.arunnya.com/welcome.jpg')
        // .setFooter({ text: 'Be respectful • Community Guidelines', iconURL: 'https://loom-static.arunnya.com/loom.jpg' })

        // 2. Create the Button
        const button = new ButtonBuilder()
          .setCustomId('verification') // Unique identifier for event handling
          .setLabel('Verify')          // Text displayed on the button
          .setStyle(ButtonStyle.Danger)  // Button style/color (Primary = Blue)
          .setEmoji('🚀');               // Optional emoji

        // 3. Put the button inside an Action Row
        const row = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(button);

        const message = await verifyChannel.send({ embeds: [embed], components: [row] });
      } else {

      }
    })();
  });
}