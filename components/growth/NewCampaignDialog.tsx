"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Megaphone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { signalSources } from "@/lib/growth-data";
import type { CampaignImpact, GrowthAccount, SignalSource } from "@/types/growth";
import { StagePill } from "./GrowthPrimitives";

const EMPTY_ACCOUNTS: GrowthAccount[] = [];
const EMPTY_POSTS: Doc<"posts">[] = [];

export default function NewCampaignDialog({
  open,
  onClose,
  campaign,
}: {
  open: boolean;
  onClose: () => void;
  // Present = editing this campaign (relink accounts, tweak spend/name).
  // Absent = creating a new one.
  campaign?: CampaignImpact;
}) {
  const t = useTranslations("growth");
  const editMode = Boolean(campaign);
  const createCampaign = useMutation(api.campaigns.createCampaign);
  const updateCampaign = useMutation(api.campaigns.updateCampaign);
  const growthAccounts = (useQuery(api.growth.listAccounts, {}) ??
    EMPTY_ACCOUNTS) as GrowthAccount[];
  const publishedPosts = useQuery(api.posts.listPublished) ?? EMPTY_POSTS;
  const teams = useQuery(api.teams.listTeamNames) ?? [];
  const [name, setName] = useState(campaign?.name ?? "");
  const [channel, setChannel] = useState<SignalSource>(campaign?.channel ?? "social");
  const [spend, setSpend] = useState(campaign ? String(campaign.spend) : "");
  const [teamId, setTeamId] = useState(campaign?.teamId ?? "");
  const [accountIds, setAccountIds] = useState<string[]>(campaign?.accountIds ?? []);
  const [postIds, setPostIds] = useState<string[]>(campaign?.postIds ?? []);
  const [submitting, setSubmitting] = useState(false);
  const valid = name.trim().length >= 2;

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const toggleAccount = (id: string) => {
    setAccountIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const togglePost = (id: string) => {
    setPostIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      if (editMode && campaign) {
        await updateCampaign({
          campaignId: campaign.id as Id<"campaigns">,
          name: name.trim(),
          channel,
          spend: Number(spend) || 0,
          teamId: teamId ? (teamId as Id<"teams">) : undefined,
          accountIds: accountIds as Id<"growthAccounts">[],
          postIds: postIds as Id<"posts">[],
        });
      } else {
        await createCampaign({
          name: name.trim(),
          channel,
          spend: Number(spend) || 0,
          teamId: teamId ? (teamId as Id<"teams">) : undefined,
          accountIds: accountIds.length
            ? (accountIds as Id<"growthAccounts">[])
            : undefined,
          postIds: postIds.length ? (postIds as Id<"posts">[]) : undefined,
        });
      }
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : editMode
            ? t("revenue.updateFailed")
            : t("revenue.createFailed"),
      );
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
        aria-labelledby="new-campaign-title"
        className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#3156dc]">
              <Megaphone size={20} />
            </span>
            <div>
              <h2 id="new-campaign-title" className="font-semibold text-[#071e55]">
                {editMode ? t("revenue.editCampaignTitle") : t("revenue.newCampaignTitle")}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {editMode
                  ? t("revenue.editCampaignDescription")
                  : t("revenue.newCampaignDescription")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("revenue.cancel")}
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              {t("revenue.name")}
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              {t("revenue.channel")}
              <select
                value={channel}
                onChange={(event) => setChannel(event.target.value as SignalSource)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {signalSources.map((value) => (
                  <option key={value} value={value}>
                    {t(`sources.${value}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-slate-700">
              {t("revenue.spend")}
              <input
                type="number"
                min={0}
                value={spend}
                onChange={(event) => setSpend(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
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
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">
              {t("revenue.linkAccounts")}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {t("revenue.linkAccountsHint")}
            </p>
            {growthAccounts.length === 0 ? (
              <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
                {t("revenue.noAccountsToLink")}
              </p>
            ) : (
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {growthAccounts.map((account) => (
                  <label
                    key={account.id}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={accountIds.includes(account.id)}
                        onChange={() => toggleAccount(account.id)}
                        className="h-4 w-4 accent-[#3156dc]"
                      />
                      <span className="font-medium text-slate-700">{account.name}</span>
                    </span>
                    <StagePill stage={account.stage} />
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">
              {t("revenue.linkPosts")}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {t("revenue.linkPostsHint")}
            </p>
            {publishedPosts.length === 0 ? (
              <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
                {t("revenue.noPostsToLink")}
              </p>
            ) : (
              <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {publishedPosts.map((post) => (
                  <label
                    key={post._id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={postIds.includes(post._id)}
                      onChange={() => togglePost(post._id)}
                      className="h-4 w-4 flex-none accent-[#3156dc]"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium text-slate-700">
                      {post.content || t("revenue.untitledPost")}
                    </span>
                    <span className="flex-none text-xs text-slate-400">{post.platform}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              {t("revenue.cancel")}
            </button>
            <button
              type="submit"
              disabled={!valid || submitting}
              className="rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {editMode ? t("revenue.saveChanges") : t("revenue.create")}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
