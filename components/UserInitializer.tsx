"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import { peekVisitorId } from "@/hooks/useVisitorId";

export default function UserInitializer() {
  const { isSignedIn, isLoaded } = useAuth();

  const getOrCreateUser = useMutation(api.users.getOrCreate);
  const ensureCurrentMember = useMutation(api.team.ensureCurrentMember);
  const seedDemoWorkspace = useMutation(api.seed.seedDemoWorkspace);
  const linkSignup = useMutation(api.consumerJourney.linkSignup);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

    getOrCreateUser().catch((error) => {
      console.error("Failed to initialize user:", error);
    });
    ensureCurrentMember().catch((error) => {
      console.error("Failed to initialize team member:", error);
    });
    seedDemoWorkspace().catch((error) => {
      console.error("Failed to seed demo workspace:", error);
    });
    // Links this session back to whatever anonymous landing-page visitor
    // it came from — only if this browser actually has one. Skipped
    // entirely (not just a no-op) for someone who never touched the
    // tracked landing page, e.g. an invited teammate signing in directly,
    // so they don't show up as a phantom "signed up" funnel entry.
    const visitorId = peekVisitorId();
    if (visitorId) {
      linkSignup({ visitorId }).catch(() => {});
    }
  }, [isLoaded, isSignedIn, getOrCreateUser, ensureCurrentMember, seedDemoWorkspace, linkSignup]);

  return null;
}
