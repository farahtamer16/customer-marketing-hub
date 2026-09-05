"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { UsersRound, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { WorkspaceMember } from "@/types/growth";

export default function CreateTeamDialog({
  open,
  onClose,
  members,
}: {
  open: boolean;
  onClose: () => void;
  members: WorkspaceMember[];
}) {
  const t = useTranslations("growth.team");
  const createTeam = useMutation(api.teams.createTeam);
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
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
    setName("");
    setMemberIds([]);
  };

  const close = () => {
    reset();
    onClose();
  };

  const toggleMember = (id: string) => {
    setMemberIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createTeam({
        name: name.trim(),
        memberIds: memberIds as Id<"teamMembers">[],
      });
      close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("createTeamFailed"));
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
        aria-labelledby="create-team-title"
        className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#3156dc]">
              <UsersRound size={20} />
            </span>
            <div>
              <h2 id="create-team-title" className="font-semibold text-[#071e55]">
                {t("createTeam")}
              </h2>
              <p className="mt-1 text-xs text-slate-500">{t("createTeamDialogHint")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("close")}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          <label className="block text-sm font-semibold text-slate-700">
            {t("newTeamPlaceholder")}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("newTeamPlaceholder")}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <div>
            <p className="text-sm font-semibold text-slate-700">{t("linkMembers")}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{t("linkMembersHint")}</p>
            {members.length === 0 ? (
              <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
                {t("noMembersToLink")}
              </p>
            ) : (
              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {members.map((member) => (
                  <label
                    key={member.id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={memberIds.includes(member.id)}
                      onChange={() => toggleMember(member.id)}
                      className="h-4 w-4 accent-[#3156dc]"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
                      {member.name}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{member.email}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={close}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || submitting}
              className="rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("createTeam")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
