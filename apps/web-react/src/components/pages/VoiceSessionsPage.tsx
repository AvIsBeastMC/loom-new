import { Activity, Check, ChevronDown, RadioIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import axios, { type AxiosResponse } from "axios";
import Image from "next/image";
import type { API_withServerData } from "@repo/extra-types";
import { GuildVoiceSessions } from "~/components/dashboard/GuildVoiceSessions";
import { LoadState } from "~/components/dashboard/LoadState";
import { discordGuildIcon } from "~/utils/dashboard-api";

type VoiceSessionsPageProps = { username: string };
const apiBase = process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:1500" : "");

async function loadVoiceServers(username: string): Promise<AxiosResponse<API_withServerData>> {
  return axios.post<API_withServerData>(`${apiBase}/api/server_settings`, { username });
}

export function VoiceSessionsPage({ username }: VoiceSessionsPageProps) {
  const [servers, setServers] = useState<API_withServerData | null>(null);
  const [selectedGuildId, setSelectedGuildId] = useState("");
  const [error, setError] = useState("");
  const [guildMenuOpen, setGuildMenuOpen] = useState(false);
  const guildMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void loadVoiceServers(username)
      .then(({ data }) => {
        if (!active) return;
        setServers(data);
        setSelectedGuildId((current) => data.some((server) => server.id === current) ? current : data[0]?.id ?? "");
      })
      .catch(() => { if (active) setError("Could not load your connected servers."); });
    return () => { active = false; };
  }, [username]);

  const selectedServer = servers?.find((server) => server.id === selectedGuildId);

  useEffect(() => {
    if (!guildMenuOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!guildMenuRef.current?.contains(event.target as Node)) setGuildMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGuildMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [guildMenuOpen]);

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="flex items-start gap-3.5">
          <div className="grid size-[43px] shrink-0 place-items-center rounded-[9px] border border-[#41463c] bg-[#272c24] text-[#e0c58b]"><RadioIcon aria-hidden="true" size={20} /></div>
          <div>
            <div className="text-[10px] font-bold uppercase leading-[1.4] text-[#a9c786]">Realtime activity</div>
            <h1 className="my-1 text-[23px] font-semibold leading-tight max-[680px]:text-[19px]">Voice Sessions</h1>
            <p className="m-0 text-xs text-[#929b91]">Live presence and session history by server</p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-[min(320px,45%)]" ref={guildMenuRef}>
          <label className="text-[10px] font-bold uppercase text-[#929b91]" htmlFor="voice-session-guild">Server</label>
          <div className="relative">
            <button
              aria-controls="voice-session-guild-menu"
              aria-expanded={guildMenuOpen}
              aria-haspopup="menu"
              className="flex h-11 w-full items-center gap-3 rounded-md border border-[#39433b] bg-[#181d19] px-3 text-left transition hover:border-[#64745e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a9c786] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!servers?.length}
              id="voice-session-guild"
              onClick={() => setGuildMenuOpen((open) => !open)}
              type="button"
            >
              {selectedServer ? <Image alt="" className="size-7 shrink-0 rounded-md border border-white/10 object-cover" height={28} src={discordGuildIcon(selectedServer.discord)} unoptimized width={28} /> : <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-md bg-[#252d26] text-[#a9c786]"><RadioIcon size={15} /></span>}
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#e1e5dc]">{selectedServer?.discord.name ?? "Loading servers"}</span>
              <ChevronDown aria-hidden="true" className={`shrink-0 text-[#a9c786] transition-transform ${guildMenuOpen ? "rotate-180" : ""}`} size={16} />
            </button>
            {guildMenuOpen && servers?.length ? (
              <div className="absolute right-0 z-20 mt-2 max-h-[min(360px,60vh)] w-full overflow-y-auto rounded-md border border-[#39433b] bg-[#181d19] p-1.5 shadow-[0_18px_45px_#0009]" id="voice-session-guild-menu" role="menu" aria-labelledby="voice-session-guild">
                {servers.map((server) => {
                  const selected = server.id === selectedGuildId;
                  return (
                    <button
                      aria-checked={selected}
                      className={`flex w-full items-center gap-3 rounded px-2.5 py-2 text-left transition ${selected ? "bg-[#293326] text-[#e3edda]" : "text-[#c5cbc2] hover:bg-[#232a24]"}`}
                      key={server.id}
                      onClick={() => { setSelectedGuildId(server.id); setGuildMenuOpen(false); }}
                      role="menuitemradio"
                      type="button"
                    >
                      <Image alt="" className="size-8 shrink-0 rounded-md border border-white/10 object-cover" height={32} src={discordGuildIcon(server.discord)} unoptimized width={32} />
                      <span className="min-w-0 flex-1 truncate text-xs font-medium">{server.discord.name}</span>
                      {selected ? <Check aria-hidden="true" className="shrink-0 text-[#a9c786]" size={16} /> : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {servers === null || error || servers.length === 0 ? (
        <LoadState loading={servers === null && !error} error={error} empty={servers?.length === 0 ? "No connected servers found." : undefined} />
      ) : selectedServer ? (
        <GuildVoiceSessions guild={selectedServer.discord} key={selectedServer.id} />
      ) : (
        <div className="flex min-h-[120px] items-center justify-center gap-2 rounded-lg border border-[#2b332d] bg-[#181d19] p-6 text-xs text-[#929b91]"><Activity aria-hidden="true" size={16} />Select a server to view its voice sessions.</div>
      )}
    </section>
  );
}
