"use client";

import {
  CheckCircle2,
  Loader2,
  MessageCircleMore,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { usePostComments } from "@/hooks/usePostComments";
import { useTranslations } from "next-intl";

export function PostComments({
  postId,
  userId,
  isOwnPost,
}: {
  postId: Id<"posts">;
  userId: string;
  isOwnPost: boolean;
}) {
  const t = useTranslations("analytics");
  const { comments, loading, classifying, error, fetchComments } =
    usePostComments(postId, userId);
  const busy = loading || classifying;
  const busyLabel = classifying
    ? t("classifyingComments")
    : t("fetchingComments");

  return (
    <section className="mt-8 border-t border-slate-200 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-[#3556d9]" />
          <div>
            <h2 className="text-xl font-semibold text-[#071e55]">
              {t("commentsTitle")}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {t("fetchCommentsHint")}
            </p>
          </div>
        </div>

        {isOwnPost && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fetchComments(false)}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#173b9a] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#102f7e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <MessageCircleMore size={16} />
              )}
              {busy ? busyLabel : t("fetchComments")}
            </button>
            {comments.length > 0 && (
              <button
                type="button"
                onClick={() => fetchComments(true)}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
              >
                <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
                {t("refreshComments")}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {busy && (
        <div
          className="mt-4 flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-700"
          aria-live="polite"
        >
          <Loader2 size={16} className="animate-spin" />
          {busyLabel}
        </div>
      )}

      {comments.length > 0 && !busy && !error && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 size={16} />
          {t("commentsReady", { count: comments.length })}
        </div>
      )}
    </section>
  );
}
