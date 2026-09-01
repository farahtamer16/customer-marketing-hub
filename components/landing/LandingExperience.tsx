"use client";

import { useEffect } from "react";
import { useMutation } from "convex/react";
import { CheckCircle2, Sparkles } from "lucide-react";
import BrandMark from "@/components/hub/BrandMark";
import SignalMap from "./SignalMap";
import WorkflowRail from "./WorkflowRail";
import SessionActions from "./SessionActions";
import LeadCaptureForm from "./LeadCaptureForm";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { api } from "@/convex/_generated/api";
import { getVisitorId } from "@/hooks/useVisitorId";
import { useTranslations } from "next-intl";

export default function LandingExperience({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("landing");
  const recordVisit = useMutation(api.consumerJourney.recordVisit);

  useEffect(() => {
    if (signedIn) return; // already converted — nothing to track
    recordVisit({ visitorId: getVisitorId() }).catch(() => {});
    // Only on mount: this fires once per page load, which is the real
    // "a visitor arrived" event — not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="landing-shell soft-grid min-h-screen overflow-hidden">
      <nav className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-10 lg:px-16">
        <div className="landing-brand-mobile">
          <BrandMark href="/" />
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher compact />
          <SessionActions signedIn={signedIn} placement="nav" />
        </div>
      </nav>

      <section className="relative mx-auto grid min-h-[calc(100vh-5.8rem)] max-w-7xl items-center gap-10 px-5 pb-20 pt-8 sm:px-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-16 lg:pb-24 lg:pt-4">
        <div className="relative z-10">
          <div className="landing-kicker">
            <Sparkles size={14} />
            {t("kicker")}
          </div>
          <h1 className="landing-title">
            {t("title")}
            <span>{t("titleAccent")}</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            {t("description")}
          </p>
          <SessionActions signedIn={signedIn} placement="hero" />
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-slate-500">
            <span className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-500" />
              {t("bilingual")}
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-500" />
              {t("mockAnalytics")}
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-emerald-500" />
              {t("leadFlow")}
            </span>
          </div>
          {!signedIn && <LeadCaptureForm />}
        </div>

        <div className="relative z-10 lg:scale-[1.03]">
          <SignalMap />
        </div>
        <div className="landing-glow landing-glow-mint" />
        <div className="landing-glow landing-glow-blue" />
      </section>

      <WorkflowRail />
      <footer className="border-t border-white/70 bg-white/35 px-5 py-6 backdrop-blur-xl sm:px-10 lg:px-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>Spiders AI · Social Media Marketing Hub MVP</span>
          <span>{t("tagline")}</span>
        </div>
      </footer>
    </main>
  );
}
