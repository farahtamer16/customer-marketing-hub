"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { DebugConnectionResult } from "@/convex/meta";

export function ConnectionDiagnostics({
  platform,
}: {
  platform: "Facebook" | "Instagram";
}) {
  const { user } = useUser();
  const debugConnection = useAction(api.meta.debugConnection);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<DebugConnectionResult | null>(null);

  const check = async () => {
    if (!user) return;
    setChecking(true);
    try {
      const data = await debugConnection({ platform });
      setResult(data);
    } catch (error) {
      setResult({
        connected: true,
        error: error instanceof Error ? error.message : "Failed to check connection",
      } as DebugConnectionResult);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={check}
        disabled={checking}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2854dc] hover:text-[#173b9a] disabled:opacity-50"
      >
        {checking ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
        {checking ? "Checking…" : "Check connection"}
      </button>

      {result && !result.connected && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
          <ShieldAlert size={13} className="mt-0.5 shrink-0" />
          Not connected in the database.
        </p>
      )}

      {result && result.connected && "error" in result && result.error && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-rose-700">
          <ShieldAlert size={13} className="mt-0.5 shrink-0" />
          {result.error}
        </p>
      )}

      {result && result.connected && "isValid" in result && (
        <div className="mt-2 space-y-1 text-xs">
          <p className={result.isValid ? "text-emerald-700" : "text-rose-700"}>
            Token: {result.isValid ? "valid" : "invalid or expired"}
            {result.tokenError ? ` — ${result.tokenError}` : ""}
          </p>
          {result.expiresAt && (
            <p className="text-slate-500">
              Expires: {new Date(result.expiresAt).toLocaleString()}
            </p>
          )}
          <p className="text-slate-500">
            Scopes:{" "}
            {result.scopes.length ? result.scopes.join(", ") : "(none returned)"}
          </p>
          <p className={result.scopes.includes("pages_read_engagement") ? "text-emerald-700" : "text-rose-700"}>
            pages_read_engagement:{" "}
            {result.scopes.includes("pages_read_engagement") ? "granted" : "missing"}
          </p>
        </div>
      )}
    </div>
  );
}
