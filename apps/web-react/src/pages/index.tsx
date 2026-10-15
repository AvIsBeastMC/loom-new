import Head from "next/head";
import Image from "next/image";
import { useEffect, useState } from "react";
import axios, { type AxiosResponse } from "axios";
import { Activity, Info, NotebookText } from "lucide-react";
import { LoginForm } from "~/components/auth/LoginForm";
import { Sidebar, type DashboardSection } from "~/components/dashboard/Sidebar";
import { ReportsPage } from "~/components/pages/ReportsPage";
import { ServerSettingsPage } from "~/components/pages/ServerSettingsPage";
import { ViolationsPage } from "~/components/pages/ViolationsPage";
import type { AuthResponse } from "~/types/dashboard";
import { discordAvatar } from "~/utils/dashboard-api";
import { VoiceSessionsPage } from "~/components/pages/VoiceSessionsPage";
import { env } from "~/env";
import LatestUpdate from "~/components/dashboard/LatestUpdate";
import UpdatesPage from "~/components/pages/UpdatesPage";

type SavedLogin = { username: string; password: string };
const savedLoginKey = "loom-dashboard-login";
export const apiBase = (process.env.NODE_ENV === "development" ? "http://localhost:1500" : env.NEXT_PUBLIC_BASE_API_URL!);

async function authenticate(username: string, password: string): Promise<AxiosResponse<AuthResponse>> {
  return axios.post<AuthResponse>(`${apiBase}/api/auth`, { username, password });
}

export default function Home() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [section, setSection] = useState<DashboardSection>("voice_sessions");

  const signIn = async (username: string, password: string) => {
    if (!username.trim() || !password) {
      setError("Enter both your username and password.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await authenticate(username.trim(), password);
      sessionStorage.setItem(savedLoginKey, JSON.stringify({ username: username.trim(), password }));
      setAuth(data);
    } catch {
      setError("Sign-in failed. Check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const queryUsername = query.get("username");
    const queryPassword = query.get("password");
    let saved: SavedLogin | null = null;

    try {
      const stored = sessionStorage.getItem(savedLoginKey);
      saved = stored ? (JSON.parse(stored) as SavedLogin) : null;
    } catch {
      sessionStorage.removeItem(savedLoginKey);
    }

    const credentials = queryUsername && queryPassword
      ? { username: queryUsername, password: queryPassword }
      : saved;
    if (credentials) void signIn(credentials.username, credentials.password);
  }, []);

  const signOut = () => {
    sessionStorage.removeItem(savedLoginKey);
    setAuth(null);
    setSection("violations");
  };

  const sectionTitle = {
    updates: "Updates",
    voice_sessions: "Voice Sessions",
    violations: "Moderation activity",
    reports: "AI report archive",
    servers: "Connected servers",
  }[section];

  return (
    <>
      <Head>
        <title>Loom Dashboard</title>
        <meta name="description" content="Loom moderation and server administration dashboard" />
        <link rel="shortcut icon" href="https://loom-static.arunnya.com/loom.jpg" />
      </Head>
      {!auth ? (
        <LoginForm error={error} loading={loading} onSubmit={signIn} />
      ) : (
        <div className="min-h-screen">
          <Sidebar active={section} onChange={setSection} onLogout={signOut} username={auth.main.username} />
          <main className="min-h-screen md:ml-[246px]">
            <header className="sticky top-0 z-[5] flex min-h-[62px] items-center justify-between gap-5 border-b border-[#2b332d] bg-[#111512]/95 px-4 backdrop-blur-xl sm:px-[34px]">
              <div className="flex min-w-0 items-center gap-[9px] overflow-hidden text-xs text-[#c3c9bf]"><Activity aria-hidden="true" className="shrink-0 text-[#a9c786]" size={15} /><span>Loom</span><span className="text-[#5d665d]">/</span><span className="truncate">{sectionTitle}</span></div>
              <div className="flex min-w-0 items-center gap-[9px] text-xs font-semibold text-[#f0f2ec]">
                <Image alt="" className="size-[27px] rounded-full border border-white/10 bg-[#293129] object-cover" height={27} src={discordAvatar(auth.discord.id, auth.discord.avatar)} unoptimized width={27} />
                <span>{auth.discord.global_name ?? auth.discord.username}</span>
              </div>
            </header>
            <div className="mx-auto w-full max-w-[1400px] px-[15px] pb-[48px] sm:px-6 sm:pb-[72px] pt-4 lg:px-[38px]">
              <div className="mb-6 mt-2 rounded-2xl px-4 py-3 text-sm text-white bg-[#280707]">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-[#f0d294]/60 p-1.5">
                    <Info aria-hidden="true" className="size-3.5" />
                  </div>
                  <p className="leading-relaxed">
                    <span className="font-semibold">Bot status:</span> this project is still under active development. On each restart, any currently active voice-session records are cleared in the bot’s tracking layer, and only newer join/leave/move events are recorded from that point onward. This is a temporary Discord API limitation and will be resolved as development matures.
                  </p>
                </div>
              </div>

              {/* component */}
              <LatestUpdate />

              {section === "voice_sessions" ? <VoiceSessionsPage username={auth.main.username} /> : null}
              {section === "updates" ? <UpdatesPage /> : null}
              {section === "violations" ? <ViolationsPage username={auth.main.username} /> : null}
              {section === "reports" ? <ReportsPage username={auth.main.username} /> : null}
              {section === "servers" ? <ServerSettingsPage username={auth.main.username} /> : null}
            </div>
          </main>
        </div>
      )}
    </>
  );
}
