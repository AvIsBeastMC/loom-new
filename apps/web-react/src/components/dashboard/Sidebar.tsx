import { useEffect, useState } from "react";
import axios from "axios";
import { Activity, BrainCircuit, Check, GitBranch, GitCommitHorizontal, ListTree, LoaderCircle, LogOut, Radio, RefreshCw, RotateCwClockIcon, Settings2 } from "lucide-react";
import type { API_systemroute } from "@repo/extra-types";
import cn from 'classnames'

export type DashboardSection = "violations" | "reports" | "servers" | "voice_sessions" | "updates";

type SidebarProps = {
  active: DashboardSection;
  onChange: (section: DashboardSection) => void;
  onLogout: () => void;
  username: string;
};

type SidebarSystemProps = { username: string };
const apiBase = process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:1500" : "");

function formatBuildTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? timestamp
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function SidebarSystem({ username }: SidebarSystemProps) {
  const [system, setSystem] = useState<API_systemroute | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const loadSystem = async () => {
    setError("");
    try {
      const { data } = await axios.get<API_systemroute>(`${apiBase}/api/system`);
      setSystem(data);
    } catch {
      setError("Runtime status unavailable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSystem();
  }, []);

  const toggleAllTestMode = async () => {
    if (!system || updating) return;
    setUpdating(true);
    setError("");
    try {
      const { data } = await axios.post<{ store: API_systemroute["store"] }>(
        `${apiBase}/api/system/all-test-mode`,
        { username, enabled: !system.store.allTestMode },
      );
      setSystem((current) => current ? { ...current, store: data.store } : current);
    } catch {
      setError("Could not update test mode");
    } finally {
      setUpdating(false);
    }
  };

  const git = system?.git;
  const testMode = system?.store.allTestMode ?? false;

  return (
    <section aria-label="Runtime status" className="hidden rounded-lg border border-[#303a31] bg-[#1b211c] p-3 md:block">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#929b91]">
          <Activity aria-hidden="true" className="size-3.5 text-[#a9c786]" /> Runtime
        </div>
        <button
          aria-label="Refresh runtime status"
          className="rounded p-1 text-[#899388] transition hover:bg-[#293129] hover:text-[#e6ebdf] disabled:opacity-50"
          disabled={loading || updating}
          onClick={() => { setLoading(true); void loadSystem(); }}
          type="button"
        >
          <RefreshCw aria-hidden="true" className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <button
        aria-checked={testMode}
        className={`flex w-full items-center justify-between rounded-md border px-2.5 py-2 text-left transition disabled:cursor-wait disabled:opacity-60 ${testMode ? "border-[#738b54]/50 bg-[#303b29] text-[#d2e8b4]" : "border-[#39413a] bg-[#202620] text-[#c4cbc1] hover:bg-[#293129]"}`}
        disabled={!system || updating}
        onClick={() => void toggleAllTestMode()}
        role="switch"
        type="button"
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-semibold">Global test mode</span>
          <span className={`mt-0.5 block text-[9px] ${testMode ? "text-[#bad39b]" : "text-[#899388]"}`}>
            {loading ? "Loading status..." : testMode ? "Enabled for all servers" : "Disabled"}
          </span>
        </span>
        <span className={`ml-2 grid size-[18px] shrink-0 place-items-center rounded-full ${testMode ? "bg-[#a9c786] text-[#1b2416]" : "border border-[#657064] text-transparent"}`}>
          {updating ? <LoaderCircle aria-hidden="true" className="size-3 animate-spin" /> : <Check aria-hidden="true" className="size-3" />}
        </span>
      </button>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-1 text-[9px] font-semibold ${system?.store.isDev ? "bg-[#3b3222] text-[#e8c884]" : "bg-[#25332a] text-[#a9c786]"}`}>
          <span className={`size-1.5 rounded-full ${system?.store.isDev ? "bg-[#e8bd69]" : "bg-[#a9c786]"}`} />
          {system ? (system.store.isDev ? "Development" : "Production") : "Environment"}
        </span>
        {git?.branch ? <span className="max-w-[105px] truncate text-[9px] text-[#aeb6a9]" title={git.branch}>{git.branch}</span> : null}
      </div>

      <div className="mt-2 grid gap-1 border-t border-[#303a31] pt-2 text-[9px] text-[#899388]">
        {git ? <>
          <div className="flex min-w-0 items-center gap-1.5" title={git.headCommit}>
            <GitCommitHorizontal aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate font-mono text-[#b8c0b4]">{git.headCommit.slice(0, 8)}</span>
            <span className={cn("ml-auto shrink-0", git.isClean ? "" : "italic text-red-400 font-bold")}>{git.isClean ? "Clean" : "Modified"}</span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5" title={git.timestamp}>
            <GitBranch aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">Built {formatBuildTimestamp(git.timestamp)}</span>
          </div>
        </> : <span>{loading ? "Loading build details..." : "Build metadata unavailable"}</span>}
      </div>
      {error ? <p aria-live="polite" className="mt-2 text-[9px] text-[#e5a89b]">{error}</p> : null}
    </section>
  );
}

const sections = [
  { id: "voice_sessions", label: "Voice Sessions", icon: Radio },
  { id: "updates", label: "Updates", icon: RotateCwClockIcon },
  { id: "violations", label: "Violations", icon: ListTree },
  { id: "reports", label: "AI reports", icon: BrainCircuit },
  { id: "servers", label: "Server Settings", icon: Settings2 },
] as const;

export function Sidebar({ active, onChange, onLogout, username }: SidebarProps) {
  return (
    <aside className="sticky top-0 z-10 flex w-full flex-col border-b border-[#2b332d] bg-[#151a16] px-3 py-3 md:fixed md:inset-y-0 md:left-0 md:w-[246px] md:border-b-0 md:border-r md:px-[15px] md:py-6">
      <div className="flex items-center gap-[11px] px-1 pb-3 md:px-2 md:pb-7">
        <img className="w-10 h-10 rounded-full" src="https://loom-static.arunnya.com/loom.jpg" alt="" />
        <div className="flex items-baseline gap-2 md:grid md:gap-[3px]">
          <strong className="text-[13px] md:text-[15px]">Loom</strong>
          <span className="text-[11px] text-[#929b91]">Administration</span>
        </div>
      </div>
      <div className="hidden px-[10px] text-[9px] font-bold uppercase tracking-[0.12em] text-[#768075] md:block">Workspace</div>
      <nav aria-label="Dashboard sections" className="flex flex-wrap gap-[5px] md:mt-[10px] md:grid">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            aria-current={active === id ? "page" : undefined}
            className={`cursor-pointer flex min-h-[38px] flex-1 items-center justify-center gap-[7px] rounded-md border px-2 text-[11px] transition md:min-h-[42px] md:flex-none md:justify-start md:gap-[11px] md:px-[10px] md:text-sm ${active === id ? "border-[#384338] bg-[#252e26] text-[#c4dda6]" : "border-transparent text-[#a9b0a7] hover:bg-[#202720] hover:text-[#f0f2ec]"}`}
            key={id}
            onClick={() => onChange(id)}
            type="button"
          >
            <Icon aria-hidden="true" className="size-4 md:size-[18px]" strokeWidth={1.8} />
            <span className="max-[410px]:text-[9px]">{label}</span>
          </button>
        ))}
        <button
          className={`cursor-pointer flex min-h-[38px] flex-1 items-center justify-center gap-[7px] rounded-md border px-2 text-[11px] transition md:min-h-[42px] md:flex-none md:justify-start md:gap-[11px] md:px-[10px] md:text-sm border-transparent text-[#a9b0a7] hover:bg-[#202720] hover:text-[#f0f2ec]`}
          key="signout"
          onClick={onLogout}
          type="button"
        >
          <LogOut aria-hidden="true" className="size-4 md:size-[18px]" strokeWidth={1.8} />
          Sign out
        </button>
      </nav>
      <div className="md:mt-auto md:mb-3">
        <SidebarSystem username={username} />
      </div>
      <div className="hidden px-[10px] pt-[17px] text-[8px] font-bold uppercase tracking-[0.12em] text-[#768075] md:block">Loom control panel</div>
    </aside>
  );
}