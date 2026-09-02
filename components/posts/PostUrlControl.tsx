"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import {
  BarChart3,
  ExternalLink,
  Link2,
  Loader2,
  MessagesSquare,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { FormMessage } from "@/components/ui/FormMessage";
import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
} from "@/components/ui/ChannelIcons";

type Post = Doc<"posts">;

const POST_URL_GRACE_PERIOD_MS = 2 * 60 * 1000;

const platformHosts: Partial<Record<Post["platform"], string[]>> = {
  Facebook: ["facebook.com", "fb.watch"],
  Instagram: ["instagram.com"],
  LinkedIn: ["linkedin.com"],
  TikTok: ["tiktok.com"],
  X: ["x.com", "twitter.com"],
};

function validatePostUrl(value: string, platform: Post["platform"]) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "Enter a valid HTTP or HTTPS URL.";
    }

    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    const allowedHosts = platformHosts[platform] ?? [];
    const matchesPlatform = allowedHosts.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );

    if (!matchesPlatform) {
      return `Enter a ${platform} post URL.`;
    }
  } catch {
    return "Enter a valid post URL.";
  }
}

export default function PostUrlControl({ post }: { post: Post }) {
  const setPostUrl = useMutation(api.posts.setPostUrl);
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const urlFallbackAt =
    (post.publishedAt ?? post.updatedAt) + POST_URL_GRACE_PERIOD_MS;

  useEffect(() => {
    if (post.postUrl || post.status !== "Published" || now >= urlFallbackAt) {
      return;
    }
    const timeout = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(0, urlFallbackAt - now),
    );
    return () => window.clearTimeout(timeout);
  }, [now, post.postUrl, post.status, urlFallbackAt]);

  if (post.postUrl) {
    return (
      <a
        href={post.postUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-[#2854dc] hover:text-[#173b9a]"
      >
        View post
        <ExternalLink size={13} />
      </a>
    );
  }

  if (post.status !== "Published") {
    return <span className="text-sm text-slate-400">Not available yet</span>;
  }

  if (now < urlFallbackAt) {
    return (
      <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-500">
        <Loader2 size={14} className="animate-spin text-[#486bf5]" />
        Preparing link...
      </span>
    );
  }

  const close = () => {
    setIsOpen(false);
    setValue("");
    setError("");
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const postUrl = value.trim();
    const validationError = validatePostUrl(postUrl, post.platform);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await setPostUrl({ postId: post._id, postUrl });
      toast.success("Post URL saved.");
      close();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save URL.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 text-sm font-semibold text-[#2854dc] shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
      >
        <Link2
          size={14}
          className="transition-transform group-hover:rotate-[-8deg]"
        />
        Add URL
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-[#06143d]/55 p-4 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <form
            onSubmit={save}
            className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_28px_90px_rgba(7,30,85,0.32)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="post-url-title"
          >
            <div className="relative overflow-hidden bg-gradient-to-br from-[#102f7e] via-[#3156dc] to-[#7186ff] px-7 pb-7 pt-6 text-white sm:px-8">
              <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/15 shadow-[0_0_0_38px_rgba(255,255,255,0.05),0_0_0_76px_rgba(189,249,229,0.05)]" />
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="absolute right-5 top-5 z-10 rounded-full bg-white/10 p-2 text-white/75 backdrop-blur transition hover:bg-white/20 hover:text-white"
              >
                <X size={18} />
              </button>

              <div className="relative z-10 flex items-start gap-4 pr-10">
                <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-white/15 text-[#c4ffe6] shadow-inner ring-1 ring-white/20 backdrop-blur">
                  <PlatformIcon platform={post.platform} />
                </span>
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.19em] text-[#c4ffe6]">
                    Complete post setup
                  </p>
                  <h2
                    id="post-url-title"
                    className="mt-1 text-2xl font-semibold tracking-[-0.035em]"
                  >
                    Connect your {post.platform} post
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-blue-100">
                    Paste the live post link so Spiders AI can connect insights
                    and conversations to this content.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-b from-white to-[#f6f8ff] px-7 py-7 sm:px-8">
              <div className="mb-6 grid grid-cols-2 gap-3">
                <Benefit
                  icon={<BarChart3 size={16} />}
                  title="Analytics ready"
                  description="Track post performance"
                />
                <Benefit
                  icon={<MessagesSquare size={16} />}
                  title="Classification ready"
                  description="Organize conversations"
                />
              </div>

              <label
                htmlFor={`post-url-${post._id}`}
                className="text-sm font-semibold text-[#17264d]"
              >
                Live post URL
              </label>
              <div className="relative mt-2.5">
                <Link2
                  size={17}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#5871d9]"
                />
                <input
                  id={`post-url-${post._id}`}
                  type="url"
                  value={value}
                  onChange={(event) => {
                    setValue(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder={
                    post.platform === "Instagram"
                      ? "https://www.instagram.com/p/..."
                      : post.platform === "Facebook"
                        ? "https://www.facebook.com/..."
                        : "https://..."
                  }
                  autoFocus
                  aria-invalid={Boolean(error)}
                  className="w-full rounded-2xl border border-[#dce3f6] bg-white py-3.5 pl-11 pr-4 text-sm text-[#17264d] shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#6d84ef] focus:ring-4 focus:ring-[#6d84ef]/15"
                />
              </div>
              <FormMessage type="error" message={error} />

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={close}
                  disabled={isSaving}
                  className="rounded-xl px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-white hover:shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !value.trim()}
                  className="inline-flex min-w-36 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#173b9a] to-[#486bf5] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-45 disabled:shadow-none"
                >
                  {isSaving && <Loader2 size={15} className="animate-spin" />}
                  {isSaving ? "Connecting..." : "Connect post"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function PlatformIcon({ platform }: { platform: Post["platform"] }) {
  const className = "h-6 w-6";
  if (platform === "Instagram") return <InstagramIcon className={className} />;
  if (platform === "Facebook") return <FacebookIcon className={className} />;
  if (platform === "X") return <TwitterIcon className={className} />;
  return <Link2 className={className} />;
}

function Benefit({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#edf1ff] text-[#3556d9]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-bold text-[#17264d]">{title}</span>
        <span className="mt-0.5 block truncate text-[0.68rem] text-slate-500">
          {description}
        </span>
      </span>
    </div>
  );
}
