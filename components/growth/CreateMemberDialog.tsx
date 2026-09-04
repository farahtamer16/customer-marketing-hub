"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { Check, Copy, MailPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { workspaceRoles } from "@/lib/workspace-data";
import type { WorkspaceRole } from "@/types/growth";

export default function CreateMemberDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("growth");
  const teams = useQuery(api.teams.listTeams) ?? [];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("socialMediaUser");
  const [teamId, setTeamId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const valid = name.trim().length >= 2 && /^\S+@\S+\.\S+$/.test(email);

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
    setEmail("");
    setRole("socialMediaUser");
    setTeamId("");
    setResult(null);
    setCopied(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/team/create-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          role,
          teamId: teamId || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? t("team.createMemberFailed"));
      setResult({ email: email.trim(), password: data.temporaryPassword });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("team.createMemberFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-member-title"
        className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#3156dc]">
              <MailPlus size={20} />
            </span>
            <div>
              <h2 id="create-member-title" className="font-semibold text-[#071e55]">
                {t("team.inviteTitle")}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t("team.createMemberDescription")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("team.close")}
          >
            <X size={18} />
          </button>
        </div>

        {result ? (
          <div className="space-y-5 p-6">
            <p className="text-sm leading-6 text-slate-600">
              {t("team.createMemberSuccess", { email: result.email })}
            </p>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                {t("team.temporaryPassword")}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-[#071e55]">
                  {result.password}
                </code>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(result.password);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="rounded-xl border border-slate-200 p-3 text-slate-500 hover:bg-slate-50"
                  aria-label={t("team.copyPassword")}
                >
                  {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                </button>
              </div>
              <p className="mt-2 text-xs text-amber-700">{t("team.temporaryPasswordHint")}</p>
            </div>
            <div className="flex justify-end border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={close}
                className="rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white"
              >
                {t("team.done")}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5 p-6">
            <label className="block text-sm font-semibold text-slate-700">
              {t("team.name")}
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("team.namePlaceholder")}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              {t("team.email")}
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              {t("team.role")}
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as WorkspaceRole)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {workspaceRoles.map((definition) => (
                  <option key={definition.role} value={definition.role}>
                    {t(`workspaceRoles.${definition.role}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              {t("team.assignTeam")}
              <select
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">{t("team.noTeam")}</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
              {t("team.createMemberHint")}
            </p>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={close}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                {t("team.cancel")}
              </button>
              <button
                type="submit"
                disabled={!valid || submitting}
                className="rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("team.sendInvite")}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
