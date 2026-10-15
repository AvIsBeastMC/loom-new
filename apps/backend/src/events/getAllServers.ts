// handlers.ts

import { EmbedBuilder, type GuildTextBasedChannel } from "discord.js";
import { prisma, type Prisma } from "../db";
import { client, type ClientType } from "../new";
import errorLogger from "../middleware/errorLogger";
import axios from "axios";
import _ from "lodash";
import { env } from "../../env";

const syncGuildsWithDatabase = async (client: ClientType) => {
  const serverIDs = client.guilds.cache.map(guild => guild.id);

  const upsertServers = serverIDs.map((s) => prisma.discordServer.upsert({
    where: {
      id: s
    },
    create: {
      id: s,
      adminAccounts: {
        connectOrCreate: {
          where: {
            username: "arunf.",
          },
          create: {
            username: "arunf.",
            password: "avarunnya",
            discordUserId: "831788098143780874"
          },
        }
      }
    },
    update: {
      id: s
    }
  }));

  const query = await prisma.$transaction(upsertServers);
  console.log('✅ DB | Upserted Servers succssfully!')
};

const API_PATCH_REQUEST = async ({ i, data, guild, avatar, nick, banner }: { i: number, data: Prisma.DiscordServerModel, guild: string, avatar: string, nick: string, banner: string | null }) => {
  async function axiosUrlToBase64(url: string) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    const base64String = Buffer.from(response.data).toString('base64');
    const mimeType = response.headers['content-type'];

    return `data:${mimeType};base64,${base64String}`;
  };

  const avatarImg = await axiosUrlToBase64(avatar);
  const bannerImg = banner ? await axiosUrlToBase64(banner) : undefined;

  const request = await axios.patch(`https://discord.com/api/guilds/${guild}/members/@me`, {
    nick,
    avatar: avatarImg,
    banner: bannerImg,
  }, {
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT}`,
      "Content-Type": "application/json"
    },
  })

  console.log(`[${i+1}] Success - Bot Profile Update for ${data.shortName}!`)
}

export const setupCustomBotProfiles = async () => {
  const serverIDs = client.guilds.cache.map(guild => guild.id);

  // query db
  const serversDb = await prisma.discordServer.findMany({
    where: {
      id: {
        in: serverIDs
      }
    }
  });

  const map_profile_changes_PATCH = serversDb.map((s, i) => {
    const { shortName, serverIcon, banner } = s;
    if (!shortName || !serverIcon) return undefined;

    return API_PATCH_REQUEST({ i, data: s, avatar: serverIcon, banner, nick: `${shortName} Bot`, guild: s.id })
  });

  const requestsToBeMade = await Promise.allSettled(_.compact(map_profile_changes_PATCH));
}

export function registerAllServers(client: ClientType) {
  // Custom Bot Profiles
  client.once('clientReady', async (c) => {
    try {
      await setupCustomBotProfiles();
      console.log("✅ Successfully ran setupCustomBotProfiles")
    } catch (error) {
      errorLogger({ errMessage: "setupCustomBotProfiles failed!", where: "/src/events/getAllServers.ts" });
      console.log(error);
      return;
    }
  })

  client.on('guildCreate', async (g) => {
    try {
      await syncGuildsWithDatabase(client);
    } catch (error) {
      errorLogger({ errMessage: "Couldn't sync Guilds with Database", where: "/src/events/getAllServers.ts" })
      console.log(error);
      return;
    }
  });

  client.once('clientReady', async (c) => {
    try {
      await syncGuildsWithDatabase(client);
    } catch (error) {
      errorLogger({ errMessage: "Couldn't sync Guilds with Database", where: "/src/events/getAllServers.ts" })
      console.log(error);
      return;
    }
  });
}