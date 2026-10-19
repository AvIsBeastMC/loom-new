import type { AxiosResponse } from "axios";
import type { RESTGetAPIUserResult } from "discord-api-types/v10";
import axios from "axios";
import { getUserAPICache } from "./cache";
import { env } from "../../env";

// Tracks active promises only while pending (cleared immediately upon resolution/rejection)
const pendingRequests = new Map<string, Promise<RESTGetAPIUserResult>>();

export const getDiscordUserCached = async (
  userID: string
): Promise<RESTGetAPIUserResult> => {
  // 1. LRU hit: instant return
  const cachedUser = getUserAPICache.get(userID);
  if (cachedUser) return cachedUser;

  // 2. Stampede check: return ongoing HTTP request if already fired
  const inFlight = pendingRequests.get(userID);
  if (inFlight) return inFlight;

  // 3. Fire request and store promise in transient map
  const promise = (async () => {
    try {
      const { data } = await axios.get<RESTGetAPIUserResult>(
        `https://discord.com/api/v10/users/${userID}`,
        {
          headers: { Authorization: `Bot ${env.DISCORD_BOT}` },
        }
      );
      // Store in your LRU instance
      getUserAPICache.set(userID, data);
      return data;
    } finally {
      pendingRequests.delete(userID);
    }
  })();

  pendingRequests.set(userID, promise);
  return promise;
};