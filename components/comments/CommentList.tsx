"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Loader2, MessageCircleMore, Plus } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/hub/PageHeader";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import CommentTable from "./CommentTable";
import { useTranslations } from "next-intl";

type Comment = Doc<"comments">;
const EMPTY_TASKS: Doc<"followUpTasks">[] = [];

export default function CommentList({
  comments,
  posts,
  embedded = false,
  useAdminDelete = false,
}: {
  comments: Doc<"comments">[];
  posts: Doc<"posts">[];
  embedded?: boolean;
  // True when these comments belong to someone else's post (viewed via
  // Content Studio / another teammate's post detail page) — deleteComment
  // is owner-only and would reject the viewer, so deleteCommentAdmin
  // (gated by manageTeam instead of ownership) is used in that case.
  useAdminDelete?: boolean;
}) {
  const t = useTranslations("comments");
  const user = useQuery(api.users.current);
  const tasks = useQuery(
    api.followUpTasks.getTasksForUser,
    user ? {} : "skip",
  );
  const createTask = useMutation(api.followUpTasks.createFollowUpTask);
  const deleteComment = useMutation(api.comments.deleteComment);
  const deleteCommentAdmin = useMutation(api.comments.deleteCommentAdmin);
  const [pendingId, setPendingId] = useState<Id<"comments"> | null>(null);

  const handleConvert = useCallback(
    async (comment: Comment) => {
      if (!user) {
        toast.error(t("accountLoading"));
        return;
      }
      setPendingId(comment._id);
      try {
        await createTask({
          commentId: comment._id,
          title: `${t("convert")}: ${comment.authorName}`,
        });
        toast.success(t("taskCreated"));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("taskFailed"));
      } finally {
        setPendingId(null);
      }
    },
    [createTask, t, user],
  );

  const handleDelete = useCallback(
    async (commentId: Id<"comments">) => {
      try {
        if (useAdminDelete) {
          await deleteCommentAdmin({ commentId });
        } else {
          await deleteComment({ commentId });
        }
        toast.success(t("deleted"));
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t("deleteFailed"));
      }
    },
    [deleteComment, deleteCommentAdmin, useAdminDelete, t],
  );

  return (
    <>
      {!embedded && (
        <PageHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
          action={
            <Link
              href="/comments/post"
              className="inline-flex items-center gap-2 rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white"
            >
              <Plus size={16} />
              {t("newComment")}
            </Link>
          }
        />
      )}
      {user === undefined || (user && tasks === undefined) ? (
        <div className="glass-card flex min-h-64 items-center justify-center rounded-3xl text-sm text-slate-500">
          <Loader2 size={18} className="mr-2 animate-spin" />
          {t("loading")}
        </div>
      ) : !comments.length ? (
        <div className="glass-card flex min-h-64 flex-col items-center justify-center rounded-3xl px-6 text-center">
          <MessageCircleMore className="text-[#3556d9]" />
          <h2 className="mt-4 font-semibold text-[#071e55]">
            {t("emptyTitle")}
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-500">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <section className="glass-card overflow-hidden rounded-3xl">
          <CommentTable
            comments={comments}
            posts={posts}
            tasks={tasks ?? EMPTY_TASKS}
            pendingId={pendingId}
            onConvert={handleConvert}
            onDelete={handleDelete}
          />
        </section>
      )}
    </>
  );
}
