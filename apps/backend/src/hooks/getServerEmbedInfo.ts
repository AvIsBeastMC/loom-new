import { prisma } from "../db";
import { getServerEmbedInfoCache } from "./cache";

export type GetServerEmbedInfo = {
  id: string;
  shortName: string | null;
  serverIcon: string | null;
}

export const getServerEmbedInfo = async (id: string): Promise<GetServerEmbedInfo> => {
  const info = getServerEmbedInfoCache.get(id);

  if (!info || !info.shortName || !info.serverIcon) {
    const query = await prisma.discordServer.findUniqueOrThrow({
      where: {
        id
      },
      select: {
        id: true,
        serverIcon: true,
        shortName: true
      }
    });

    getServerEmbedInfoCache.set(id, query)

    return query;
  } else return info
}