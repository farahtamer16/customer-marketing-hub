"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ClipboardList, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const STATUS_ORDER = ["Todo", "InProgress", "Completed"] as const;

export default function TeamTasksDialog({
  teamId,
  teamName,
  open,
  onClose,
}: {
  teamId: Id<"teams"> | null;
  teamName: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("growth.teamTasks");
  const statusLabels = useTranslations("statusValues");
  const tasks = useQuery(api.teamTasks.listTasksForTeam, teamId ? { teamId } : "skip") ?? [];
  const createTask = useMutation(api.teamTasks.createTeamTask);
  const updateStatus = useMutation(api.teamTasks.updateTeamTaskStatus);
  const deleteTask = useMutation(api.teamTasks.deleteTeamTask);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open || !teamId) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await createTask({ teamId, title: title.trim() });
      setTitle("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("createFailed"));
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
        aria-labelledby="team-tasks-title"
        className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#3156dc]">
              <ClipboardList size={20} />
            </span>
            <div>
              <h2 id="team-tasks-title" className="font-semibold text-[#071e55]">
                {t("title", { name: teamName })}
              </h2>
              <p className="mt-1 text-xs text-slate-500">{t("description")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("close")}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("newTaskPlaceholder")}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={!title.trim() || submitting}
            className="rounded-xl bg-[#173b9a] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("addTask")}
          </button>
        </form>

        <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
          {tasks.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-slate-500">{t("empty")}</p>
          ) : (
            tasks.map((task) => (
              <div key={task._id} className="flex items-center justify-between gap-3 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#071e55]">{task.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {t("assignedBy", { name: task.assignedBy })}
                  </p>
                </div>
                <select
                  value={task.status}
                  onChange={async (event) => {
                    try {
                      await updateStatus({
                        taskId: task._id,
                        status: event.target.value as (typeof STATUS_ORDER)[number],
                      });
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : t("updateFailed"));
                    }
                  }}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[0.68rem] font-bold text-slate-700 outline-none focus:border-blue-400"
                >
                  {STATUS_ORDER.map((value) => (
                    <option key={value} value={value}>
                      {statusLabels(value)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await deleteTask({ taskId: task._id });
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : t("deleteFailed"));
                    }
                  }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  aria-label={t("deleteTask", { title: task.title })}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
