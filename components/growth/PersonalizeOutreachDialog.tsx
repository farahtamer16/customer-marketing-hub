"use client";

import { useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { CheckCircle2, Copy, Send, Wand2, X } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { GrowthAccount } from "@/types/growth";

export default function PersonalizeOutreachDialog({
  open,
  onClose,
  account,
}: {
  open: boolean;
  onClose: () => void;
  account: GrowthAccount;
}) {
  const t = useTranslations("growth");
  const format = useFormatter();
  const sendOutreachEmail = useAction(api.outreach.sendOutreachEmail);
  const sentHistory = useQuery(api.outreach.listForAccount, { accountId: account.id as Id<"growthAccounts"> });
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const recipients = account.members.filter(
    (member) => member.status !== "missing" && member.email,
  );
  const [recipientId, setRecipientId] = useState(recipients[0]?.id ?? "");

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const activeMembers = account.members.filter(
        (member) => member.status !== "missing",
      );
      const recentSignalKinds = account.signals
        .slice()
        .sort((a, b) => b.occurredAt - a.occurredAt)
        .slice(0, 5)
        .map((signal) => signal.kind);

      const response = await fetch("/api/ai/account-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: account.name,
          industry: account.industry,
          tier: account.tier,
          stage: account.stage,
          nextAction: account.nextAction,
          intentScore: account.intentScore,
          engagementScore: account.engagementScore,
          adoptionScore: account.adoptionScore,
          members: activeMembers.map((member) => ({
            title: member.title,
            role: member.role,
          })),
          recentSignalKinds,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || t("outreach.failed"));
      }
      setSubject(data.subject);
      setBody(data.body);
      setSentTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("outreach.failed"));
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      toast.success(t("outreach.copied"));
    } catch {
      toast.error(t("outreach.copyFailed"));
    }
  };

  const send = async () => {
    if (!recipientId) return;
    setSending(true);
    try {
      await sendOutreachEmail({
        accountId: account.id as Id<"growthAccounts">,
        memberId: recipientId,
        subject,
        body,
      });
      const recipient = recipients.find((member) => member.id === recipientId);
      setSentTo(recipient?.email ?? null);
      toast.success(t("outreach.sent"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("outreach.sendFailed"));
    } finally {
      setSending(false);
    }
  };

  const hasContent = Boolean(body);

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
        aria-labelledby="outreach-title"
        className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#3156dc]">
              <Wand2 size={20} />
            </span>
            <div>
              <h2 id="outreach-title" className="font-semibold text-[#071e55]">
                {t("outreach.title")}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t("outreach.description", { name: account.name })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("outreach.close")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </p>
          )}

          {hasContent && (
            <>
              <label className="block text-sm font-semibold text-slate-700">
                {t("outreach.subjectLabel")}
                <input
                  value={subject}
                  onChange={(event) => {
                    setSubject(event.target.value);
                    setSentTo(null);
                  }}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                {t("outreach.bodyLabel")}
                <textarea
                  value={body}
                  onChange={(event) => {
                    setBody(event.target.value);
                    setSentTo(null);
                  }}
                  rows={8}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>

              {recipients.length > 0 ? (
                <label className="block text-sm font-semibold text-slate-700">
                  {t("outreach.recipientLabel")}
                  <select
                    value={recipientId}
                    onChange={(event) => {
                      setRecipientId(event.target.value);
                      setSentTo(null);
                    }}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  >
                    {recipients.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  {t("outreach.noRecipients")}
                </p>
              )}

              {sentTo && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <CheckCircle2 size={14} />
                  {t("outreach.sentTo", { email: sentTo })}
                </p>
              )}

              <p className="text-xs text-slate-400">{t("outreach.disclaimer")}</p>
            </>
          )}

          {!hasContent && !error && (
            <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              {t("outreach.intro")}
            </p>
          )}

          {sentHistory !== undefined && sentHistory.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs font-semibold text-slate-600">
                {t("outreach.history")}
              </p>
              <div className="mt-2 space-y-1.5">
                {sentHistory.slice(0, 3).map((entry) => (
                  <p key={entry._id} className="text-xs text-slate-500">
                    {t("outreach.historyLine", {
                      email: entry.toEmail,
                      date: format.dateTime(entry.sentAt, { dateStyle: "medium" }),
                    })}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
            {!hasContent ? (
              <button
                type="button"
                onClick={generate}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Wand2 size={14} />
                {loading ? t("outreach.generating") : t("outreach.generate")}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={generate}
                  disabled={loading || sending}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? t("outreach.generating") : t("outreach.regenerate")}
                </button>
                <button
                  type="button"
                  onClick={copy}
                  disabled={loading || sending}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Copy size={14} /> {t("outreach.copy")}
                </button>
                <button
                  type="button"
                  onClick={send}
                  disabled={loading || sending || !recipientId}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send size={14} /> {sending ? t("outreach.sending") : t("outreach.send")}
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
