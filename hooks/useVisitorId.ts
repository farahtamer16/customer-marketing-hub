"use client";

// A browser-generated id for anonymous consumer-journey tracking on the
// public landing page — not a login, just enough to tell "the same visitor
// came back" from "a new visitor." Falls back to a per-load id if
// localStorage is unavailable (private browsing, blocked storage) so
// tracking calls still succeed, they just won't persist across visits.
const STORAGE_KEY = "spiders-ai:visitor-id";

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getVisitorId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const created = generateId();
    localStorage.setItem(STORAGE_KEY, created);
    return created;
  } catch {
    return generateId();
  }
}

// Read-only — for the sign-up-linking step. Deliberately does NOT create a
// new id: someone who signs in without ever visiting the tracked landing
// page (an invited teammate given a direct link, say) shouldn't show up as
// a phantom "signed up" row in the consumer funnel with no real visit or
// engagement behind it.
export function peekVisitorId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
