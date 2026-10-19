import { type ChatInputCommandInteraction, type CacheType, AttachmentBuilder, EmbedBuilder } from "discord.js";
import { getLeaderboard } from "../../api/routes/leaderboards";
import z from "zod";
import { getTestMode } from "../../hooks/getTestMode";
import { testModeEmbed } from "../../embeds/testMode";

export default async function handleLeaderboards(interaction: ChatInputCommandInteraction<CacheType>) {
  const guild = interaction.guildId;
  if (!guild) return;

  const run = async (testEmbed: boolean) => {
    const durationUnparsed = interaction.options.get('duration')?.value
    const duration = z.enum(['24h', '1month', '1year']).parse(durationUnparsed)

    await interaction.deferReply();

    const image = await getLeaderboard({ guildId: guild, duration })

    // 2. Package as a named attachment
    const attachment = new AttachmentBuilder(image, { name: 'card.png' });

    await interaction.editReply({
      embeds: testEmbed ? [testModeEmbed] : [],
      files: [attachment],
    });
  }

  // test mode
  const testmode = await getTestMode(guild);
  if (testmode.result) {
    if (interaction.channelId == testmode.guild.test_channel) {
      await run(true);
    } else return;
  } else {
    await run(false);
  }
}