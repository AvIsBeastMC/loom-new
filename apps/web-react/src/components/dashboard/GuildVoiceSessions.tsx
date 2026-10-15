import { Activity, ChevronDown, CircleIcon, Clock3, Filter, RadioIcon, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import type { API_withServerData, DiscordResponse } from "@repo/extra-types";
import { useGetRealtimeVoice } from "~/hooks/getRealtimeVoice";
import type { VoiceSessionRow } from "~/hooks/getRealtimeVoice";
import { discordAvatar, discordGuildIcon } from "~/utils/dashboard-api";
import { LoadState } from "~/components/dashboard/LoadState";
import { fetchDiscordUser } from "~/components/dashboard/ReportServerCard";
import { fetchDiscordChannel } from "~/components/dashboard/ViolationCard";
import UserVoiceSession from "~/components/dashboard/UserVoiceSession";

const DAY_IN_SECONDS = 86_400;

type GuildVoiceSessionsProps = { guild: API_withServerData[number]["discord"] };

function getRecentOverlapSeconds(session: VoiceSessionRow, now: number): number {
  const joinedAt = new Date(session.joined_at).getTime();
  const endedAt = session.status === "ACTIVE" ? now : new Date(session.left_at ?? session.joined_at).getTime();
  if (!Number.isFinite(joinedAt) || !Number.isFinite(endedAt)) return 0;
  return Math.max(0, Math.min(endedAt, now) - Math.max(joinedAt, now - DAY_IN_SECONDS * 1_000)) / 1_000;
}

function formatLeaderboardDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0 && remainingMinutes === 0) return "under 1m";
  return hours > 0 ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
}

