"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ActionKind = "post" | "schedule";

export function useComposerWorkflow() {
  const router = useRouter();
  const { user } = useUser();
  const [isPosting, setIsPosting] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const requireUser = (validationError?: string) => {
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!user?.id) {
      toast.error("You must be logged in.");
      return;
    }
    return user.id;
  };

  const run = async (
    kind: ActionKind,
    messages: { loading: string; success: string },
    action: () => Promise<void>,
  ) => {
    const setLoading = kind === "post" ? setIsPosting : setIsScheduling;
    setLoading(true);
    const toastId = toast.loading(messages.loading);
    try {
      await action();
      toast.success(messages.success, { id: toastId });
      router.push("/home");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Something went wrong.",
        { id: toastId },
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    userId: user?.id,
    isPosting,
    isScheduling,
    requireUser,
    run,
    close: () => router.push("/home"),
  };
}
