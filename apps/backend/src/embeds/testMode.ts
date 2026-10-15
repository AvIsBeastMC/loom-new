import { EmbedBuilder } from "discord.js";

export const testModeEmbed = new EmbedBuilder()
  .setTitle('📌 Please Note: Test/Developer Mode is ACTIVE')
  .setDescription(`The bot is currently under maintenance. To get rid of this debug message, please turn off test mode for this server.`)
  .setColor("DarkRed")
  .setFooter({ text: 'Developer Mode' })
  .setTimestamp(new Date());