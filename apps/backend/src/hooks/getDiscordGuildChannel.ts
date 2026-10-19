import axios, { type AxiosResponse } from "axios";
import { type RESTGetAPIChannelResult } from "discord-api-types/v10";
import { env } from "../../env";

const pendingChannelRequests = new Map<string, Promise<RESTGetAPIChannelResult>>();

export default async function getDiscordGuildChannel(
  channel: string
): Promise<RESTGetAPIChannelResult> {
  const inFlight = pendingChannelRequests.get(channel);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const req: AxiosResponse<RESTGetAPIChannelResult> = await axios.get(
        `https://discord.com/api/v10/channels/${channel}`,
        {
          headers: {
            Authorization: `Bot ${env.DISCORD_BOT}`,
          },
        }
      );

      return req.data;
    } catch (error) {
      throw new Error(JSON.stringify(error));
    } finally {
      pendingChannelRequests.delete(channel);
    }
  })();

  pendingChannelRequests.set(channel, promise);
  return promise;
}