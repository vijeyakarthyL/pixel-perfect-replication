import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export const playerId =
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export type PresenceMeta = {
  name: string;
  team: string;
  driver: string;
  host: boolean;
  joinedAt: number;
};

export type RosterEntry = PresenceMeta & { id: string };

type Handlers = {
  onRoster?: (roster: RosterEntry[]) => void;
  onEvent?: (event: string, payload: Record<string, unknown>) => void;
  onStatus?: (status: string) => void;
};

/**
 * One realtime channel per room, subscribed exactly once and always torn down.
 * Handlers flow through a ref so only the room identity re-runs the effect.
 */
export function useGameChannel(room: string | null, meta: PresenceMeta, handlers: Handlers) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const h = useRef(handlers);
  h.current = handlers;
  const metaRef = useRef(meta);
  metaRef.current = meta;

  useEffect(() => {
    if (!room) return;
    const channel = supabase.channel(`apexgp:${room}`, {
      config: { broadcast: { self: false }, presence: { key: playerId } },
    });

    channel
      .on("broadcast", { event: "*" }, (message) => {
        const m = message as Record<string, unknown>;
        const payload = (m["payload"] ?? {}) as Record<string, unknown>;
        h.current.onEvent?.(String(m["event"]), payload);
      })
      .on("presence", { event: "sync" }, () => {
        const roster = Object.entries(channel.presenceState<PresenceMeta>()).map(([id, metas]) => {
          const m = metas[0];
          return {
            id,
            name: m?.name ?? "Driver",
            team: m?.team ?? "velocity-titan",
            driver: m?.driver ?? "",
            host: Boolean(m?.host),
            joinedAt: m?.joinedAt ?? 0,
          };
        });
        h.current.onRoster?.(roster.sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id)));
      })
      .subscribe((status) => {
        console.log("[net] channel:", status);
        h.current.onStatus?.(status);
        if (status === "SUBSCRIBED") void channel.track(metaRef.current);
      });

    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [room]);

  return channelRef;
}

export function sendEvent(
  channel: RealtimeChannel | null,
  event: string,
  payload: Record<string, unknown>,
) {
  if (!channel) return;
  void channel.send({ type: "broadcast", event, payload });
}
