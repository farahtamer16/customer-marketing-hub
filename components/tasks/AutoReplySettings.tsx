"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";

const CLASSIFICATIONS = [
  "Lead",
  "Question",
  "Complaint",
  "Feedback",
  "Engagement",
  "Other",
] as const;

export default function AutoReplySettings() {
  const t = useTranslations("tasks");
  const settings = useQuery(api.workspaces.getAutoReplySettings);

  if (settings === undefined) {
    return (
      <div className="glass-card mb-6 flex items-center gap-2 rounded-3xl p-5 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" />
        {t("autoReplyLoading")}
      </div>
    );
  }

  // Keyed on the loaded values so the form's local state is only ever
  // initialized once, from real data — no effect needed to sync it in
  // after the query resolves, and no risk of clobbering an in-progress
  // edit if the query happens to refresh in the background.
  return (
    <AutoReplyForm
      key={`${settings.enabled}:${settings.classifications.join(",")}`}
      initialEnabled={settings.enabled}
      initialClassifications={settings.classifications}
    />
  );
}

function AutoReplyForm({
  initialEnabled,
  initialClassifications,
}: {
  initialEnabled: boolean;
  initialClassifications: string[];
}) {
  const t = useTranslations("tasks");
  const statusT = useTranslations("statusValues");
  const updateSettings = useMutation(api.workspaces.updateAutoReplySettings);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [classifications, setClassifications] = useState<string[]>(initialClassifications);
  const [saving, setSaving] = useState(false);

  const toggleClassification = (value: string) => {
    setClassifications((current) =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateSettings({
        enabled,
        classifications: classifications as (typeof CLASSIFICATIONS)[number][],
      });
      toast.success(t("autoReplySaved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("autoReplySaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="glass-card mb-6 rounded-3xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-blue-50 text-[#3556d9]">
            <Sparkles size={18} />
          </span>
          <div>
            <h2 className="font-semibold text-[#071e55]">{t("autoReplyTitle")}</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
              {t("autoReplyDescription")}
            </p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          {t("autoReplyEnable")}
        </label>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
        <TriangleAlert size={15} className="mt-0.5 flex-none" />
        {t("autoReplyWarning")}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {CLASSIFICATIONS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => toggleClassification(value)}
            disabled={!enabled}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              classifications.includes(value)
                ? "border-[#173b9a] bg-[#173b9a] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
            }`}
          >
            {statusT(value)}
          </button>
        ))}
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {t("autoReplySave")}
        </button>
      </div>
    </section>
  );
}
