import axios, { type AxiosResponse } from "axios";
import { type RESTGetAPIChannelResult } from 'discord-api-types/v10'
import { env } from "../../env";

export default async function getDiscordGuildChannel(channel: string): Promise<RESTGetAPIChannelResult> {
  try {
    const req: AxiosResponse<RESTGetAPIChannelResult> = await axios.get(`https://discord.com/api/v10/channels/${channel}`, {
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT}`
      }
    });

    return req.data;
  } catch (error) {
    throw new Error(JSON.stringify(error));
  }
}