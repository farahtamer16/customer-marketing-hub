"use client";

import { useState } from "react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { ArrowRight, LogOut, MoveUpRight, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { getVisitorId } from "@/hooks/useVisitorId";

export default function SessionActions({
  signedIn,
  placement,
}: {
  signedIn: boolean;
  placement: "nav" | "hero";
}) {
  const t = useTranslations("landing");
  const { signOut } = useClerk();
  const recordEngagement = useMutation(api.consumerJourney.recordEngagement);
  const [leaving, setLeaving] = useState<"sign-in" | "sign-up" | null>(null);

  function trackEngagement() {
    if (!signedIn) recordEngagement({ visitorId: getVisitorId() }).catch(() => {});
  }

  async function leaveSession(destination: "sign-in" | "sign-up") {
    setLeaving(destination);
    await signOut({ redirectUrl: `/${destination}` });
  }

  if (placement === "nav") {
    if (signedIn) {
      return (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={Boolean(leaving)}
            onClick={() => leaveSession("sign-in")}
            className="landing-nav-secondary inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            <LogOut size={14} />
            {leaving ? t("signingOut") : t("switchAccount")}
          </button>
          <Link href="/home" className="landing-nav-primary">
            {t("dashboard")} <MoveUpRight size={14} />
          </Link>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Link href="/sign-in" className="landing-nav-secondary" onClick={trackEngagement}>
          {t("signIn")}
        </Link>
        <Link href="/sign-up" className="landing-nav-primary" onClick={trackEngagement}>
          {t("signUp")} <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  if (signedIn) {
    return (
      <div className="mt-9">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/home" className="landing-hero-primary">
            {t("openDashboard")} <MoveUpRight size={17} />
          </Link>
          <button
            type="button"
            disabled={Boolean(leaving)}
            onClick={() => leaveSession("sign-in")}
            className="landing-hero-secondary inline-flex items-center gap-2 disabled:opacity-60"
          >
            <LogOut size={16} />
            {leaving === "sign-in" ? t("signingOut") : t("testSignIn")}
          </button>
        </div>
        <button
          type="button"
          disabled={Boolean(leaving)}
          onClick={() => leaveSession("sign-up")}
          className="landing-dashboard-link mt-2"
        >
          <UserPlus size={16} />
          {leaving === "sign-up" ? t("signingOut") : t("anotherAccount")}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-9 flex flex-wrap items-center gap-3">
      <Link href="/sign-up" className="landing-hero-primary" onClick={trackEngagement}>
        {t("signUp")} <ArrowRight size={17} />
      </Link>
      <Link href="/sign-in" className="landing-hero-secondary" onClick={trackEngagement}>
        {t("signIn")}
      </Link>
    </div>
  );
}
