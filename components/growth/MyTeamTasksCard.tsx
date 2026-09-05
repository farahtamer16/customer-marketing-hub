"use client";

import { useMutation, useQuery } from "convex/react";
import { ClipboardList } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";

const STATUS_ORDER = ["Todo", "InProgress", "Completed"] as const;

// Real tasks an admin actually assigned to this person's team — not a
// generic to-do widget. Renders nothing for someone with no team, so it
// never shows an empty shell to an individual contributor.
export default function MyTeamTasksCard() {
  const t = useTranslations("growth.teamTasks");
  const statusLabels = useTranslations("statusValues");
  const tasks = useQuery(api.teamTasks.listMyTeamTasks);
  const updateStatus = useMutation(api.teamTasks.updateTeamTaskStatus);

  if (!tasks || tasks.length === 0) return null;

  return (
    <article className="glass-card rounded-3xl p-6">
      <div className="flex items-center gap-3">
        <ClipboardList size={18} className="text-[#3156dc]" />
        <h2 className="font-semibold text-[#071e55]">{t("myTeamTasksTitle")}</h2>
      </div>
      <div className="mt-5 space-y-3">
        {tasks.map((task) => (
          <div
            key={task._id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white/70 p-4"
          >
            <div>
              <p className="text-sm font-semibold text-[#071e55]">{task.title}</p>
              <p className="mt-1 text-xs text-slate-400">
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
          </div>
        ))}
      </div>
    </article>
  );
}
