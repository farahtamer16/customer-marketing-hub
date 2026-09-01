"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { SignalKind, SignalSource } from "@/types/growth";
import { signalKinds, signalSources } from "@/lib/growth-data";

export default function LogSignalDialog({
  open,
  onClose,
  accountId,
}: {
  open: boolean;
  onClose: () => void;
  accountId: string;
}) {
  const t = useTranslations("growth");
  const addSignal = useMutation(api.growth.addSignal);
  const [source, setSource] = useState<SignalSource>("website");
  const [kind, setKind] = useState<SignalKind>("pricingVisit");
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const reset = () => {
    setSource("website");
    setKind("pricingVisit");
    setDetail("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await addSignal({
        accountId: accountId as Id<"growthAccounts">,
        signal: {
          id: crypto.randomUUID(),
          source,
          kind,
          occurredAt: Date.now(),
          detail: detail.trim() || undefined,
        },
      });
      reset();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("logSignal.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-signal-title"
        className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#3156dc]">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 id="log-signal-title" className="font-semibold text-[#071e55]">
                {t("logSignal.title")}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t("logSignal.description")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("logSignal.cancel")}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              {t("logSignal.source")}
              <select
                value={source}
                onChange={(event) => setSource(event.target.value as SignalSource)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {signalSources.map((value) => (
                  <option key={value} value={value}>
                    {t(`sources.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              {t("logSignal.kind")}
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as SignalKind)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {signalKinds.map((value) => (
                  <option key={value} value={value}>
                    {t(`signals.${value}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold text-slate-700">
            {t("logSignal.detail")}
            <textarea
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              rows={3}
              placeholder={t("logSignal.detailPlaceholder")}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              {t("logSignal.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("logSignal.submit")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
