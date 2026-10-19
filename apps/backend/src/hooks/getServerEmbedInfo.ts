import { prisma } from "../db";
import { getServerEmbedInfoCache } from "./cache";

export type GetServerEmbedInfo = {
  id: string;
  shortName: string | null;
  serverIcon: string | null;
};

const pendingEmbedRequests = new Map<string, Promise<GetServerEmbedInfo>>();

export const getServerEmbedInfo = async (id: string): Promise<GetServerEmbedInfo> => {
  const info = getServerEmbedInfoCache.get(id);

  // Return immediately if complete in cache
  if (info && info.shortName && info.serverIcon) {
    return info;
  }

  // Deduplicate ongoing Prisma queries for the same server ID
  const inFlight = pendingEmbedRequests.get(id);
  if (inFlight) return inFlight;

  const promise = (async () => {
    try {
      const query = await prisma.discordServer.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          serverIcon: true,
          shortName: true,
        },
      });

      getServerEmbedInfoCache.set(id, query);
      return query;
    } finally {
      pendingEmbedRequests.delete(id);
    }
  })();

  pendingEmbedRequests.set(id, promise);
  return promise;
};