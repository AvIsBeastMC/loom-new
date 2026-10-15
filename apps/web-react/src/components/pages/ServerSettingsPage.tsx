import { useEffect, useState } from "react";
import { Settings2 } from "lucide-react";
import axios, { type AxiosResponse } from "axios";
import type { API_withServerData } from "@repo/extra-types";
import { LoadState } from "~/components/dashboard/LoadState";
import { ServerCard } from "~/components/dashboard/ServerCard";

type ServerSettingsPageProps = { username: string };
const apiBase = process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:1500" : "");

async function loadServerSettings(username: string): Promise<AxiosResponse<API_withServerData>> {
  return axios.post<API_withServerData>(`${apiBase}/api/server_settings`, { username });
}

export function ServerSettingsPage({ username }: ServerSettingsPageProps) {
  const [servers, setServers] = useState<API_withServerData | null>(null);
  const [error, setError] = useState("");

  console.log(servers)

  useEffect(() => {
    let active = true;
    void loadServerSettings(username)
      .then(({ data }) => { if (active) setServers(data); })
      .catch(() => { if (active) setError("Could not load your server settings."); });
    return () => { active = false; };
  }, [username]);

  return (
    <section>
      <div className="mb-5 flex items-start gap-3.5">
        <div className="grid size-[43px] shrink-0 place-items-center rounded-[9px] border border-[#41463c] bg-[#272c24] text-[#e0c58b]"><Settings2 aria-hidden="true" size={20} /></div>
        <div>
          <div className="text-[10px] font-bold uppercase leading-[1.4] tracking-[0.12em] text-[#a9c786]">Configuration</div>
          <h1 className="my-1 text-[23px] font-semibold leading-tight max-[680px]:text-[19px]">Server Settings</h1>
          <p className="m-0 text-xs text-[#929b91] max-[680px]:max-w-[230px] max-[680px]:text-[11px]">Configure Loom behavior for each connected server.</p>
        </div>
        {servers ? <span className="ml-auto shrink-0 rounded-[5px] border border-[#2b332d] bg-[#1a201b] px-2.5 py-[7px] text-[11px] text-[#bbc4b9]">{servers.length} servers</span> : null}
      </div>
      <LoadState loading={servers === null && !error} error={error} empty={servers?.length === 0 ? "No connected servers found." : undefined} />
      {servers?.length ? (
        <div className="grid gap-[13px]">
          {servers.map((server) => <ServerCard key={server.id} server={server} username={username} />)}
        </div>
      ) : null}
    </section>
  );
}