"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { UserRoundPlus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { BuyingRole, GrowthAccount } from "@/types/growth";

const buyingRoles: BuyingRole[] = [
  "decisionMaker",
  "champion",
  "user",
  "technicalEvaluator",
];

const EMPTY_ACCOUNTS: GrowthAccount[] = [];

export default function NewLeadDialog({
  open,
  onClose,
  defaultAccountId,
}: {
  open: boolean;
  onClose: () => void;
  defaultAccountId?: string;
}) {
  const t = useTranslations("growth");
  const growthAccounts = (useQuery(api.growth.listAccounts, {}) ??
    EMPTY_ACCOUNTS) as GrowthAccount[];
  const addMember = useMutation(api.growth.addMember);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const accountId = selectedAccountId || defaultAccountId || growthAccounts[0]?.id || "";
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState<BuyingRole>("user");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const valid = accountId && name.trim().length >= 2 && title.trim().length >= 2;

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const reset = () => {
    setSelectedAccountId("");
    setName("");
    setTitle("");
    setRole("user");
    setEmail("");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await addMember({
        accountId: accountId as Id<"growthAccounts">,
        member: {
          id: crypto.randomUUID(),
          name: name.trim(),
          title: title.trim(),
          role,
          email: email.trim(),
          status: "active",
        },
      });
      reset();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("leads.createFailed"));
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
        aria-labelledby="new-lead-title"
        className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-[#3156dc]">
              <UserRoundPlus size={20} />
            </span>
            <div>
              <h2 id="new-lead-title" className="font-semibold text-[#071e55]">
                {t("leads.newLeadTitle")}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {t("leads.newLeadDescription")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label={t("leads.cancel")}
          >
            <X size={18} />
          </button>
        </div>
        {growthAccounts.length === 0 ? (
          <div className="p-6">
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t("leads.noAccountsYet")}
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="max-h-[70vh] space-y-4 overflow-y-auto p-6">
            <label className="block text-sm font-semibold text-slate-700">
              {t("leads.selectAccount")}
              <select
                value={accountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {growthAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                {t("leads.name")}
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                {t("leads.personTitle")}
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                />
              </label>
            </div>
            <label className="block text-sm font-semibold text-slate-700">
              {t("leads.role")}
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as BuyingRole)}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              >
                {buyingRoles.map((value) => (
                  <option key={value} value={value}>
                    {t(`roles.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <p className="rounded-xl bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
              {t("leads.scoreComputedNotice")}
            </p>
            <label className="block text-sm font-semibold text-slate-700">
              {t("leads.email")}
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </label>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                {t("leads.cancel")}
              </button>
              <button
                type="submit"
                disabled={!valid || submitting}
                className="rounded-xl bg-[#173b9a] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("leads.create")}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
