"use client";

import { useCallback, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { channelConfigs } from "@/config/channels";
import { api } from "@/convex/_generated/api";
import type { SocialAccount } from "@/types/social-account";
import type { ChannelId, ChannelStatuses } from "@/types/social";

const emptyStatuses: ChannelStatuses = {
  facebook: { connected: false, loading: true },
  instagram: { connected: false, loading: true },
  twitter: { connected: false, loading: false },
};

export function useSocialAccounts() {
  const { user } = useUser();
  const userId = user?.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const disconnectAccount = useMutation(api.socialAccounts.disconnectAccount);
  const storedAccounts = useQuery(
    api.socialAccounts.getAccountsForUser,
    userId ? { userId } : "skip",
  ) as SocialAccount[] | undefined;

  useEffect(() => {
    const metaConnected = searchParams.get("meta_connected");
    const metaError = searchParams.get("meta_error");
    if (metaConnected) {
      toast.success("Meta account connected successfully!");
      router.replace("/connect/social-accounts");
    } else if (metaError) {
      toast.error(metaError);
      router.replace("/connect/social-accounts");
    }
  }, [router, searchParams]);

  const loading = userId !== undefined && storedAccounts === undefined;
  const statuses: ChannelStatuses = {
    facebook: {
      connected:
        storedAccounts?.some(
          (a) => a.platform === "Facebook" && a.status === "Connected",
        ) ?? false,
      loading,
    },
    instagram: {
      connected:
        storedAccounts?.some(
          (a) => a.platform === "Instagram" && a.status === "Connected",
        ) ?? false,
      loading,
    },
    twitter: emptyStatuses.twitter,
  };
  const connectedChannels = Object.entries(statuses)
    .filter(([, status]) => status.connected)
    .map(([id]) => id as ChannelId);

  const handleConnect = useCallback(
    (channelValue: string) => {
      if (!userId) return toast.error("You must be logged in.");
      if (!(channelValue in channelConfigs)) return;
      setIsConnectDialogOpen(false);
      if (channelValue === "facebook" || channelValue === "instagram") {
        // Full page navigation is required: this route 302s off-site to
        // Facebook's OAuth dialog, which router.push() can't follow.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/api/meta/oauth/start";
      } else {
        toast.info(`${channelConfigs[channelValue as ChannelId].name} isn't supported yet.`);
      }
    },
    [userId],
  );

  const handleDisconnect = useCallback(
    async (channel: ChannelId) => {
      if (!userId) return toast.error("You must be logged in.");
      if (channel !== "facebook" && channel !== "instagram") return;
      const platform = channelConfigs[channel].platform;
      const name = channelConfigs[channel].name;
      const toastId = toast.loading(`Disconnecting ${name}...`);
      try {
        await disconnectAccount({ userId, platform });
        toast.success(`${name} disconnected.`, { id: toastId });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to disconnect",
          { id: toastId },
        );
      }
    },
    [disconnectAccount, userId],
  );

  return {
    statuses,
    connectedChannels,
    isConnectDialogOpen,
    setIsConnectDialogOpen,
    handleConnect,
    handleDisconnect,
  };
}
