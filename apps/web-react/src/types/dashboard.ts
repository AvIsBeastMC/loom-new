import type { API_AI_Reports, API_violations, DiscordResponse } from "@repo/extra-types";

export type AdminAccount = {
  username: string;
  password: string;
  discordUserId: string;
};

export type AuthResponse = {
  discord: DiscordResponse;
  main: AdminAccount;
};

export type DiscordChannel = {
  id: string;
  name: string;
  type: number;
};

export type DiscordChannelDetails = {
  id: string;
  name?: string;
  type: number;
};

export type DashboardViolation = Omit<API_violations[number], "time"> & {
  time: string;
};

export type DashboardReport = Omit<API_AI_Reports[number]["reports"][number], "timestamp"> & {
  timestamp: string;
};

export type DashboardServerReports = Omit<API_AI_Reports[number], "reports"> & {
  reports: DashboardReport[];
};

export type ReportsResponse = {
  data: DashboardServerReports[];
};

export type ReportMessage = {
  id: string;
  content: string;
  dateTime: string;
  rawData: { channelId?: string } | null;
  user: {
    username?: string;
    global_name?: string | null;
    icon?: string | null;
  } | null;
};

export type ToggleBotTestingResponse = {
  data: { test_mode: boolean };
};