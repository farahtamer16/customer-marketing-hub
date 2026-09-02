"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { classifyComments } from "@/lib/api";

const COMMENT_CLASSIFICATIONS = [
  "Lead",
  "Question",
  "Complaint",
  "Feedback",
  "Engagement",
  "Other",
] as const;

type CommentClassification = (typeof COMMENT_CLASSIFICATIONS)[number];

type FetchedPostComment = {
  authorName: string;
  content: string;
  classification: CommentClassification;
  createdAt: number;
  platform?: "facebook" | "instagram";
};

type RawComment = {
  authorName?: string;
  author?: string;
  username?: string;
  content?: string;
  text?: string;
  message?: string;
  createdAt?: number | string;
  scrapedAt?: number | string;
  platform?: string;
};

type CommentsResponse = {
  success?: boolean;
  error?: string;
  comments?: unknown;
  data?: unknown;
  result?: unknown;
};

const getRawComments = (value: unknown): RawComment[] => {
  if (Array.isArray(value)) return value as RawComment[];
  if (!value || typeof value !== "object") return [];
  const record = value as CommentsResponse;
  return getRawComments(record.comments ?? record.data ?? record.result);
};

const asTimestamp = (value: number | string | undefined) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
};

const asClassification = (value: string): CommentClassification =>
  COMMENT_CLASSIFICATIONS.find((category) => category === value) ?? "Other";

const normalizeComment = (
  comment: RawComment,
  classification: string,
  fallbackPlatform?: string,
): FetchedPostComment => {
  const content = comment.content ?? comment.text ?? comment.message ?? "";
  const platform = (comment.platform ?? fallbackPlatform)?.toLowerCase();

  return {
    authorName:
      comment.authorName ?? comment.author ?? comment.username ?? "Unknown",
    content,
    classification: asClassification(classification),
    createdAt: asTimestamp(comment.createdAt ?? comment.scrapedAt),
    platform:
      platform === "facebook" || platform === "instagram"
        ? platform
        : undefined,
  };
};

export function usePostComments(postId: Id<"posts">, userId: string) {
  const post = useQuery(api.posts.getPost, { postId });
  const storedComments = useQuery(api.comments.getCommentsForPost, { postId });
  const storeComments = useMutation(api.comments.storeComments);
  const fetchPostComments = useAction(api.meta.fetchPostComments);
  const [comments, setComments] = useState<FetchedPostComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `refresh` is accepted for backwards-compatible call sites; the Graph
  // API action always fetches live data, so there's no cache to bypass.
  const fetchComments = async (_refresh = false) => {
    if (!postId || !userId) return;
    setLoading(true);
    setError(null);

    try {
      const result = (await fetchPostComments({ postId })) as CommentsResponse;
      if (result.success === false) {
        throw new Error(result.error || "Failed to fetch comments");
      }

      const rawComments = getRawComments(result);
      const usableComments = rawComments.filter((comment) =>
        (comment.content ?? comment.text ?? comment.message ?? "").trim(),
      );
      setClassifying(true);
      const classifications = await classifyComments(
        usableComments.map(
          (comment) => comment.content ?? comment.text ?? comment.message ?? "",
        ),
      );
      const classifiedComments = usableComments.map((comment, index) =>
        normalizeComment(
          comment,
          classifications[index] ?? "Other",
          post?.platform,
        ),
      );
      setComments(classifiedComments);

      const knownComments = new Set(
        (storedComments ?? []).map(
          (comment) =>
            `${comment.platform}:${comment.authorName}:${comment.content}`,
        ),
      );
      const newComments = classifiedComments.filter(
        (
          comment,
        ): comment is FetchedPostComment & {
          platform: "facebook" | "instagram";
        } => {
          if (!comment.platform) return false;
          const signature = `${comment.platform}:${comment.authorName}:${comment.content}`;
          if (knownComments.has(signature)) return false;
          knownComments.add(signature);
          return true;
        },
      );

      if (newComments.length > 0) {
        await storeComments({
          comments: newComments.map((comment) => ({
            postId,
            authorName: comment.authorName,
            content: comment.content,
            platform: comment.platform,
            classification: comment.classification,
            scrapedAt: comment.createdAt,
          })),
        });
      }
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to fetch comments",
      );
    } finally {
      setLoading(false);
      setClassifying(false);
    }
  };

  return { comments, loading, classifying, error, fetchComments };
}
