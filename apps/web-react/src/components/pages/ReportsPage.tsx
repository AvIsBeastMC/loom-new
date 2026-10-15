import { useEffect, useState } from "react";
import { BrainCircuit } from "lucide-react";
import axios, { type AxiosResponse } from "axios";
import type { DashboardServerReports, ReportsResponse } from "~/types/dashboard";
import { LoadState } from "~/components/dashboard/LoadState";
import { ReportServerCard } from "~/components/dashboard/ReportServerCard";

type ReportsPageProps = { username: string };
const apiBase = process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:1500" : "");

async function loadReports(username: string): Promise<AxiosResponse<ReportsResponse>> {
  return axios.post<ReportsResponse>(`${apiBase}/api/ai_reports`, { username });
}

export function ReportsPage({ username }: ReportsPageProps) {
  const [servers, setServers] = useState<DashboardServerReports[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void loadReports(username)
      .then(({ data }) => { if (active) setServers(data.data); })
      .catch(() => { if (active) setError("Could not load AI reports."); });
    return () => { active = false; };
  }, [username]);

  return (
    <section>
      <div className="mb-5 flex items-start gap-3.5">
        <div className="grid size-[43px] shrink-0 place-items-center rounded-[9px] border border-[#41463c] bg-[#272c24] text-[#e0c58b]"><BrainCircuit aria-hidden="true" size={20} /></div>
        <div>
          <div className="text-[10px] font-bold uppercase leading-[1.4] tracking-[0.12em] text-[#a9c786]">Automated moderation</div>
          <h1 className="my-1 text-[23px] font-semibold leading-tight max-[680px]:text-[19px]">AI reports</h1>
          <p className="m-0 text-xs text-[#929b91] max-[680px]:max-w-[230px] max-[680px]:text-[11px]">Review recent message checks across your servers.</p>
        </div>
      </div>
      <LoadState loading={servers === null && !error} error={error} empty={servers?.length === 0 ? "No servers are connected to this account." : undefined} />
      {servers?.length ? (
        <div className="grid gap-[13px]">
          {servers.map((server) => <ReportServerCard data={server} key={server.server.id} />)}
        </div>
      ) : null}
    </section>
  );
}