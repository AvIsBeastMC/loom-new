import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import axios, { type AxiosResponse } from "axios";
import {
  AudioLines,
  BrainCircuit,
  Camera,
  FlaskConical,
  InfoIcon,
  Image as ImageIcon,
  LoaderCircle,
  LogOut,
  Menu,
  MonitorPlay,
  Play,
  Radio,
  Save,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import type { API_withServerData } from "@repo/extra-types";
import type { DiscordChannel, ToggleBotTestingResponse } from "~/types/dashboard";
import { discordGuildIcon } from "~/utils/dashboard-api";
import toast from "react-hot-toast";

type ServerCardProps = { server: API_withServerData[number]; username: string };
type VoicePurpose = "PRODUCTIVITY" | "NONE";
type VoiceMode = "ANY" | "CAM_ONLY" | "CAM_SCREENSHARE";
type VoiceChannelConfig = { purpose: VoicePurpose; type: VoiceMode };
type VoiceChannelSaveItem = VoiceChannelConfig & { channelId: string };
const apiBase = process.env.NEXT_PUBLIC_API_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:1500" : "");

function createVoiceChannelConfigMap(
  configurations: API_withServerData[number]["voiceChannelConfigurations"],
): Record<string, VoiceChannelConfig> {
  return Object.fromEntries(configurations.map(({ id, purpose, type }) => [id, { purpose, type }]));
}

function voiceChannelConfigSignature(configurations: Record<string, VoiceChannelConfig>): string {
  return JSON.stringify(Object.entries(configurations).sort(([first], [second]) => first.localeCompare(second)));
}

async function fetchChannels(guildId: string): Promise<AxiosResponse<DiscordChannel[]>> {
  return axios.post<DiscordChannel[]>(`${apiBase}/api/discord/get-guild-channels`, { guildId });
}

async function saveChannelSetting(
  path: string,
  body: { username: string; newChannel: string; guildId: string },
): Promise<AxiosResponse<string>> {
  return axios.post<string>(`${apiBase}/api/${path}`, body);
}

async function saveVoiceChannelSettings(
  username: string,
  guildId: string,
  configurations: VoiceChannelSaveItem[],
): Promise<AxiosResponse<{ status: string; data: VoiceChannelSaveItem[] }>> {
  return axios.post<{ status: string; data: VoiceChannelSaveItem[] }>(
    `${apiBase}/api/server_settings/set-voice-channel-configurations`,
    { username, guildId, configurations },
  );
}

async function saveServerShortName(
  username: string,
  guildId: string,
  shortName: string,
): Promise<AxiosResponse<{ status: string; data: { shortName: string | null } }>> {
  return axios.post<{ status: string; data: { shortName: string | null } }>(
    `${apiBase}/api/server_settings/set-short-name`,
    { username, guildId, shortName },
  );
}

async function saveServerIcon(
  username: string,
  guildId: string,
  serverIcon: string,
): Promise<AxiosResponse<{ status: string; data: { serverIcon: string | null } }>> {
  return axios.post<{ status: string; data: { serverIcon: string | null } }>(
    `${apiBase}/api/server_settings/set-server-icon`,
    { username, guildId, serverIcon },
  );
}

async function saveServerBanner(
  username: string,
  guildId: string,
  banner: string,
): Promise<AxiosResponse<{ status: string; data: { banner: string | null } }>> {
  return axios.post<{ status: string; data: { banner: string | null } }>(
    `${apiBase}/api/server_settings/set-server-banner`,
    { username, guildId, banner },
  );
}

async function toggleBotTesting(
  guildId: string,
  username: string,
): Promise<AxiosResponse<ToggleBotTestingResponse>> {
  return axios.post<ToggleBotTestingResponse>(`${apiBase}/api/toggle-bot-testing`, { guild: guildId, username });
}

async function triggerAiReview(
  guildId: string,
  username: string,
): Promise<AxiosResponse<string>> {
  return axios.post<string>(`${apiBase}/api/trigger-ai-messages-check`, { guild: guildId, username });
}

export function ServerCard({ server, username }: ServerCardProps) {
  const [channels, setChannels] = useState<DiscordChannel[] | null>(null);
  const [shortName, setShortName] = useState(server.shortName ?? "");
  const [savedShortName, setSavedShortName] = useState(server.shortName ?? "");
  const [shortNameError, setShortNameError] = useState("");
  const [savingShortName, setSavingShortName] = useState(false);
  const [shortNamePending, setShortNamePending] = useState(false);
  const shortNameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [serverIcon, setServerIcon] = useState(server.serverIcon ?? "");
  const [savedServerIcon, setSavedServerIcon] = useState(server.serverIcon ?? "");
  const [serverIconError, setServerIconError] = useState("");
  const [savingServerIcon, setSavingServerIcon] = useState(false);
  const [serverIconPending, setServerIconPending] = useState(false);
  const [iconImageFailed, setIconImageFailed] = useState(false);
  const serverIconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [banner, setBanner] = useState(server.banner ?? "");
  const [savedBanner, setSavedBanner] = useState(server.banner ?? "");
  const [bannerError, setBannerError] = useState("");
  const [savingBanner, setSavingBanner] = useState(false);
  const [bannerPending, setBannerPending] = useState(false);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [leaveChannel, setLeaveChannel] = useState(server.leaveAnnounceChannel ?? "");
  const [testChannel, setTestChannel] = useState(server.test_channel ?? "");
  const [testMode, setTestMode] = useState(server.test_mode);
  const [managedVoiceChannels, setManagedVoiceChannels] = useState<Record<string, VoiceChannelConfig>>(
    () => createVoiceChannelConfigMap(server.voiceChannelConfigurations),
  );
  const [savedVoiceChannels, setSavedVoiceChannels] = useState<Record<string, VoiceChannelConfig>>(
    () => createVoiceChannelConfigMap(server.voiceChannelConfigurations),
  );
  const [savingVoiceChannels, setSavingVoiceChannels] = useState(false);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);
  const [voiceSaveFeedback, setVoiceSaveFeedback] = useState("");
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState("");
  const voiceChannels = channels?.filter((channel) => channel.type === 2 || channel.type === 13) ?? [];
  const voiceChangesPending = voiceChannelConfigSignature(managedVoiceChannels) !== voiceChannelConfigSignature(savedVoiceChannels);

  useEffect(() => {
    let active = true;
    void fetchChannels(server.discord.id)
      .then(({ data }) => { if (active) setChannels(data); })
      .catch(() => { if (active) setFeedback("Could not load channels. Check that the bot is in this server."); });
    return () => { active = false; };
  }, [server.discord.id]);

  useEffect(() => {
    if (shortName.trim() === savedShortName) return;
    shortNameTimer.current = setTimeout(() => {
      void persistShortName(shortName);
    }, 2000);
    return () => {
      if (shortNameTimer.current) clearTimeout(shortNameTimer.current);
    };
  }, [shortName, savedShortName]);

  useEffect(() => {
    if (serverIcon.trim() === savedServerIcon) return;
    serverIconTimer.current = setTimeout(() => {
      void persistServerIcon(serverIcon);
    }, 2000);
    return () => {
      if (serverIconTimer.current) clearTimeout(serverIconTimer.current);
    };
  }, [serverIcon, savedServerIcon]);

  useEffect(() => {
    if (banner.trim() === savedBanner) return;
    bannerTimer.current = setTimeout(() => {
      void persistBanner(banner);
    }, 2000);
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, [banner, savedBanner]);

  const persistShortName = async (value: string) => {
    const normalized = value.trim();
    if (normalized.length > 0 && (normalized.length < 2 || normalized.length > 12)) {
      setShortNameError("Use 2–12 characters, or leave blank to clear.");
      setShortNamePending(false);
      return;
    }
    if (normalized === savedShortName) {
      setShortNameError("");
      setShortNamePending(false);
      return;
    }

    setSavingShortName(true);
    setShortNameError("");
    try {
      const { data } = await saveServerShortName(username, server.discord.id, normalized);
      const saved = data.data.shortName ?? "";
      setShortName(saved);
      setSavedShortName(saved);
      setShortNamePending(false);

      toast.success('Successfully updated short name!')
    } catch {
      setShortNameError("Could not save short name. Try again.");
      setShortNamePending(false);
    } finally {
      setSavingShortName(false);
    }
  };

  const persistServerIcon = async (value: string) => {
    const normalized = value.trim();
    if (normalized.length > 0) {
      try {
        const url = new URL(normalized);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Invalid protocol");
      } catch {
        setServerIconError("Enter a valid HTTP or HTTPS URL, or leave blank to clear.");
        setServerIconPending(false);
        return;
      }
    }
    if (normalized.length > 2048) {
      setServerIconError("URL must be 2048 characters or fewer.");
      setServerIconPending(false);
      return;
    }
    if (normalized === savedServerIcon) {
      setServerIconError("");
      setServerIconPending(false);
      return;
    }

    setSavingServerIcon(true);
    setServerIconError("");
    try {
      const { data } = await saveServerIcon(username, server.discord.id, normalized);
      const saved = data.data.serverIcon ?? "";
      setServerIcon(saved);
      setSavedServerIcon(saved);
      setServerIconPending(false);
      setIconImageFailed(false);
      toast.success("Successfully updated server icon!");
    } catch {
      setServerIconError("Could not save icon URL. Try again.");
      setServerIconPending(false);
    } finally {
      setSavingServerIcon(false);
    }
  };

  const persistBanner = async (value: string) => {
    const normalized = value.trim();
    if (normalized.length > 0) {
      try {
        const url = new URL(normalized);
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Invalid protocol");
      } catch {
        setBannerError("Enter a valid HTTP or HTTPS URL, or leave blank to clear.");
        setBannerPending(false);
        return;
      }
    }
    if (normalized.length > 2048) {
      setBannerError("URL must be 2048 characters or fewer.");
      setBannerPending(false);
      return;
    }
    if (normalized === savedBanner) {
      setBannerError("");
      setBannerPending(false);
      return;
    }

    setSavingBanner(true);
    setBannerError("");
    try {
      const { data } = await saveServerBanner(username, server.discord.id, normalized);
      const saved = data.data.banner ?? "";
      setBanner(saved);
      setSavedBanner(saved);
      setBannerPending(false);
      toast.success("Successfully updated server banner!");
    } catch {
      setBannerError("Could not save banner URL. Try again.");
      setBannerPending(false);
    } finally {
      setSavingBanner(false);
    }
  };

  const saveShortNameOnBlur = () => {
    if (shortNameTimer.current) clearTimeout(shortNameTimer.current);
    void persistShortName(shortName);
  };

  const saveServerIconOnBlur = () => {
    if (serverIconTimer.current) clearTimeout(serverIconTimer.current);
    void persistServerIcon(serverIcon);
  };

  const saveBannerOnBlur = () => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    void persistBanner(banner);
  };

  const updateChannel = async (kind: "leave" | "test", channelId: string) => {
    const previous = kind === "leave" ? leaveChannel : testChannel;
    const endpoint = kind === "leave"
      ? "server_settings/set-leave-announce-channel"
      : "server_settings/set-bot-test-channel";
    const setter = kind === "leave" ? setLeaveChannel : setTestChannel;
    setter(channelId);
    setBusy(kind);
    setFeedback("");
    try {
      await saveChannelSetting(endpoint, { username, newChannel: channelId, guildId: server.discord.id });
      setFeedback(kind === "leave" ? "Leave announcement channel saved." : "Bot test channel saved.");
    } catch {
      setter(previous);
      setFeedback("Channel update failed. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const toggleTestMode = async () => {
    setBusy("toggle");
    setFeedback("");
    try {
      const { data } = await toggleBotTesting(server.discord.id, username);
      setTestMode(data.data.test_mode);
      setFeedback(`Bot testing mode ${data.data.test_mode ? "started" : "stopped"}.`);
    } catch {
      setFeedback("Could not change bot testing mode.");
    } finally {
      setBusy("");
    }
  };

  const triggerReview = async () => {
    setBusy("review");
    setFeedback("");
    try {
      await triggerAiReview(server.discord.id, username);
      setFeedback("AI review started. Results will appear in reports when ready.");
    } catch {
      setFeedback("Could not start the AI review.");
    } finally {
      setBusy("");
    }
  };

  const selectChannel = (value: string, onChange: (channelId: string) => void) => (
    <select className="h-[38px] w-full min-w-0 rounded-[5px] border border-[#39433b] bg-[#141915] px-[10px] text-[#f0f2ec] disabled:text-[#929b91] sm:w-[min(260px,40%)] sm:min-w-[170px]" disabled={!channels || busy !== ""} onChange={(event) => onChange(event.target.value)} value={value}>
      <option value="">Select a channel</option>
      {channels?.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}
    </select>
  );

  const toggleManagedVoiceChannel = (channelId: string) => {
    setVoiceSaveFeedback("");
    setManagedVoiceChannels((current) => {
      if (current[channelId]) {
        const next = { ...current };
        delete next[channelId];
        return next;
      }
      return { ...current, [channelId]: { purpose: "NONE", type: "ANY" } };
    });
  };

  const updateVoiceChannel = (channelId: string, update: Partial<VoiceChannelConfig>) => {
    setVoiceSaveFeedback("");
    setManagedVoiceChannels((current) => {
      const existing = current[channelId];
      if (!existing) return current;
      return {
        ...current,
        [channelId]: {
          purpose: update.purpose ?? existing.purpose,
          type: update.type ?? existing.type,
        },
      };
    });
  };

  const applyVoiceChannelSettings = async () => {
    if (!voiceChangesPending || savingVoiceChannels) return;
    setSavingVoiceChannels(true);
    setVoiceSaveFeedback("");
    const configurations = Object.entries(managedVoiceChannels).map(([channelId, config]) => ({ channelId, ...config }));
    try {
      await saveVoiceChannelSettings(username, server.discord.id, configurations);
      setSavedVoiceChannels({ ...managedVoiceChannels });
      setVoiceSaveFeedback("Voice channel settings applied.");
    } catch {
      setVoiceSaveFeedback("Could not save voice channel settings. Your changes are still pending.");
    } finally {
      setSavingVoiceChannels(false);
    }
  };

  return (
    <article className="min-w-0 rounded-lg border border-[#2b332d] bg-[#181d19] p-3.5 sm:p-[18px]">
      <header className="flex min-w-0 items-center gap-3 border-b border-[#2b332d] pb-4">
        <Image alt="" className="size-[38px] shrink-0 rounded-full border border-white/10 bg-[#293129] object-cover" height={38} onError={() => setIconImageFailed(true)} src={serverIcon && !iconImageFailed ? serverIcon : discordGuildIcon(server.discord)} unoptimized width={38} />
        <div className="min-w-0"><h2 className="truncate text-[15px] font-semibold">{server.discord.name}</h2><p className="mt-1 text-[11px] text-[#929b91]">Server configuration</p></div>
      </header>
      <div className="flex min-w-0 flex-col gap-2 border-b border-[#29312a] py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <div className="flex min-w-0 items-start gap-[11px]">
          <InfoIcon aria-hidden="true" className="mt-px shrink-0 text-[#e6a18d]" size={18} />
          <div className="min-w-0"><strong className="text-xs">Short Name</strong><p className="mt-1 text-[11px] leading-relaxed text-[#929b91]">Will be used across embeds and messages eminated by the bot!</p></div>
        </div>
        <div className="w-full sm:w-[min(260px,40%)] sm:min-w-[170px]">
          <div className="relative">
            <input
              aria-describedby={`short-name-feedback-${server.id}`}
              aria-invalid={Boolean(shortNameError)}
              autoComplete="off"
              className={`h-[38px] w-full rounded-[5px] border bg-[#141915] px-[10px] pr-9 text-sm text-[#f0f2ec] outline-none transition focus:border-[#72835f] ${shortNameError ? "border-[#e6a18d]" : "border-[#39433b]"}`}
              id={`short-name-${server.id}`}
              maxLength={12}
              onBlur={saveShortNameOnBlur}
              onChange={(event) => {
                setShortName(event.target.value);
                setShortNameError("");
                setShortNamePending(event.target.value.trim() !== savedShortName);
              }}
              placeholder="2–12 characters"
              value={shortName}
            />
            {savingShortName || shortNamePending ? <LoaderCircle aria-label="Saving short name" className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-[#a9c786]" size={15} /> : null}
          </div>
          <p aria-live="polite" className={`mt-1 min-h-4 text-[10px] ${shortNameError ? "text-[#e6a18d]" : "text-[#929b91]"}`} id={`short-name-feedback-${server.id}`} role="status">
            {shortNameError || `${shortName.trim().length}/12 characters`}
          </p>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-2 border-b border-[#29312a] py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <div className="flex min-w-0 items-start gap-[11px]">
          <InfoIcon aria-hidden="true" className="mt-px shrink-0 text-[#e6a18d]" size={18} />
          <div className="min-w-0"><strong className="text-xs">Server Icon URL</strong><p className="mt-1 text-[11px] leading-relaxed text-[#929b91]">Shown on Loom messages and embeds. Leave blank to use the Discord icon.</p></div>
        </div>
        <div className="w-full sm:w-[min(260px,40%)] sm:min-w-[170px]">
          <div className="relative">
            <input
              aria-describedby={`server-icon-feedback-${server.id}`}
              aria-invalid={Boolean(serverIconError)}
              autoComplete="url"
              className={`h-[38px] w-full rounded-[5px] border bg-[#141915] px-[10px] pr-9 text-sm text-[#f0f2ec] outline-none transition focus:border-[#72835f] ${serverIconError ? "border-[#e6a18d]" : "border-[#39433b]"}`}
              id={`server-icon-${server.id}`}
              maxLength={2048}
              onBlur={saveServerIconOnBlur}
              onChange={(event) => {
                setServerIcon(event.target.value);
                setServerIconError("");
                setServerIconPending(event.target.value.trim() !== savedServerIcon);
                setIconImageFailed(false);
              }}
              placeholder="https://example.com/icon.png"
              type="url"
              value={serverIcon}
            />
            {savingServerIcon || serverIconPending ? <LoaderCircle aria-label="Saving server icon URL" className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-[#a9c786]" size={15} /> : null}
          </div>
          <p aria-live="polite" className={`mt-1 min-h-4 text-[10px] ${serverIconError ? "text-[#e6a18d]" : "text-[#929b91]"}`} id={`server-icon-feedback-${server.id}`} role="status">
            {serverIconError || (serverIcon.trim() ? "Custom icon URL" : "Using Discord icon")}
          </p>
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-2 border-b border-[#29312a] py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
        <div className="flex min-w-0 items-start gap-[11px]">
          <ImageIcon aria-hidden="true" className="mt-px shrink-0 text-[#e6a18d]" size={18} />
          <div className="min-w-0">
            <strong className="text-xs">Server Banner URL</strong>
            <p className="mt-1 text-[11px] leading-relaxed text-[#929b91]">Used for the bot profile banner. For best results, set the short name, server icon, and banner together.</p>
          </div>
        </div>
        <div className="w-full sm:w-[min(260px,40%)] sm:min-w-[170px]">
          <div className="relative">
            <input
              aria-describedby={`server-banner-feedback-${server.id}`}
              aria-invalid={Boolean(bannerError)}
              autoComplete="url"
              className={`h-[38px] w-full rounded-[5px] border bg-[#141915] px-[10px] pr-9 text-sm text-[#f0f2ec] outline-none transition focus:border-[#72835f] ${bannerError ? "border-[#e6a18d]" : "border-[#39433b]"}`}
              id={`server-banner-${server.id}`}
              maxLength={2048}
              onBlur={saveBannerOnBlur}
              onChange={(event) => {
                setBanner(event.target.value);
                setBannerError("");
                setBannerPending(event.target.value.trim() !== savedBanner);
              }}
              placeholder="https://example.com/banner.png"
              type="url"
              value={banner}
            />
            {savingBanner || bannerPending ? <LoaderCircle aria-label="Saving server banner URL" className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-[#a9c786]" size={15} /> : null}
          </div>
          <p aria-live="polite" className={`mt-1 min-h-4 text-[10px] ${bannerError ? "text-[#e6a18d]" : "text-[#929b91]"}`} id={`server-banner-feedback-${server.id}`} role="status">
            {bannerError || (banner.trim() ? "Custom banner URL" : "No custom banner set")}
          </p>
        </div>
      </div>
      <div className="grid">
        <div className="flex min-w-0 flex-col justify-between gap-3 border-b border-[#29312a] py-[17px] sm:flex-row sm:items-center sm:gap-5">
          <div className="flex min-w-0 items-start gap-[11px]">
            <LogOut aria-hidden="true" className="mt-px shrink-0 text-[#e6a18d]" size={18} />
            <div className="min-w-0"><strong className="text-xs">Leave announcement channel</strong><p className="mt-1 text-[11px] leading-relaxed text-[#929b91]">Where member departures are announced.</p></div>
          </div>
          {selectChannel(leaveChannel, (id) => void updateChannel("leave", id))}
        </div>
        <div className="flex min-w-0 flex-col justify-between gap-3 border-b border-[#29312a] py-[17px] sm:flex-row sm:items-center sm:gap-5">
          <div className="flex min-w-0 items-start gap-[11px]">
            <FlaskConical aria-hidden="true" className="mt-px shrink-0 text-[#e6a18d]" size={18} />
            <div className="min-w-0"><strong className="text-xs">Bot testing channel</strong><p className="mt-1 text-[11px] leading-relaxed text-[#929b91]">Limit test-mode activity to this channel.</p></div>
          </div>
          {selectChannel(testChannel, (id) => void updateChannel("test", id))}
        </div>
        <div className="flex min-w-0 flex-col justify-between gap-3 border-b border-[#29312a] py-[17px] sm:flex-row sm:items-center sm:gap-5">
          <div className="flex min-w-0 items-start gap-[11px]">
            <FlaskConical aria-hidden="true" className="mt-px shrink-0 text-[#e6a18d]" size={18} />
            <div className="min-w-0"><strong className="text-xs">Bot testing mode</strong><p className="mt-1 text-[11px] leading-relaxed text-[#929b91]">{testMode ? "Testing mode is active." : "Restrict bot actions while testing."}</p></div>
          </div>
          <button className="inline-flex min-h-[38px] w-full min-w-[98px] items-center justify-center gap-2 rounded-md border border-[#39423a] bg-[#242b25] px-[13px] py-2 font-semibold text-[#f0f2ec] transition hover:border-[#64745e] hover:bg-[#2c352d] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto" disabled={busy !== ""} onClick={() => void toggleTestMode()} type="button">
            {busy === "toggle" ? <LoaderCircle className="animate-spin" size={16} /> : testMode ? <Square size={16} /> : <Play size={16} />}
            {testMode ? "Stop" : "Start"}
          </button>
        </div>
        <div className="flex min-w-0 flex-col justify-between gap-3 py-[17px] sm:flex-row sm:items-center sm:gap-5">
          <div className="flex min-w-0 items-start gap-[11px]">
            <BrainCircuit aria-hidden="true" className="mt-px shrink-0 text-[#e6a18d]" size={18} />
            <div className="min-w-0"><strong className="text-xs">AI review</strong><p className="mt-1 text-[11px] leading-relaxed text-[#929b91]">Review messages recorded today.</p></div>
          </div>
          <button className="inline-flex min-h-[38px] w-full min-w-[98px] items-center justify-center gap-2 rounded-md border border-[#39423a] bg-[#242b25] px-[13px] py-2 font-semibold text-[#f0f2ec] transition hover:border-[#64745e] hover:bg-[#2c352d] disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto" disabled={busy !== ""} onClick={() => void triggerReview()} type="button">
            {busy === "review" ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}
            Trigger
          </button>
        </div>
      </div>
      <section aria-labelledby={`voice-settings-${server.id}`} className="mt-1 border-t border-[#2b332d] pt-4">
        <div className="mb-3 flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-md border border-[#39433b] bg-[#202820] text-[#a9c786]"><AudioLines aria-hidden="true" size={18} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="text-[13px] font-semibold" id={`voice-settings-${server.id}`}>Voice channel management</h3>
              <span className="rounded-full border border-[#344135] bg-[#202820] px-2 py-0.5 text-[10px] text-[#b8c9a9]">{Object.keys(managedVoiceChannels).length} selected</span>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[#929b91]">Choose which voice rooms Loom should manage.</p>
          </div>
          <button
            aria-controls={`voice-settings-content-${server.id}`}
            aria-expanded={voiceSettingsOpen}
            aria-label={`${voiceSettingsOpen ? "Collapse" : "Expand"} voice channel management`}
            className="grid size-9 shrink-0 place-items-center rounded-md border border-[#39433b] bg-[#202820] text-[#c1cbbd] transition hover:border-[#64745e] hover:bg-[#293326] hover:text-[#f0f2ec]"
            onClick={() => setVoiceSettingsOpen((open) => !open)}
            title={`${voiceSettingsOpen ? "Collapse" : "Expand"} voice channel management`}
            type="button"
          >
            {voiceSettingsOpen ? <X aria-hidden="true" size={17} /> : <Menu aria-hidden="true" size={18} />}
          </button>
        </div>
        <div hidden={!voiceSettingsOpen} id={`voice-settings-content-${server.id}`}>
          {channels === null ? (
            <div className="flex items-center gap-2 py-3 text-[11px] text-[#929b91]"><LoaderCircle aria-hidden="true" className="animate-spin" size={14} />Loading voice channels</div>
          ) : voiceChannels.length === 0 ? (
            <p className="rounded-md border border-dashed border-[#39433b] bg-[#141915] px-3 py-4 text-center text-[11px] text-[#929b91]">No voice channels found in this server.</p>
          ) : (
            <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2 2xl:grid-cols-3">
              {voiceChannels.map((channel) => {
                const config = managedVoiceChannels[channel.id];
                return (
                  <div className={`min-w-0 rounded-md border transition-colors ${config ? "border-[#465442] bg-[#1c241d]" : "border-[#2b332d] bg-[#151a16]"}`} key={channel.id}>
                    <div className="flex min-w-0 items-center gap-3 p-3">
                      <button
                        aria-pressed={Boolean(config)}
                        className={`grid size-5 shrink-0 place-items-center rounded border transition-colors ${config ? "border-[#a9c786] bg-[#a9c786] text-[#182018]" : "border-[#596259] bg-[#141915] text-transparent hover:border-[#a9c786]"}`}
                        disabled={savingVoiceChannels}
                        onClick={() => toggleManagedVoiceChannel(channel.id)}
                        title={config ? "Stop managing this channel" : "Manage this channel"}
                        type="button"
                      >
                        <span aria-hidden="true" className="text-[12px] font-bold leading-none">✓</span>
                        <span className="sr-only">{config ? "Stop managing" : "Manage"} {channel.name}</span>
                      </button>
                      <span className="grid size-8 shrink-0 place-items-center rounded bg-[#252d26] text-[#bbc9b1]">
                        {channel.type === 13 ? <Radio aria-hidden="true" size={16} /> : <AudioLines aria-hidden="true" size={16} />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <strong className="truncate text-xs font-medium">{channel.name}</strong>
                          {channel.type === 13 ? <span className="rounded border border-[#39433b] px-1.5 py-0.5 text-[9px] uppercase text-[#929b91]">Stage</span> : null}
                        </div>
                        <p className="mt-1 text-[10px] text-[#929b91]">{config ? "Managed by Loom" : "Not managed"}</p>
                      </div>
                    </div>
                    {config ? (
                      <div className="grid gap-3 border-t border-[#2b332d] px-3 py-3">
                        <button
                          aria-pressed={config.purpose === "PRODUCTIVITY"}
                          className={`flex min-h-10 min-w-0 items-center gap-2 rounded border px-2.5 py-2 text-left transition-colors ${config.purpose === "PRODUCTIVITY" ? "border-[#72835f] bg-[#293326] text-[#e3edda]" : "border-[#39433b] bg-[#171c18] text-[#bac1b7] hover:border-[#586653]"}`}
                          disabled={savingVoiceChannels}
                          onClick={() => updateVoiceChannel(channel.id, { purpose: config.purpose === "PRODUCTIVITY" ? "NONE" : "PRODUCTIVITY" })}
                          type="button"
                        >
                          <span className={`grid size-4 shrink-0 place-items-center rounded-full border ${config.purpose === "PRODUCTIVITY" ? "border-[#a9c786] bg-[#a9c786] text-[#182018]" : "border-[#596259]"}`}>{config.purpose === "PRODUCTIVITY" ? <span aria-hidden="true" className="text-[10px] font-bold">✓</span> : null}</span>
                          <span className="min-w-0"><span className="block text-[11px] font-semibold">Productivity room</span><span className="mt-0.5 block text-[10px] text-[#929b91]">{config.purpose === "PRODUCTIVITY" ? "Enabled" : "Off"}</span></span>
                        </button>
                        <div aria-label={`Voice mode for ${channel.name}`} className="grid grid-cols-3 rounded border border-[#39433b] bg-[#141915] p-1" role="group">
                          {([
                            { value: "ANY", label: "Any", icon: <AudioLines aria-hidden="true" size={14} /> },
                            { value: "CAM_ONLY", label: "Camera Only", icon: <Camera aria-hidden="true" size={14} /> },
                            { value: "CAM_SCREENSHARE", label: "Cam/Screenshare", icon: <MonitorPlay aria-hidden="true" size={14} /> },
                          ] as const).map((mode) => (
                            <button
                              aria-pressed={config.type === mode.value}
                              className={`flex min-h-8 min-w-0 items-center justify-center gap-1 rounded px-1 text-[10px] transition-colors ${config.type === mode.value ? "bg-[#35402f] text-[#e3edda] shadow-sm" : "text-[#929b91] hover:text-[#f0f2ec]"}`}
                              disabled={savingVoiceChannels}
                              key={mode.value}
                              onClick={() => updateVoiceChannel(channel.id, { type: mode.value })}
                              type="button"
                            >
                              {mode.icon}<span className="truncate">{mode.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#2b332d] pt-3">
            <p aria-live="polite" className={`text-[11px] ${voiceSaveFeedback.startsWith("Could not") ? "text-[#e6a18d]" : "text-[#929b91]"}`} role="status">
              {voiceSaveFeedback || (voiceChangesPending ? "Unsaved changes" : "All changes applied")}
            </p>
            <button
              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-md border border-[#72835f] bg-[#35402f] px-3 text-xs font-semibold text-[#e3edda] transition hover:bg-[#414e39] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!voiceChangesPending || savingVoiceChannels}
              onClick={() => void applyVoiceChannelSettings()}
              type="button"
            >
              {savingVoiceChannels ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <Save aria-hidden="true" size={15} />}
              {savingVoiceChannels ? "Applying..." : "Apply changes"}
            </button>
          </div>
        </div>
      </section>
      {feedback ? <p className="mt-3 text-[11px] leading-relaxed text-[#929b91]" role="status">{feedback}</p> : null}
    </article>
  );
}