function LeaderboardEntry({
  userId,
  rank,
  seconds,
  maxSeconds,
}: {
  userId: string;
  rank: number;
  seconds: number;
  maxSeconds: number;
}) {
  const [user, setUser] = useState<DiscordResponse | null>();

  useEffect(() => {
    let mounted = true;
    void fetchDiscordUser(userId)
      .then(({ data }) => { if (mounted) setUser(data); })
      .catch(() => { if (mounted) setUser(null); });
    return () => { mounted = false; };
  }, [userId]);

  const name = user === null ? userId : user?.global_name ?? user?.username ?? "Loading member";
  const progress = maxSeconds > 0 ? (seconds / maxSeconds) * 100 : 0;

  return (
    <li className="w-full grid grid-cols-[26px_36px_minmax(0,1fr)_auto] items-center gap-3 border-b border-[#29312b] py-3 last:border-b-0">
      <span className={`text-center font-mono text-xs font-semibold tabular-nums ${rank === 1 ? "text-[#e0c58b]" : "text-[#818a80]"}`}>{String(rank).padStart(2, "0")}</span>
      <Image alt="" className="size-9 rounded-full border border-white/10 bg-[#293129] object-cover" height={36} src={discordAvatar(userId, user?.avatar ?? "")} unoptimized width={36} />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-[#e1e5dc]">{name}</p>
        <div aria-hidden="true" className="mt-2 h-1 overflow-hidden rounded-full bg-[#2a322c]"><div className="h-full rounded-full bg-[#a9c786]" style={{ width: `${progress}%` }} /></div>
      </div>
      <strong className="whitespace-nowrap text-xs font-semibold tabular-nums text-[#d9dfd3]">{formatLeaderboardDuration(seconds)}</strong>
    </li>
  );
}

export function GuildVoiceSessions({ guild }: GuildVoiceSessionsProps) {
  const { sessions: allSessions, loading, error } = useGetRealtimeVoice();
  const [visiblePastCount, setVisiblePastCount] = useState(4);
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);
  const [pastSort, setPastSort] = useState<"recent" | "duration">("recent");
  const [now, setNow] = useState(() => Date.now());
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<string>>(() => new Set());
  const [channelNames, setChannelNames] = useState<Record<string, string>>({});
  const sessions = useMemo(() => allSessions.filter((session) => session.guild_id === guild.id), [allSessions, guild.id]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const active = useMemo(
    () => sessions.filter((session) => session.status === "ACTIVE")
      .sort((first, second) => new Date(first.joined_at).getTime() - new Date(second.joined_at).getTime()),
    [sessions],
  );
  const past = useMemo(
    () => sessions.filter((session) => session.status === "PAST")
      .sort((first, second) => pastSort === "duration"
        ? second.duration_seconds - first.duration_seconds
        : new Date(second.left_at ?? 0).getTime() - new Date(first.left_at ?? 0).getTime()),
    [sessions, pastSort],
  );
  const totalTrackedSeconds = sessions.reduce((total, session) => total + session.duration_seconds, 0);
  const trackedHours = Math.floor(totalTrackedSeconds / 3_600);
  const trackedMinutes = Math.floor((totalTrackedSeconds % 3_600) / 60);
  const visiblePast = past.slice(0, visiblePastCount);
  const hasMorePast = visiblePastCount < past.length;
  const channelIds = useMemo(
    () => [...new Set(sessions.filter((session) => getRecentOverlapSeconds(session, now) > 0).map((session) => session.channel_id))].sort(),
    [sessions, now],
  );
  const channelIdsKey = channelIds.join(",");
  const leaderboard = useMemo(() => {
    const totals = new Map<string, number>();
    for (const session of sessions) {
      if (selectedChannelIds.size > 0 && !selectedChannelIds.has(session.channel_id)) continue;
      const seconds = getRecentOverlapSeconds(session, now);
      if (seconds > 0) totals.set(session.user_id, (totals.get(session.user_id) ?? 0) + seconds);
    }
    return [...totals.entries()].map(([userId, seconds]) => ({ userId, seconds }))
      .sort((first, second) => second.seconds - first.seconds);
  }, [sessions, now, selectedChannelIds]);
  const visibleLeaderboard = showAllLeaderboard ? leaderboard : leaderboard.slice(0, 5);
  const maxLeaderboardSeconds = leaderboard[0]?.seconds ?? 0;

  useEffect(() => {
    let mounted = true;
    const ids = channelIdsKey ? channelIdsKey.split(",") : [];
    void Promise.all(ids.map(async (channelId) => {
      try {
        const { data } = await fetchDiscordChannel(channelId);
        return [channelId, data.name ?? `Channel ${channelId.slice(-5)}`] as const;
      } catch {
        return [channelId, `Channel ${channelId.slice(-5)}`] as const;
      }
    })).then((entries) => {
      if (mounted) setChannelNames(Object.fromEntries(entries));
    });
    return () => { mounted = false; };
  }, [channelIdsKey]);

  return (
    <div className="space-y-7">

      {loading || error ? <LoadState loading={loading} error={error?.message} /> : (
        <>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div className="flex min-w-0 items-center gap-3 rounded-lg border border-[#455b3e] bg-[#1b231c] px-4 py-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#283728] text-[#b8d59a]"><RadioIcon aria-hidden="true" size={17} /></span>
              <div><p className="text-[10px] font-bold uppercase text-[#a9b2a8]">Connected now</p><p className="mt-0.5 text-xl font-semibold tabular-nums">{active.length}</p></div>
            </div>
            <div className="flex min-w-0 items-center gap-3 rounded-lg border border-[#2b332d] bg-[#181d19] px-4 py-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#272c24] text-[#e0c58b]"><Users aria-hidden="true" size={17} /></span>
              <div><p className="text-[10px] font-bold uppercase text-[#a9b2a8]">Sessions recorded</p><p className="mt-0.5 text-xl font-semibold tabular-nums">{sessions.length}</p></div>
            </div>
            <div className="flex min-w-0 items-center gap-3 rounded-lg border border-[#2b332d] bg-[#181d19] px-4 py-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#332820] text-[#e6a18d]"><Clock3 aria-hidden="true" size={17} /></span>
              <div><p className="text-[10px] font-bold uppercase text-[#a9b2a8]">Completed time</p><p className="mt-0.5 text-xl font-semibold tabular-nums">{trackedHours}h {trackedMinutes}m</p></div>
            </div>
          </div>

          <section aria-labelledby="voice-leaderboard-title" className="border-y border-[#2b332d] py-5">
            <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#332d20] text-[#e0c58b]"><Trophy aria-hidden="true" size={17} /></span>
                <div><h3 className="text-sm font-semibold" id="voice-leaderboard-title">Voice time leaderboard</h3><p className="mt-1 text-[11px] text-[#929b91]">Time spent in {guild.name} during the last 24 hours</p></div>
              </div>
              <details className="group relative self-start sm:self-auto">
                <summary className="flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-[#343d35] bg-[#1b211c] px-3 text-xs font-semibold text-[#c5cbc2] transition-colors hover:border-[#59645a] hover:bg-[#232a24] [&::-webkit-details-marker]:hidden">
                  <Filter aria-hidden="true" className="text-[#a9c786]" size={14} /> Filter channels
                  <span className="rounded bg-[#2b332d] px-1.5 py-0.5 text-[10px] tabular-nums text-[#c5cbc2]">{selectedChannelIds.size || "All"}</span>
                </summary>
                <div className="absolute right-0 z-10 mt-2 w-[min(360px,calc(100vw-32px))] rounded-md border border-[#39433b] bg-[#181d19] p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between gap-3 border-b border-[#2b332d] pb-2"><span className="text-[10px] font-bold uppercase text-[#929b91]">Channels in {guild.name}</span><button className="text-[11px] font-semibold text-[#a9c786] hover:text-[#c7dda9] disabled:text-[#667064]" disabled={selectedChannelIds.size === 0} onClick={() => setSelectedChannelIds(new Set())} type="button">Clear filter</button></div>
                  {channelIds.length ? (
                    <ul className="max-h-60 space-y-1 overflow-y-auto">
                      {channelIds.map((channelId) => (
                        <li key={channelId}><label className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 hover:bg-[#232a24]">
                          <input checked={selectedChannelIds.has(channelId)} className="size-3.5 accent-[#a9c786]" onChange={(event) => setSelectedChannelIds((current) => { const next = new Set(current); if (event.target.checked) next.add(channelId); else next.delete(channelId); return next; })} type="checkbox" />
                          <span className="min-w-0 flex-1 truncate text-xs text-[#d9dfd3]">{channelNames[channelId] ?? `Channel ${channelId.slice(-5)}`}</span><span className="max-w-32 truncate font-mono text-[10px] text-[#828b81]" title={channelId}>{channelId}</span>
                        </label></li>
                      ))}
                    </ul>
                  ) : <p className="py-3 text-xs text-[#929b91]">No channels recorded in this period.</p>}
                </div>
              </details>
            </div>
            {leaderboard.length ? <>
              <ol>{visibleLeaderboard.map((entry, index) => <LeaderboardEntry key={entry.userId} userId={entry.userId} rank={index + 1} seconds={entry.seconds} maxSeconds={maxLeaderboardSeconds} />)}</ol>
              {leaderboard.length > 5 ? <button className="mt-3 min-h-9 w-full rounded-md border border-[#343d35] bg-[#1b211c] px-3.5 text-xs font-semibold text-[#c5cbc2] transition-colors hover:border-[#59645a] hover:bg-[#232a24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a9c786]" onClick={() => setShowAllLeaderboard((showAll) => !showAll)} type="button">{showAllLeaderboard ? "Show Top 5" : "See All"}</button> : null}
            </> : (
              <div className="rounded-md border border-dashed border-[#39433b] bg-[#151a16] px-4 py-5 text-xs text-[#929b91]">{selectedChannelIds.size ? "No voice time found for the selected channels in the last 24 hours." : `No voice time recorded in ${guild.name} in the last 24 hours.`}</div>
            )}
          </section>

          <section aria-labelledby="active-sessions-title">
            <div className="mb-3 flex items-center justify-between gap-4"><div><h3 className="text-sm font-semibold" id="active-sessions-title">Live sessions</h3><p className="mt-1 text-[11px] text-[#929b91]">Elapsed time updates every second</p></div><span className="text-[11px] tabular-nums text-[#a9c786]">{active.length} active</span></div>
            {active.length ? <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">{active.map((session) => <UserVoiceSession key={session.id} session={session} />)}</div> : (
              <div className="flex min-h-[112px] items-center gap-3 rounded-lg border border-dashed border-[#39433b] bg-[#151a16] px-4 py-5 sm:px-5"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#202720] text-[#929b91]"><RadioIcon aria-hidden="true" size={17} /></span><div><p className="text-xs font-semibold text-[#d9ded6]">No one is connected right now</p><p className="mt-1 text-[11px] text-[#929b91]">New voice sessions in {guild.name} will appear here.</p></div></div>
            )}
          </section>

          <section aria-labelledby="past-sessions-title">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-semibold" id="past-sessions-title">Recent sessions</h3><p className="mt-1 text-[11px] text-[#929b91]">{pastSort === "recent" ? "Most recently ended first" : "Longest sessions first"}</p></div><div className="flex items-center gap-3"><label className="flex items-center gap-2 text-[11px] font-semibold text-[#929b91]" htmlFor="past-session-sort">Sort by<select className="min-h-9 rounded-md border border-[#343d35] bg-[#1b211c] px-2.5 text-xs font-semibold text-[#c5cbc2] outline-none transition-colors hover:border-[#59645a] focus-visible:border-[#a9c786] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a9c786]" id="past-session-sort" onChange={(event) => setPastSort(event.target.value as "recent" | "duration")} value={pastSort}><option value="recent">Most recently ended</option><option value="duration">Longest session</option></select></label><span className="whitespace-nowrap text-[11px] tabular-nums text-[#929b91]">{past.length} total</span></div></div>
            {past.length ? <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">{visiblePast.map((session) => <UserVoiceSession key={session.id} session={session} />)}</div> : (
              <div className="rounded-lg border border-[#2b332d] bg-[#181d19] px-4 py-5 text-[11px] text-[#929b91]">Completed sessions for {guild.name} will appear here.</div>
            )}
            {hasMorePast ? <div className="mt-4 flex flex-col items-start justify-between gap-3 border-t border-[#2b332d] pt-3 sm:flex-row sm:items-center"><span className="text-[11px] tabular-nums text-[#929b91]">Showing {visiblePast.length} of {past.length}</span><div className="flex w-full flex-wrap gap-2 sm:w-auto"><button className="inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md border border-[#455b3e] bg-[#222d21] px-3.5 text-xs font-semibold text-[#c7dda9] transition-colors hover:border-[#6b825d] hover:bg-[#293729] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a9c786] sm:flex-none" onClick={() => setVisiblePastCount((count) => count + 4)} type="button"><ChevronDown aria-hidden="true" size={15} /> Load More...</button><button className="min-h-9 flex-1 rounded-md border border-[#343d35] bg-[#1b211c] px-3.5 text-xs font-semibold text-[#c5cbc2] transition-colors hover:border-[#59645a] hover:bg-[#232a24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a9c786] sm:flex-none" onClick={() => setVisiblePastCount(past.length)} type="button">Load All</button></div></div> : null}
          </section>
        </>
      )}
    </div>
  );
}
