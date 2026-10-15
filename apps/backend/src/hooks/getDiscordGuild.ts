import axios, { type AxiosResponse } from "axios";
import { type APIGuild } from 'discord-api-types/v10'
import { getGuildAPICache } from "./cache";
import { env } from "../../env";

export async function getDiscordGuild(guild: string): Promise<APIGuild> {
  try {
    const req: AxiosResponse<APIGuild> = await axios.get(`https://discord.com/api/v10/guilds/${guild}`, {
      headers: {
        Authorization: `Bot ${env.DISCORD_BOT}`
      }
    });

    getGuildAPICache.set(guild, req.data);

    return req.data;
  } catch (error) {
    throw new Error(JSON.stringify(error));
  }
}

export async function getDiscordGuildCached(guild: string): Promise<APIGuild> {
  const data = getGuildAPICache.get(guild)

  if (data) return data;
  return await getDiscordGuild(guild)
}

export default getDiscordGuild;