import { useEffect, useState } from "react";
import { 
  createClient, 
  type RealtimePostgresChangesPayload 
} from "@supabase/supabase-js";
import { env } from "~/env";

export type SessionStatus = "ACTIVE" | "PAST";

export interface VoiceSessionRow {
  id: string;
  guild_id: string;
  user_id: string;
  channel_id: string;
  status: SessionStatus;
  joined_at: string;
  left_at: string | null;
  duration_seconds: number;
}

const supabase = createClient(
  "https://supabase.arunnya.com", 
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

export const useGetRealtimeVoice = () => {
  const [sessions, setSessions] = useState<VoiceSessionRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // 1. Initial snapshot fetch
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const pastCutoff = new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString();
        const { data, error: fetchError } = await supabase
          .from("voice_sessions")
          .select("*")
          .or(`status.eq.ACTIVE,and(status.eq.PAST,left_at.gte.${pastCutoff})`);

        if (fetchError) throw fetchError;
        setSessions((data as VoiceSessionRow[]) || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // 2. Realtime WebSocket subscription with typed payload
    const channel = supabase
      .channel("voice_sessions_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "voice_sessions",
        },
        (payload: RealtimePostgresChangesPayload<VoiceSessionRow>) => {
          if (payload.eventType === "INSERT") {
            const newRow = payload.new;
            setSessions((prev) => [...prev, newRow]);
          } else if (payload.eventType === "UPDATE") {
            const updatedRow = payload.new;
            setSessions((prev) =>
              prev.map((item) => (item.id === updatedRow.id ? updatedRow : item))
            );
          } else if (payload.eventType === "DELETE") {
            // payload.old will contain { id } (or all columns if replica identity full is enabled)
            const deletedId = (payload.old as Partial<VoiceSessionRow>).id;
            if (deletedId) {
              setSessions((prev) => prev.filter((item) => item.id !== deletedId));
            }
          }
        }
      )
      .subscribe();

    // 3. Cleanup
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  return { sessions, loading, error };
};