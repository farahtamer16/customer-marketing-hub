"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Building2, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";

// Gates the whole private app behind a one-time choice for a brand-new,
// uninvited sign-in: set up their own workspace (owner/admin) or join as an
// individual contributor. An invited or admin-created member never sees
// this — they already have a role — see team.needsOnboardingChoice.
export default function WorkspaceOnboardingGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("onboarding");
  const needsChoice = useQuery(api.team.needsOnboardingChoice);
  const ensureCurrentMember = useMutation(api.team.ensureCurrentMember);
  const [submitting, setSubmitting] = useState<"workspace" | "individual" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (needsChoice === false) {
      ensureCurrentMember({}).catch((err) => {
        console.error("Failed to initialize team member:", err);
      });
    }
  }, [needsChoice, ensureCurrentMember]);

  if (needsChoice === undefined) return null;

  if (needsChoice === true) {
    const choose = async (intent: "workspace" | "individual") => {
      setSubmitting(intent);
      setError(null);
      try {
        await ensureCurrentMember({ intent });
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
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
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
