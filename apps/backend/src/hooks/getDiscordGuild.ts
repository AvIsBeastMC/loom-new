import axios, { type AxiosResponse } from "axios";
import { type APIGuild } from "discord-api-types/v10";
import { getGuildAPICache } from "./cache";
import { env } from "../../env";

const pendingGuildRequests = new Map<string, Promise<APIGuild>>();

export async function getDiscordGuild(guild: string): Promise<APIGuild> {
  // Deduplicate direct calls to getDiscordGuild as well
  const inFlight = pendingGuildRequests.get(guild);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const req: AxiosResponse<APIGuild> = await axios.get(
        `https://discord.com/api/v10/guilds/${guild}`,
        {
          headers: {
            Authorization: `Bot ${env.DISCORD_BOT}`,
          },
        }
      );

      getGuildAPICache.set(guild, req.data);
      return req.data;
    } catch (error) {
      throw new Error(JSON.stringify(error));
    } finally {
      pendingGuildRequests.delete(guild);
    }
  })();

  pendingGuildRequests.set(guild, promise);
  return promise;
}

export async function getDiscordGuildCached(guild: string): Promise<APIGuild> {
  const data = getGuildAPICache.get(guild);
  if (data) return data;

  return await getDiscordGuild(guild);
}

export default getDiscordGuild;