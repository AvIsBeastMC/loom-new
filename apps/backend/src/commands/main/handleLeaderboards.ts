import { type ChatInputCommandInteraction, type CacheType, AttachmentBuilder, EmbedBuilder } from "discord.js";
import { getLeaderboard } from "../../api/routes/leaderboards";
import z from "zod";

export default async function handleLeaderboards(interaction: ChatInputCommandInteraction<CacheType>) {
  const guild = interaction.guildId;
  if (!guild) return;

  const durationUnparsed = interaction.options.get('duration')?.value
  const duration = z.enum(['24h', '1month', '1year']).parse(durationUnparsed)

  await interaction.deferReply();

  const image = await getLeaderboard({ guildId: guild, duration })

  // 2. Package as a named attachment
  const attachment = new AttachmentBuilder(image, { name: 'card.png' });
  await interaction.editReply({
    files: [attachment],
  });
}