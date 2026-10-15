import { EmbedBuilder } from "discord.js";

type ServerDb = {
  shortName: string | null;
  serverIcon: string | null;
}

type WarnEmbedCreatorTypes = { authorId: string, serverDb: ServerDb, matchesLength: number };
export const warnEmbedCreator = ({ authorId, serverDb, matchesLength }: WarnEmbedCreatorTypes) => new EmbedBuilder()
  .setTitle('⚠️ Warning — Inappropriate Language Detected')
  .setDescription(`<@${authorId}> We strive to keep this community welcoming.\n- **Please** avoid using profanity or offensive language.\n- __We have deleted your message for now.__`)
  .setColor(0xE04B4B)
  .setAuthor({ name: `${serverDb.shortName} Moderation`, iconURL: serverDb.serverIcon || "https://loom-static.arunnya.com/loom.jpg" })
  .addFields(
    { name: 'Matches', value: `${matchesLength} prohibited word(s) detected`, inline: true },
    { name: 'Important', value: 'Repeated offenses can lead to Mute, Kick or even a Ban.', inline: true }
  )
  .setThumbnail(serverDb.serverIcon || "https://loom-static.arunnya.com/loom.jpg")
  .setFooter({ text: 'Be respectful • Community Guidelines', iconURL: serverDb.serverIcon || "https://loom-static.arunnya.com/loom.jpg" })
  .setTimestamp(new Date());