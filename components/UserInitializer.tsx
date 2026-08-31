"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";

export default function UserInitializer() {
  const { isSignedIn, isLoaded } = useAuth();

  const getOrCreateUser = useMutation(api.users.getOrCreate);
  const ensureCurrentMember = useMutation(api.team.ensureCurrentMember);
  const seedDemoWorkspace = useMutation(api.seed.seedDemoWorkspace);

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
  }, [isLoaded, isSignedIn, getOrCreateUser, ensureCurrentMember, seedDemoWorkspace]);

  return null;
}
