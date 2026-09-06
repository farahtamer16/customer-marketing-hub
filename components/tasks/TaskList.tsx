"use client";

import {
  CheckCircle2,
  Circle,
  Clock3,
  ListChecks,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import PageHeader from "@/components/hub/PageHeader";
import LoadingState from "@/components/ui/LoadingState";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import AutoReplySettings from "./AutoReplySettings";
import TaskItem from "./TaskItem";
import { useTranslations } from "next-intl";

export type TaskStatus = "Todo" | "InProgress" | "Completed";

export default function TaskList() {
  const t = useTranslations("tasks");
  const columns = [
    { status: "Todo" as const, title: t("todo"), icon: Circle },
    { status: "InProgress" as const, title: t("inProgress"), icon: Clock3 },
    { status: "Completed" as const, title: t("completed"), icon: CheckCircle2 },
  ];
  const user = useQuery(api.users.current);
  const tasks = useQuery(
    api.followUpTasks.getTasksForUser,
    user ? {} : "skip",
  );
  const updateTaskStatus = useMutation(api.followUpTasks.updateTaskStatus);

  async function changeStatus(taskId: Id<"followUpTasks">, status: TaskStatus) {
    await updateTaskStatus({ taskId, status });
  }

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <AutoReplySettings />

      {user === undefined || (user && tasks === undefined) ? (
        <LoadingState label={t("loading")} />
      ) : !user ? (
        <EmptyState
          title={t("unavailableTitle")}
          description={t("unavailableDescription")}
        />
      ) : !tasks?.length ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <section className="grid gap-5 lg:grid-cols-3">
          {columns.map(({ status, title, icon: Icon }) => {
            const items = tasks.filter((task) => task.status === status);
            return (
              <div
                key={status}
                className="rounded-3xl border border-white/80 bg-white/45 p-4 backdrop-blur-xl"
              >
                <header className="flex items-center justify-between px-1 py-2">
                  <div className="flex items-center gap-2">
                    <Icon size={17} className="text-[#3556d9]" />
                    <h2 className="text-sm font-semibold">{title}</h2>
                  </div>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-xs font-bold text-slate-500">
                    {items.length}
                  </span>
                </header>
                <div className="mt-3 space-y-3">
                  {items.length ? (
                    items.map((task) => (
                      <TaskItem
                        key={task._id}
                        task={task}
                        onStatusChange={changeStatus}
                      />
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-blue-100 px-4 py-8 text-center text-xs text-slate-400">
                      {t("emptyStage")}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="glass-card flex min-h-64 flex-col items-center justify-center rounded-3xl px-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#3556d9]">
        <ListChecks size={22} />
      </span>
      <h2 className="mt-4 font-semibold text-[#071e55]">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

export type FollowUpTask = Doc<"followUpTasks">;
