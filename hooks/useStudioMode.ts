"use client";

import { useCallback, useState } from "react";

// What the admin's Content Studio sidebar section is currently scoped to.
// "workspace" (the default — matches choosing "workspace" at sign-up: you
// see the whole workspace's real content, not an empty personal feed) —
// "mine" (just the admin's own personal content, same as everyone else
// gets) — or a specific team's id (that team's real aggregate content).
// Growth Hub is unaffected by this — it's a separate section, always
// visible. Purely a per-browser UI preference (localStorage), never
// shared or read by anyone else.
export type StudioView = "workspace" | "mine" | string;

const STORAGE_KEY = "spiders-ai:studio-view";

function readStored(): StudioView {
  if (typeof window === "undefined") return "workspace";
  try {
    return window.localStorage.getItem(STORAGE_KEY) || "workspace";
  } catch {
    return "workspace";
  }
}

export function useStudioMode() {
  const [view, setViewState] = useState<StudioView>(() => readStored());

  const setView = useCallback((next: StudioView) => {
    setViewState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Best-effort only — worst case the choice doesn't survive a reload.
    }
  }, []);

  return { view, setView };
}
