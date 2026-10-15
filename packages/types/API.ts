import { type APIGuild } from 'discord-api-types/v10'
import { z } from 'zod'

export const ai_messages_check_validation = z.object({
  violators: z.array(z.object({ user: z.string(), count: z.number() })),
  violations: z.array(z.object({ user: z.string(), messageIdList: z.string().array() }))
})


export type DiscordResponse = {
  id: string,
  username: string,
  discriminator: string,
  avatar: string | null,
  global_name: string | null
}

export type API_rawServerData = {
  id: string;
  leaveAnnounceChannel: string | null;
  test_mode: boolean;
  test_channel: string | null;
}

type VOICE_CHANNEL_TYPE = 'ANY' | 'CAM_ONLY' | 'CAM_SCREENSHARE'
type VOICE_CHANNEL_PURPOSE = 'PRODUCTIVITY' | 'NONE'

export type API_withServerData = {
  discord: APIGuild;
  id: string;
  shortName: string | null;
  serverIcon: string | null;
  banner: string | null;
  leaveAnnounceChannel: string | null;
  voiceChannelConfigurations: {
    id: string;
    type: VOICE_CHANNEL_TYPE;
    purpose: VOICE_CHANNEL_PURPOSE;
    discordServerId: string;
  }[];
  test_mode: boolean;
  test_channel: string | null;
}[];

export type API_violations = {
  id: string;
  user: string;
  channel: string;
  guildId: string | null;
  time: Date;
  originalContent: string;
}[]

export type API_AI_Reports = {
  server: APIGuild;
  reports: ({
    guild: {
      id: string;
      leaveAnnounceChannel: string | null;
    };
  } & {
    id: string;
    guildId: string;
    generatedBy: string;
    timestamp: Date;
    report: z.infer<typeof ai_messages_check_validation>
  })[];
}[]

export type BuildMetaData = {
  timestamp: string;
  branch: string;
  headCommit: string;
  upstream: string | null;
  isClean: boolean;
  isDirty: boolean;
  commitsAhead: number;
  commitsBehind: number;
  uncommittedFiles: string[];
  diffSummary: string;
}
export type StoreDataAPI = {
  allTestMode: boolean;
  isDev: boolean;
}

export type API_systemroute = {
  store: StoreDataAPI,
  git: BuildMetaData | undefined
}

export type API_latestUpdate = {
  title: string;
  datetime: string;
  content: string;
}