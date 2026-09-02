"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Building2, Sparkles, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { journeyStages } from "@/lib/growth-data";
import type { GrowthStage } from "@/types/growth";

const tiers = ["enterprise", "midMarket", "smallBusiness"] as const;

export default function NewAccountDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("growth");
  const format = useFormatter();
  const createAccount = useMutation(api.growth.createAccount);
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [employees, setEmployees] = useState("");
  const [tier, setTier] = useState<(typeof tiers)[number]>("smallBusiness");
  const [stage, setStage] = useState<GrowthStage>("discover");
  const [owner, setOwner] = useState("");
  const [pipelineValue, setPipelineValue] = useState("");
  const [ltv, setLtv] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const valid = name.trim().length >= 2 && domain.trim().length >= 2 && owner.trim().length >= 2;

  // A real benchmark from what accounts of this tier actually became once
  // they closed — not a guess. Re-queries whenever tier changes.
  const estimate = useQuery(api.growth.estimateOutcomes, { tier });

  const applyEstimate = () => {
    if (!estimate) return;
    setPipelineValue(String(estimate.avgPipeline));
    setLtv(String(estimate.avgLtv));
  };

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
    setName("");
    setDomain("");
    setIndustry("");
    setEmployees("");
    setTier("smallBusiness");
    setStage("discover");
    setOwner("");
    setPipelineValue("");
    setLtv("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await createAccount({
        name: name.trim(),
        domain: domain.trim(),
        industry: industry.trim() || "Unspecified",
        employees: Number(employees) || 0,
        tier,
        stage,
        owner: owner.trim(),
        pipelineValue: Number(pipelineValue) || 0,
        ltv: Number(ltv) || 0,
      });
      reset();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("accounts.createFailed"));
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
        aria-labelledby="new-account-title"
        className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#3156dc]">
              <Building2 size={20} />
            </span>
            <div>
              <h2 id="new-account-title" className="font-semibold text-[#071e55]">
                {t("accounts.newAccountTitle")}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t("accounts.newAccountDescription")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("accounts.cancel")}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              {t("accounts.name")}
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              {t("accounts.domain")}
              <input
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                placeholder="company.com"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              {t("accounts.industry")}
              <input
                value={industry}
                onChange={(event) => setIndustry(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              {t("accounts.employees")}
              <input
                type="number"
                min={0}
                value={employees}
                onChange={(event) => setEmployees(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              {t("accounts.tier")}
              <select
                value={tier}
                onChange={(event) => setTier(event.target.value as (typeof tiers)[number])}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {tiers.map((value) => (
                  <option key={value} value={value}>
                    {t(`tiers.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              {t("accounts.stage")}
              <select
                value={stage}
                onChange={(event) => setStage(event.target.value as GrowthStage)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {journeyStages.map((value) => (
                  <option key={value} value={value}>
                    {t(`stages.${value}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold text-slate-700">
            {t("accounts.owner")}
            <input
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>
          {estimate && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-800">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={13} className="shrink-0" />
                {t(
                  estimate.sameTier
                    ? "accounts.estimateSameTier"
                    : "accounts.estimateAllTiers",
                  {
                    count: estimate.sampleSize,
                    pipeline: format.number(estimate.avgPipeline, {
                      style: "currency",
                      currency: "USD",
                      notation: "compact",
                    }),
                    ltv: format.number(estimate.avgLtv, {
                      style: "currency",
                      currency: "USD",
                      notation: "compact",
                    }),
                  },
                )}
              </span>
              <button
                type="button"
                onClick={applyEstimate}
                className="shrink-0 rounded-lg bg-white px-3 py-1.5 font-bold text-blue-700 shadow-sm hover:bg-blue-100"
              >
                {t("accounts.useEstimate")}
              </button>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              {t("accounts.pipelineValue")}
              <input
                type="number"
                min={0}
                value={pipelineValue}
                onChange={(event) => setPipelineValue(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              {t("accounts.ltv")}
              <input
                type="number"
                min={0}
                value={ltv}
                onChange={(event) => setLtv(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              {t("accounts.cancel")}
            </button>
            <button
              type="submit"
              disabled={!valid || submitting}
              className="rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("accounts.create")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
