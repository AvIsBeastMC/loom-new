import { useEffect, useState } from "react";
import { CalendarDays, Hash, LoaderCircle, Phone, Server } from "lucide-react";
import Image from "next/image";
import axios, { type AxiosResponse } from "axios";
import type { API_withServerData, DiscordResponse } from "@repo/extra-types";
import type { DashboardViolation, DiscordChannelDetails } from "~/types/dashboard";
import { discordAvatar, discordGuildIcon } from "~/utils/dashboard-api";

type ViolationCardProps = { violation: DashboardViolation };
export type DiscordGuild = API_withServerData[number]["discord"];
type ChannelDetails = DiscordChannelDetails;
const apiBase = process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:1500" : "");

async function fetchDiscordUser(userId: string): Promise<AxiosResponse<DiscordResponse>> {
  return axios.post<DiscordResponse>(`${apiBase}/api/discord/get-user`, { userID: userId });
}

export async function fetchDiscordGuild(guildId: string): Promise<AxiosResponse<DiscordGuild>> {
  return axios.post<DiscordGuild>(`${apiBase}/api/discord/get-guild`, { guildID: guildId });
}

export async function fetchDiscordChannel(channelId: string): Promise<AxiosResponse<ChannelDetails>> {
  return axios.post<ChannelDetails>(`${apiBase}/api/discord/get-guild-channel`, { channelId });
}

function relativeTime(date: string): string {
  const elapsed = Date.now() - new Date(date).getTime();
  const minutes = Math.round(elapsed / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function ViolationCard({ violation }: ViolationCardProps) {
  const [user, setUser] = useState<DiscordResponse | null>(null);
  const [guild, setGuild] = useState<DiscordGuild | null>(null);
  const [channel, setChannel] = useState<ChannelDetails | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    const requests = [
      fetchDiscordUser(violation.user),
      violation.guildId
        ? fetchDiscordGuild(violation.guildId)
        : Promise.resolve(null),
      fetchDiscordChannel(violation.channel),
    ] as const;

    void Promise.all(requests)
      .then(([userResponse, guildResponse, channelResponse]) => {
        if (!active) return;
        setUser(userResponse.data);
        setGuild(guildResponse?.data ?? null);
        setChannel(channelResponse.data);
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
    };
  }, [violation.channel, violation.guildId, violation.user]);

  if (error) {
    return <article className="rounded-lg border border-[#693d39] bg-[#241b19] p-5 text-sm text-[#e78f83]">Could not load Discord details for this violation.</article>;
  }

  if (!user) {
    return (
      <article className="flex min-h-[100px] items-center justify-center gap-2.5 rounded-lg border border-[#2b332d] bg-[#181d19] p-5 text-sm text-[#929b91]">
        <LoaderCircle className="animate-spin" size={19} /> Loading violation details
      </article>
    );
  }

  return (
    <article className="min-w-0 rounded-lg border border-[#2b332d] bg-[#181d19] p-4 transition hover:border-[#535342] sm:p-[19px]">
      <header className="flex min-w-0 items-center gap-3">
        <Image alt="" className="size-12 shrink-0 rounded-full border border-white/10 bg-[#293129] object-cover" height={48} src={discordAvatar(user.id, user.avatar)} unoptimized width={48} />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{user.global_name ?? user.username}</h3>
          <p className="mt-[3px] truncate text-xs text-[#929b91]">@{user.username}</p>
        </div>
        <time className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-[11px] text-[#cbb98e] max-[410px]:text-[10px]" dateTime={violation.time} title={new Date(violation.time).toLocaleString()}>
          <CalendarDays aria-hidden="true" size={15} />{relativeTime(violation.time)}
        </time>
      </header>
      <p className="my-4 wrap-anywhere whitespace-pre-wrap rounded-md border border-[#2b332d] bg-[#151a16] px-[15px] py-3.5 text-sm leading-relaxed text-[#dce0d9]">{violation.originalContent || "No message content recorded."}</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div className="flex min-w-0 items-center gap-[9px] rounded-md border border-[#2a322c] p-2.5 text-[#c2c8bf]">
          {guild ? <Image alt="" className="size-[27px] shrink-0 rounded-full border border-white/10 object-cover" height={27} src={discordGuildIcon(guild)} unoptimized width={27} /> : <Server className="shrink-0 text-[#e6a18d]" size={16} />}
          <span className="grid min-w-0 gap-[3px] truncate text-xs"><small className="text-[10px] text-[#929b91]">Server</small>{guild?.name ?? "Unknown server"}</span>
        </div>
        <div className="flex min-w-0 items-center gap-[9px] rounded-md border border-[#2a322c] p-2.5 text-[#c2c8bf]">
          {channel?.type === 2 ? <Phone className="shrink-0 text-[#e6a18d]" size={16} /> : <Hash className="shrink-0 text-[#e6a18d]" size={16} />}
          <span className="grid min-w-0 gap-[3px] truncate text-xs"><small className="text-[10px] text-[#929b91]">Channel</small>{channel?.name ?? "Channel unavailable"}</span>
        </div>
      </div>
    </article>
  );
}