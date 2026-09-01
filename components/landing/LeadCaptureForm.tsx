"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { CheckCircle2, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { getVisitorId } from "@/hooks/useVisitorId";

export default function LeadCaptureForm() {
  const t = useTranslations("landing");
  const captureLead = useMutation(api.consumerJourney.captureLead);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status !== "idle") return;
    setStatus("submitting");
    setError(null);
    try {
      await captureLead({ visitorId: getVisitorId(), email: email.trim() });
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("leadCapture.failed"));
      setStatus("idle");
    }
  };

  if (status === "done") {
    return (
      <p className="mt-6 flex items-center gap-2 text-sm font-medium text-emerald-600">
        <CheckCircle2 size={16} />
        {t("leadCapture.success")}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 max-w-sm">
      <p className="text-xs font-semibold text-slate-500">
        {t("leadCapture.title")}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2">
          <Mail size={15} className="shrink-0 text-slate-400" />
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("leadCapture.placeholder")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
        <button
          type="submit"
          disabled={status === "submitting"}
          className="shrink-0 rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "submitting" ? t("leadCapture.submitting") : t("leadCapture.submit")}
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
    </form>
  );
}
