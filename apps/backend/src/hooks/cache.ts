import type { APIGuild, RESTGetAPIChannelResult, RESTGetAPIGuildChannelsResult, RESTGetAPIUserResult } from 'discord-api-types/v10';
import { LRUCache } from 'lru-cache';
import type { GetServerEmbedInfo } from './getServerEmbedInfo';
import type { Prisma } from '@repo/db/index';

// Create a cache instance with a maximum size and optional TTL
const getUserAPICache = new LRUCache<string, RESTGetAPIUserResult>({
  max: 100, // Maximum number of items
  ttl: 1000 * 60 * 60 * 12, // Items expire after 12 hours
  // other options like onEviction callback
});

const getGuildAPICache = new LRUCache<string, APIGuild>({
  max: 100, // Maximum number of items
  ttl: 1000 * 60 * 60 * 12, // Items expire after 12 hours
  // other options like onEviction callback
});

const getGuildChannelCache = new LRUCache<string, RESTGetAPIChannelResult>({
  max: 100, // Maximum number of items
  ttl: 1000 * 60 * 60 * 24, // Items expire after 24 hours
});

const getServerEmbedInfoCache = new LRUCache<string, GetServerEmbedInfo>({
  max: 100, // Maximum number of items
  ttl: 1000 * 60 * 60 * 48, // Items expire after 48 hours
});

const getVCChannelConfigCache: LRUCache<string, Prisma.VoiceChannelConfigurationModel> = new LRUCache({
  max: 100, // Maximum number of items
  ttl: 1000 * 60 * 5, // Items expire after 5 minutes
});

export { getUserAPICache, getGuildAPICache, getGuildChannelCache, getServerEmbedInfoCache, getVCChannelConfigCache };