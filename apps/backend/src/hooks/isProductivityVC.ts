import { prisma, type Prisma } from '../db';
import { getVCChannelConfigCache } from './cache';

const fetchVCData = async (channelId: string): Promise<Prisma.VoiceChannelConfigurationModel> => {
  return await prisma.voiceChannelConfiguration.findUniqueOrThrow({
    where: {
      id: channelId
    }
  })
}

export async function getData(channelId: string): Promise<Prisma.VoiceChannelConfigurationModel> {
  const data = getVCChannelConfigCache.get(channelId)

  if (data) return data;

  return await fetchVCData(channelId);
}

export default async function ({ channelId }: { channelId: string }) {
  try {
    const channel = await getData(channelId);
    return channel.purpose == 'PRODUCTIVITY';
  } catch (error) {
    // Configuration hasn't been set up.
    return false;
  }
}