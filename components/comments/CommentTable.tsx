"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Trash2, UserCheck } from "lucide-react";
import { createColumnHelper } from "@tanstack/react-table";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import StatusPill from "@/components/hub/StatusPill";
import DataTable, { dataTableFeatures } from "@/components/ui/DataTable";
import TableToolbar from "@/components/ui/TableToolbar";
import ConvertToTaskButton from "./ConvertToTaskButton";
import SuggestedPriorityBadge, {
  getSuggestedPriority,
  suggestedPriorities,
} from "./SuggestedPriority";
import { FacebookIcon, InstagramIcon } from "@/components/ui/ChannelIcons";
import { useFormatter, useTranslations } from "next-intl";

type Comment = Doc<"comments">;
type Post = Doc<"posts">;
const column = createColumnHelper<typeof dataTableFeatures, Comment>();
const categories = [
  "Lead",
  "Question",
  "Complaint",
  "Feedback",
  "Engagement",
  "Other",
] as const;

interface CommentTableProps {
  comments: Comment[];
  posts: Post[];
  tasks: Doc<"followUpTasks">[];
  pendingId: Id<"comments"> | null;
  onConvert: (comment: Comment) => void;
  onDelete: (commentId: Id<"comments">) => void;
}

export default function CommentTable({
  comments,
  posts,
  tasks,
  pendingId,
  onConvert,
  onDelete,
}: CommentTableProps) {
  const t = useTranslations("comments");
  const common = useTranslations("common");
  const categoryT = useTranslations("statusValues");
  const formatter = useFormatter();
  const [search, setSearch] = useState("");
  const [classification, setClassification] = useState("");
  const [platform, setPlatform] = useState("");
  const [priority, setPriority] = useState("");
  const postsById = useMemo(
    () => new Map(posts.map((post) => [post._id, post])),
    [posts],
  );
  const postsByUrl = useMemo(
    () =>
      new Map(
        posts
          .filter((post) => post.postUrl)
          .map((post) => [post.postUrl as string, post]),
      ),
    [posts],
  );
  const columns = useMemo(
    () =>
      column.columns([
        column.display({
          id: "sourcePost",
          header: t("sourcePost"),
          cell: ({ row }) => {
            const comment = row.original;
            const post = comment.postId
              ? postsById.get(comment.postId)
              : postsByUrl.get(comment.targetUrl);
            return <PostContext comment={comment} post={post} />;
          },
        }),
        column.accessor("authorName", {
          header: t("author"),
          cell: ({ row }) => (
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#c4ffe6] to-[#7590ff] text-xs font-bold text-[#09276b]">
                {initials(row.original.authorName)}
              </span>
              <div className="min-w-0">
                <span className="block font-semibold text-[#071e55]">
                  {row.original.authorName}
                </span>
                {row.original.matchedAccountId && (
                  <Link
                    href={`/growth/accounts/${row.original.matchedAccountId}`}
                    className="mt-0.5 inline-flex items-center gap-1 text-[0.65rem] font-bold text-emerald-700"
                  >
                    <UserCheck size={11} />
                    {t("knownAccount", { name: row.original.matchedAccountName ?? "" })}
                  </Link>
                )}
              </div>
            </div>
          ),
        }),
        column.accessor("content", {
          header: t("comment"),
          cell: ({ getValue }) => (
            <p
              className="max-w-md truncate text-sm text-slate-600"
              title={getValue()}
            >
              {getValue()}
            </p>
          ),
        }),
        column.accessor("classification", {
          header: t("classification"),
          cell: ({ getValue }) => <StatusPill value={getValue()} />,
        }),
        column.display({
          id: "suggestedPriority",
          header: t("suggestedPriority"),
          cell: ({ row }) => (
            <SuggestedPriorityBadge
              classification={row.original.classification}
            />
          ),
        }),
        column.accessor("status", {
          header: common("status"),
          cell: ({ getValue }) => (
            <StatusPill value={getValue() ?? "Published"} />
          ),
        }),
        column.accessor("createdAt", {
          header: common("created"),
          cell: ({ getValue }) => (
            <span className="whitespace-nowrap text-sm text-slate-500">
              {formatter.dateTime(getValue(), {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          ),
        }),
        column.display({
          id: "actions",
          header: common("actions"),
          cell: ({ row }) => (
            <CommentActions
              comment={row.original}
              converted={tasks.some(
                (task) => task.commentId === row.original._id,
              )}
              converting={pendingId === row.original._id}
              onConvert={() => onConvert(row.original)}
              onDelete={() => onDelete(row.original._id)}
            />
          ),
        }),
      ]),
    [
      common,
      formatter,
      onConvert,
      onDelete,
      pendingId,
      postsById,
      postsByUrl,
      t,
      tasks,
    ],
  );
  const filteredComments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return comments.filter(
      (comment) =>
        (!query ||
          comment.content.toLocaleLowerCase().includes(query) ||
          comment.authorName.toLocaleLowerCase().includes(query)) &&
        (!classification || comment.classification === classification) &&
        (!platform || comment.platform === platform) &&
        (!priority ||
          getSuggestedPriority(comment.classification) === priority),
    );
  }, [classification, comments, platform, priority, search]);

  return (
    <>
      <TableToolbar
        title={t("postComments")}
        countLabel={t("results", {
          count: filteredComments.length,
          total: comments.length,
        })}
        search={search}
        searchPlaceholder={t("searchPlaceholder")}
        clearLabel={t("clearFilters")}
        onSearchChange={setSearch}
        onClear={() => {
          setSearch("");
          setClassification("");
          setPlatform("");
          setPriority("");
        }}
        filters={[
          {
            label: t("classification"),
            value: classification,
            allLabel: t("allCategories"),
            options: categories.map((category) => ({
              value: category,
              label: categoryT(category),
            })),
            onChange: setClassification,
          },
          {
            label: t("channel"),
            value: platform,
            allLabel: t("allChannels"),
            options: [
              { value: "facebook", label: "Facebook" },
              { value: "instagram", label: "Instagram" },
            ],
            onChange: setPlatform,
          },
          {
            label: t("suggestedPriority"),
            value: priority,
            allLabel: t("allPriorities"),
            options: suggestedPriorities.map((value) => ({
              value,
              label: t(`priority${value}`),
            })),
            onChange: setPriority,
          },
        ]}
      />
      <DataTable
        columns={columns}
        data={filteredComments}
        emptyMessage={t("emptyTitle")}
        initialSorting={[{ id: "createdAt", desc: true }]}
        getRowId={(comment) => comment._id}
      />
    </>
  );
}

function PostContext({ comment, post }: { comment: Comment; post?: Post }) {
  const t = useTranslations("comments");
  const platform =
    post?.platform ??
    (comment.platform === "instagram" ? "Instagram" : "Facebook");
  const PlatformIcon = platform === "Instagram" ? InstagramIcon : FacebookIcon;
  const postId = post?._id ?? comment.postId;

  return (
    <div className="max-w-56 text-start">
      <p
        className="mb-1 truncate font-mono text-[0.62rem] text-slate-400"
        title={postId}
      >
        {postId ? t("postId", { id: postId }) : t("postNotLinked")}
      </p>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3556d9]">
        <PlatformIcon className="h-3.5 w-3.5 flex-none" />
        {platform}
      </div>
      <p className="mt-1 truncate text-xs text-slate-500" title={post?.content}>
        {post?.content ?? t("postContentUnavailable")}
      </p>
    </div>
  );
}

function CommentActions({
  comment,
  converted,
  converting,
  onConvert,
  onDelete,
}: {
  comment: Comment;
  converted: boolean;
  converting: boolean;
  onConvert: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("comments");
  return (
    <div className="flex items-center justify-end gap-2">
      {comment.targetUrl && (
        <a
          href={comment.targetUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={t("viewSource")}
          className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-[#2854dc]"
        >
          <ExternalLink size={15} />
        </a>
      )}
      <button
        type="button"
        onClick={onDelete}
        aria-label={t("deleteComment")}
        className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
      >
        <Trash2 size={15} />
      </button>
      <ConvertToTaskButton
        converted={converted}
        loading={converting}
        onConvert={onConvert}
      />
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}
