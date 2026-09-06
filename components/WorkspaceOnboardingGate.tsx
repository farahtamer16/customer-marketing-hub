"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Building2, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";

// Gates the whole private app behind a one-time choice for a brand-new,
// uninvited sign-in. Under multi-tenancy there's no shared workspace left
// to join without a real invite, so both options here create a brand-new,
// isolated workspace (workspaces.createWorkspace) — "workspace" and
// "individual" only differ in which dashboard/nav the creator lands on by
// default (dashboardHint), never in their actual permissions: both are
// ownerAdmin of their own new workspace, so neither can be locked out of
// it. An invited or admin-created member never sees this — they already
// have a role and workspace — see team.needsOnboardingChoice.
export default function WorkspaceOnboardingGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("onboarding");
  const needsChoice = useQuery(api.team.needsOnboardingChoice);
  const ensureCurrentMember = useMutation(api.team.ensureCurrentMember);
  const createWorkspace = useMutation(api.workspaces.createWorkspace);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState<"workspace" | "individual" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (needsChoice === false) {
      ensureCurrentMember().catch((err) => {
        console.error("Failed to initialize team member:", err);
      });
    }
  }, [needsChoice, ensureCurrentMember]);

  if (needsChoice === undefined) return null;

  if (needsChoice === true) {
    const choose = async (intent: "workspace" | "individual") => {
      if (!name.trim()) {
        setError(t("nameRequired"));
        return;
      }
      setSubmitting(intent);
      setError(null);
      try {
        await createWorkspace({ name: name.trim(), intent });
      } catch (err) {
        setError(err instanceof Error ? err.message : t("failed"));
        setSubmitting(null);
      }
    };

    return (
      <div className="grid min-h-screen place-items-center bg-[#f4f6ff] p-6">
        <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-xl sm:p-10">
          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-[#071e55]">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t("description")}</p>

          <label className="mt-6 block text-sm font-semibold text-slate-700">
            {t("nameLabel")}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("namePlaceholder")}
              disabled={submitting !== null}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => choose("workspace")}
              disabled={submitting !== null}
              className="flex flex-col items-start gap-3 rounded-2xl border-2 border-transparent bg-blue-50/60 p-6 text-start transition hover:border-[#173b9a] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#173b9a] text-white">
                <Building2 size={20} />
              </span>
              <span className="font-semibold text-[#071e55]">{t("workspaceTitle")}</span>
              <span className="text-xs leading-5 text-slate-500">{t("workspaceDescription")}</span>
              {submitting === "workspace" && (
                <span className="text-xs font-semibold text-[#173b9a]">{t("settingUp")}</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => choose("individual")}
              disabled={submitting !== null}
              className="flex flex-col items-start gap-3 rounded-2xl border-2 border-transparent bg-emerald-50/60 p-6 text-start transition hover:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 text-white">
                <User size={20} />
              </span>
              <span className="font-semibold text-[#071e55]">{t("individualTitle")}</span>
              <span className="text-xs leading-5 text-slate-500">{t("individualDescription")}</span>
              {submitting === "individual" && (
                <span className="text-xs font-semibold text-emerald-700">{t("settingUp")}</span>
              )}
            </button>
          </div>
          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
