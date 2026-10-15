import { useEffect, useState } from "react";
import { Hash, LoaderCircle, MessageCircle, ScrollText, X } from "lucide-react";
import Image from "next/image";
import axios, { type AxiosResponse } from "axios";
import type { DiscordResponse } from "@repo/extra-types";
import type { DashboardReport, DashboardServerReports, ReportMessage } from "~/types/dashboard";
import { discordGuildIcon } from "~/utils/dashboard-api";

type ReportServerCardProps = { data: DashboardServerReports };
const apiBase = process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:1500" : "");

export async function fetchDiscordUser(userId: string): Promise<AxiosResponse<DiscordResponse>> {
  return axios.post<DiscordResponse>(`${apiBase}/api/discord/get-user`, { userID: userId });
}

async function fetchReportMessages(messageIds: string[]): Promise<AxiosResponse<{ messages: ReportMessage[] }>> {
  return axios.post<{ messages: ReportMessage[] }>(`${apiBase}/api/get-messages`, { messageIdList: messageIds });
}

function ViolatorName({ userId }: { userId?: string }) {
  const [name, setName] = useState(userId ?? "None");

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void fetchDiscordUser(userId)
      .then(({ data }) => { if (active) setName(data.global_name ?? data.username); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [setName, userId]);

  return <>{name}</>;
}

function reportTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ReportServerCard({ data }: ReportServerCardProps) {
  const [selectedReport, setSelectedReport] = useState<DashboardReport | null>(null);
  const [messages, setMessages] = useState<ReportMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reports = [...data.reports]
    .sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime())
    .slice(0, 3);

  useEffect(() => {
    if (!selectedReport) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedReport(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedReport]);

  useEffect(() => {
    if (!selectedReport) {
      setMessages([]);
      setError("");
      return;
    }

    let active = true;
    const messageIdList = selectedReport.report.violations.flatMap((violation) => violation.messageIdList);
    if (messageIdList.length === 0) {
      setMessages([]);
      return;
    }

    setLoading(true);
    setError("");
    void fetchReportMessages(messageIdList)
      .then(({ data }) => { if (active) setMessages(data.messages); })
      .catch(() => { if (active) setError("Could not load message previews."); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [selectedReport]);

  return (
    <article className="min-w-0 rounded-lg border border-[#2b332d] bg-[#181d19] p-3.5 sm:p-[18px]">
      <header className="mb-[15px] flex min-w-0 items-center gap-3">
        <Image alt="" className="size-[38px] shrink-0 rounded-full border border-white/10 bg-[#293129] object-cover" height={38} src={discordGuildIcon(data.server)} unoptimized width={38} />
        <div className="min-w-0"><span className="text-[10px] font-bold uppercase leading-[1.4] tracking-[0.12em] text-[#a9c786]">Server</span><h2 className="mt-[3px] break-words text-[15px] font-semibold">{data.server.name}</h2></div>
        <span className="ml-auto shrink-0 rounded-[5px] border border-[#2b332d] bg-[#1a201b] px-2.5 py-[7px] text-[11px] text-[#bbc4b9]">Latest {reports.length}</span>
      </header>

      {reports.length ? (
        <div className="grid grid-cols-1 gap-[11px] sm:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => {
            const topViolator = [...report.report.violators].sort((first, second) => second.count - first.count)[0];
            const messageCount = report.report.violations.reduce((count, item) => count + item.messageIdList.length, 0);
            return (
              <button className="flex min-h-[180px] min-w-0 flex-col items-start gap-[9px] rounded-[7px] border border-[#303832] bg-[#171c18] p-[15px] text-left transition hover:-translate-y-0.5 hover:border-[#78815f] hover:bg-[#1d241d] lg:min-h-[202px]" key={report.id} onClick={() => setSelectedReport(report)} type="button">
                <span className="mb-[3px] grid size-[34px] place-items-center rounded-md bg-[#372824] text-[#e6a18d]"><ScrollText aria-hidden="true" size={19} /></span>
                <span className="text-[10px] font-bold uppercase leading-[1.4] tracking-[0.12em] text-[#a9c786]">Report timestamp</span>
                <strong className="text-[13px] font-semibold">{reportTime(report.timestamp)}</strong>
                <span className="mt-auto grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-[#2b332d] pt-2.5">
                  <span className="grid min-w-0 gap-1"><small className="text-[10px] text-[#929b91]">Top violator</small><b className="truncate text-[11px] font-semibold text-[#e1e5dc]"><ViolatorName userId={topViolator?.user} /></b></span>
                  <span className="grid gap-1"><small className="text-[10px] text-[#929b91]">Messages</small><b className="text-[11px] font-semibold text-[#e1e5dc]">{messageCount}</b></span>
                </span>
              </button>
            );
          })}
        </div>
      ) : <p className="mt-3 text-[11px] leading-relaxed text-[#929b91]">No reports have been generated for this server.</p>}

      {selectedReport ? (
        <div className="fixed inset-0 z-20 grid place-items-center overflow-y-auto bg-[#050806]/80 p-3 backdrop-blur-[5px] sm:p-6" onClick={() => setSelectedReport(null)} role="presentation">
          <section
            aria-labelledby="report-dialog-title"
            aria-modal="true"
            className="max-h-[calc(100vh-24px)] w-full max-w-[860px] overflow-auto rounded-lg border border-[#3c453e] bg-[#171c18] shadow-[0_30px_90px_#0008] sm:max-h-[88vh]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="flex items-center justify-between gap-4 border-b border-[#2b332d] bg-[#1d231e] px-3.5 py-4 sm:px-[22px]">
              <div><span className="text-[10px] font-bold uppercase leading-[1.4] tracking-[0.12em] text-[#a9c786]">Report preview</span><h2 className="mt-[5px] text-lg font-semibold" id="report-dialog-title">{reportTime(selectedReport.timestamp)}</h2></div>
              <button aria-label="Close report" className="grid size-9 shrink-0 place-items-center rounded-md border border-[#2b332d] bg-[#171c18] text-[#c5ccc2] hover:bg-[#2b332d]" onClick={() => setSelectedReport(null)} type="button"><X size={19} /></button>
            </header>
            <div className="grid grid-cols-3 gap-[5px] px-3.5 py-4 sm:gap-[9px] sm:px-[22px]">
              <div className="grid min-w-0 gap-[5px] rounded-md border border-[#2b332d] bg-[#141915] p-2"><small className="text-[10px] text-[#929b91]">Server</small><strong className="truncate text-xs">{data.server.name}</strong></div>
              <div className="grid min-w-0 gap-[5px] rounded-md border border-[#2b332d] bg-[#141915] p-2"><small className="text-[10px] text-[#929b91]">Messages</small><strong className="truncate text-xs">{messages.length}</strong></div>
              <div className="grid min-w-0 gap-[5px] rounded-md border border-[#2b332d] bg-[#141915] p-2"><small className="text-[10px] text-[#929b91]">Violators</small><strong className="truncate text-xs">{selectedReport.report.violators.length}</strong></div>
            </div>
            {loading ? (
              <div className="mx-3.5 mb-[22px] flex min-h-[145px] items-center justify-center gap-2.5 rounded-lg border border-[#2b332d] bg-[#181d19] p-6 text-center text-[#929b91] sm:mx-[22px]"><LoaderCircle className="animate-spin" size={19} /> Loading message previews</div>
            ) : error ? (
              <div className="mx-3.5 mb-[22px] flex min-h-[145px] items-center justify-center rounded-lg border border-[#2b332d] bg-[#181d19] p-6 text-center text-[#e78f83] sm:mx-[22px]">{error}</div>
            ) : messages.length ? (
              <div className="grid gap-[9px] px-3.5 pb-[22px] sm:px-[22px]">
                {messages.map((message) => {
                  const username = message.user?.global_name ?? message.user?.username ?? "Unknown user";
                  const avatar = message.user?.icon ?? "https://cdn.discordapp.com/embed/avatars/0.png";
                  return (
                    <article className="rounded-[7px] border border-[#2b332d] bg-[#141915] p-[13px]" key={message.id}>
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Image alt="" className="size-[38px] shrink-0 rounded-full border border-white/10 bg-[#293129] object-cover" height={38} src={avatar} unoptimized width={38} />
                        <div className="grid min-w-0 gap-1"><strong className="truncate text-xs">{username}</strong><span className="inline-flex items-center gap-1 text-[10px] text-[#929b91]"><Hash size={13} />{message.rawData?.channelId ?? "unknown"}</span></div>
                        <time className="ml-auto shrink-0 text-[10px] text-[#929b91]">{new Date(message.dateTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
                      </div>
                      <p className="mt-3 wrap-anywhere whitespace-pre-wrap text-xs leading-relaxed text-[#d7ddd4]">{message.content || "No message content."}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mx-3.5 mb-[22px] flex min-h-[145px] items-center justify-center gap-2.5 rounded-lg border border-[#2b332d] bg-[#181d19] p-6 text-center text-[#929b91] sm:mx-[22px]"><MessageCircle size={20} /><span>No messages found for this report.</span></div>
            )}
          </section>
        </div>
      ) : null}
    </article>
  );
}