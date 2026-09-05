"use client";

import { useCallback, useState } from "react";

// Admin-only sidebar mode: "admin" shows the Growth Hub nav (accounts,
// leads, journeys, approvals, revenue, team, audit) as before. "content"
// shows the Content Studio nav, scoped to one team the admin picks first —
// real posts/calendar/comments/analytics for that team, not the admin's
// own personal content. Purely a per-browser UI preference (localStorage),
// never shared or read by anyone else.
const STORAGE_KEY = "spiders-ai:studio-mode";

type StudioMode = "admin" | "content";

interface StoredState {
  mode: StudioMode;
  teamId: string | null;
}

function readStored(): StoredState {
  if (typeof window === "undefined") return { mode: "admin", teamId: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mode: "admin", teamId: null };
    const parsed = JSON.parse(raw);
    return {
      mode: parsed.mode === "content" ? "content" : "admin",
      teamId: typeof parsed.teamId === "string" ? parsed.teamId : null,
    };
  } catch {
    return { mode: "admin", teamId: null };
  }
}

export function useStudioMode() {
  const [state, setState] = useState<StoredState>(() => readStored());

  const persist = useCallback((next: StoredState) => {
    setState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Best-effort only — worst case the choice doesn't survive a reload.
    }
  }, []);

  const setMode = useCallback(
    (mode: StudioMode) => {
      persist({ mode, teamId: mode === "content" ? state.teamId : null });
    },
    [persist, state.teamId],
  );

  const setTeamId = useCallback(
    (teamId: string | null) => {
      persist({ mode: "content", teamId });
    },
    [persist],
  );

  return { mode: state.mode, teamId: state.teamId, setMode, setTeamId };
}
