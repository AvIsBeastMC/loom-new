import { useEffect, useState } from "react";
import { Hash, Phone, Radio, Users } from "lucide-react";
import Image from "next/image";
import type { DiscordResponse } from "@repo/extra-types";
import type { VoiceSessionRow } from "~/hooks/getRealtimeVoice";
import { discordAvatar, discordGuildIcon } from "~/utils/dashboard-api";
import { fetchDiscordUser } from "./ReportServerCard";
import { fetchDiscordChannel, fetchDiscordGuild, type DiscordGuild } from "./ViolationCard";
import type { DiscordChannelDetails } from "~/types/dashboard";

function formatElapsed(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const days = Math.floor(safeSeconds / 86_400);
  const hours = Math.floor((safeSeconds % 86_400) / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);
  const remainder = safeSeconds % 60;
  const clock = [hours, minutes, remainder].map((value) => String(value).padStart(2, "0")).join(":");
  return days > 0 ? `${days}d ${clock}` : clock;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const UserVoiceSession = ({ session }: { session: VoiceSessionRow }) => {
  const [user, setUser] = useState<DiscordResponse>();
  const [channel, setChannel] = useState<DiscordChannelDetails>();
  const [guild, setGuild] = useState<DiscordGuild>();

  const [now, setNow] = useState(() => Date.now());

  const isActive = session.status === "ACTIVE";
  const elapsedSeconds = isActive
    ? (now - new Date(session.joined_at).getTime()) / 1_000
    : session.duration_seconds;

  useEffect(() => {
    let mounted = true;
    void fetchDiscordUser(session.user_id)
      .then(({ data }) => { if (mounted) setUser(data); })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, [session.user_id]);

  useEffect(() => {
    let mounted = true;
    void fetchDiscordGuild(session.guild_id)
      .then(({ data }) => { if (mounted) setGuild(data); })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, [session.guild_id]);

  useEffect(() => {
    let mounted = true;
    void fetchDiscordChannel(session.channel_id)
      .then(({ data }) => { if (mounted) setChannel(data); })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, [session.channel_id]);

  useEffect(() => {
    if (!isActive) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [isActive, session.joined_at]);

  const displayName = user?.global_name ?? user?.username ?? "Loading member";
  const username = user?.username ? `@${user.username}` : session.user_id;

  return (
    <article className={`min-w-0 rounded-lg border bg-[#181d19] ${isActive ? "border-[#485a43]" : "border-[#2b332d]"}`}>
      <div className="flex min-w-0 items-center gap-3 border-b border-[#2b332d] px-4 py-3.5 sm:px-[18px]">
        <Image alt="" className="size-11 shrink-0 rounded-full border border-white/10 bg-[#293129] object-cover" height={44} src={discordAvatar(session.user_id, user?.avatar ?? "")} unoptimized width={44} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[#f0f2ec]">{displayName}</h3>
          <p className="mt-1 truncate text-[11px] text-[#929b91]">{username}</p>
        </div>
        {isActive ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#455b3e] bg-[#222d21] px-2.5 py-1 text-[10px] font-semibold uppercase text-[#b8d59a]">
            <Radio aria-hidden="true" size={12} /> Live
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 px-4 py-4 sm:px-[18px]">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase text-[#929b91]">{isActive ? "Connected for" : "Session length"}</p>
          <p className={`mt-1 font-mono text-[24px] font-semibold tabular-nums leading-none ${isActive ? "text-[#d8e7c8]" : "text-[#d0d5cc]"}`}>
            {formatElapsed(elapsedSeconds)}
          </p>
          <p className="mt-2 text-[10px] text-[#929b91]">{isActive ? "Joined" : "Ended"} {formatTimestamp(isActive ? session.joined_at : session.left_at ?? session.joined_at)}</p>
        </div>
        <div className="grid min-w-0 justify-items-end gap-2 text-[10px] text-[#aab2a8]">
          {channel && (
            <span className="inline-flex max-w-full items-center gap-1.5"><Phone aria-hidden="true" className="shrink-0 text-[#e1aa91]" size={13} /><span className="max-w-[130px] truncate">{channel.name}</span></span>
          )}
          {guild && (
            <span className="inline-flex max-w-full items-center gap-1.5">
              <span className="max-w-[130px] truncate">
                <div className="flex flex-row items-center gap-2"><Image alt="" className="size-[20px] shrink-0 rounded-full border border-white/10 object-cover" height={20} src={discordGuildIcon(guild)} unoptimized width={20} />
                  {guild.name}</div>
              </span>
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

export default UserVoiceSession;