import { useEffect, useState } from "react";
import { ListTree } from "lucide-react";
import axios, { type AxiosResponse } from "axios";
import type { DashboardViolation } from "~/types/dashboard";
import { LoadState } from "~/components/dashboard/LoadState";
import { ViolationCard } from "~/components/dashboard/ViolationCard";

type ViolationsPageProps = { username: string };
const apiBase = process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:1500" : "");

async function loadViolations(username: string): Promise<AxiosResponse<DashboardViolation[]>> {
  return axios.post<DashboardViolation[]>(`${apiBase}/api/violations`, { username });
}

export function ViolationsPage({ username }: ViolationsPageProps) {
  const [violations, setViolations] = useState<DashboardViolation[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void loadViolations(username)
      .then(({ data }) => { if (active) setViolations(data); })
      .catch(() => { if (active) setError("Could not load violations. Please try again."); });
    return () => { active = false; };
  }, [username]);

  return (
    <section>
      <div className="mb-5 flex items-start gap-3.5">
        <div className="grid size-[43px] shrink-0 place-items-center rounded-[9px] border border-[#41463c] bg-[#272c24] text-[#e0c58b]"><ListTree aria-hidden="true" size={20} /></div>
        <div>
          <div className="text-[10px] font-bold uppercase leading-[1.4] tracking-[0.12em] text-[#a9c786]">Moderation</div>
          <h1 className="my-1 text-[23px] font-semibold leading-tight max-[680px]:text-[19px]">Violations</h1>
          <p className="m-0 text-xs text-[#929b91] max-[680px]:max-w-[230px] max-[680px]:text-[11px]">Recorded messages flagged across your servers.</p>
        </div>
        {violations ? <span className="ml-auto shrink-0 rounded-[5px] border border-[#2b332d] bg-[#1a201b] px-2.5 py-[7px] text-[11px] text-[#bbc4b9]">{violations.length} total</span> : null}
      </div>
      <LoadState loading={violations === null && !error} error={error} empty={violations?.length === 0 ? "No violations found." : undefined} />
      {violations?.length ? (
        <div className="grid gap-[13px]">
          {violations.map((violation) => <ViolationCard key={violation.id} violation={violation} />)}
        </div>
      ) : null}
    </section>
  );
}