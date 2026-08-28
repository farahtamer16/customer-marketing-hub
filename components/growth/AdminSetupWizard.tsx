"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Database,
  Megaphone,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import PageHeader from "@/components/hub/PageHeader";
import { workspaceRoles } from "@/lib/workspace-data";
import { PrototypeNotices, WorkspaceRolePill } from "./TeamPrimitives";

const steps = ["organization", "data", "team", "access", "approvals"] as const;
const sources = [
  "facebook",
  "instagram",
  "website",
  "crm",
  "product",
  "support",
] as const;

export default function AdminSetupWizard() {
  const t = useTranslations("growth");
  const [step, setStep] = useState(0);
  const [organization, setOrganization] = useState("Spiders AI");
  const [connected, setConnected] = useState<string[]>([
    "facebook",
    "instagram",
  ]);
  const [rules, setRules] = useState({
    socialNeedsManager: true,
    highRiskNeedsCmo: true,
    managerCanPublish: true,
    blockUnapprovedSchedule: true,
  });
  const [complete, setComplete] = useState(false);

  const toggleSource = (source: string) =>
    setConnected((current) =>
      current.includes(source)
        ? current.filter((item) => item !== source)
        : [...current, source],
    );

  return (
    <>
      <Link
        href="/growth/workspace"
        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#173b9a]"
      >
        <ArrowLeft className="rtl:rotate-180" size={16} /> {t("setup.back")}
      </Link>
      <PageHeader
        eyebrow={t("setup.eyebrow")}
        title={t("setup.title")}
        description={t("setup.description")}
      />
      <PrototypeNotices />

      <section className="mt-6 glass-card overflow-hidden rounded-3xl">
        <div className="grid gap-px bg-slate-100 sm:grid-cols-5">
          {steps.map((item, index) => (
            <button
              key={item}
              type="button"
              onClick={() => !complete && setStep(index)}
              className={`flex items-center gap-3 bg-white px-4 py-4 text-start ${index === step && !complete ? "text-[#173b9a]" : "text-slate-400"}`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${index < step || complete ? "bg-emerald-500 text-white" : index === step ? "bg-[#3156dc] text-white" : "bg-slate-100"}`}
              >
                {index < step || complete ? <Check size={13} /> : index + 1}
              </span>
              <span className="text-xs font-semibold">
                {t(`setup.steps.${item}`)}
              </span>
            </button>
          ))}
        </div>

        <div className="p-6 sm:p-8">
          {complete ? (
            <div className="mx-auto max-w-xl py-10 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={30} />
              </span>
              <h2 className="mt-5 text-2xl font-semibold text-[#071e55]">
                {t("setup.completeTitle")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {t("setup.completeDescription", { organization })}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/growth/workspace"
                  className="rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white"
                >
                  {t("setup.openWorkspace")}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setComplete(false);
                    setStep(0);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600"
                >
                  {t("setup.reviewSetup")}
                </button>
              </div>
            </div>
          ) : (
            <>
              {step === 0 && (
                <SetupPanel
                  icon={ShieldCheck}
                  title={t("setup.organizationTitle")}
                  description={t("setup.organizationDescription")}
                >
                  <label className="block text-sm font-semibold text-slate-700">
                    {t("setup.organizationName")}
                    <input
                      value={organization}
                      onChange={(event) => setOrganization(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    />
                  </label>
                </SetupPanel>
              )}
              {step === 1 && (
                <SetupPanel
                  icon={Database}
                  title={t("setup.dataTitle")}
                  description={t("setup.dataDescription")}
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {sources.map((source) => {
                      const selected = connected.includes(source);
                      return (
                        <button
                          key={source}
                          type="button"
                          onClick={() => toggleSource(source)}
                          className={`flex items-center justify-between rounded-2xl border p-4 text-sm font-semibold ${selected ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600"}`}
                        >
                          <span>{t(`setup.sources.${source}`)}</span>
                          <span
                            className={`grid h-6 w-6 place-items-center rounded-full ${selected ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-300"}`}
                          >
                            {selected ? <Check size={12} /> : "+"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </SetupPanel>
              )}
              {step === 2 && (
                <SetupPanel
                  icon={UsersRound}
                  title={t("setup.teamTitle")}
                  description={t("setup.teamDescription")}
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {workspaceRoles.map((item) => (
                      <div
                        key={item.role}
                        className="rounded-2xl border border-slate-100 bg-white/70 p-4"
                      >
                        <WorkspaceRolePill role={item.role} />
                        <p className="mt-3 text-xs leading-5 text-slate-500">
                          {t(`roleDescriptions.${item.role}`)}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/growth/team"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#2854dc]"
                  >
                    {t("setup.manageTeam")}{" "}
                    <ArrowRight className="rtl:rotate-180" size={14} />
                  </Link>
                </SetupPanel>
              )}
              {step === 3 && (
                <SetupPanel
                  icon={ShieldCheck}
                  title={t("setup.accessTitle")}
                  description={t("setup.accessDescription")}
                >
                  <div className="space-y-3">
                    {workspaceRoles.map((item) => (
                      <div
                        key={item.role}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/70 p-4"
                      >
                        <WorkspaceRolePill role={item.role} />
                        <span className="text-xs font-semibold text-slate-500">
                          {t("setup.permissionCount", {
                            count: item.permissions.length,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </SetupPanel>
              )}
              {step === 4 && (
                <SetupPanel
                  icon={Megaphone}
                  title={t("setup.approvalTitle")}
                  description={t("setup.approvalDescription")}
                >
                  <div className="space-y-3">
                    {(Object.keys(rules) as (keyof typeof rules)[]).map(
                      (rule) => (
                        <label
                          key={rule}
                          className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-100 bg-white/70 p-4"
                        >
                          <input
                            type="checkbox"
                            checked={rules[rule]}
                            onChange={(event) =>
                              setRules((current) => ({
                                ...current,
                                [rule]: event.target.checked,
                              }))
                            }
                            className="mt-0.5 h-4 w-4 accent-[#3156dc]"
                          />
                          <span>
                            <span className="block text-sm font-semibold text-[#071e55]">
                              {t(`setup.rules.${rule}`)}
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                              {t(`setup.ruleHints.${rule}`)}
                            </span>
                          </span>
                        </label>
                      ),
                    )}
                  </div>
                </SetupPanel>
              )}

              <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                <button
                  type="button"
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  disabled={step === 0}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                >
                  {t("setup.previous")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    step === steps.length - 1
                      ? setComplete(true)
                      : setStep((current) => current + 1)
                  }
                  disabled={!organization.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {step === steps.length - 1
                    ? t("setup.finish")
                    : t("setup.next")}{" "}
                  <ArrowRight className="rtl:rotate-180" size={15} />
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

function SetupPanel({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#3156dc]">
          <Icon size={20} />
        </span>
        <div>
          <h2 className="font-semibold text-[#071e55]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>
      <div className="mt-6">{children}</div>
    </div>
  );
}
