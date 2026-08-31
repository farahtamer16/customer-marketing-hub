"use client";

import { ConnectChannelDialog } from "@/components/ui/ConnectChannelDialog";
import { Plus, Search } from "lucide-react";
import { ChannelCard } from "@/components/social/ChannelCard";
import { ConnectionDiagnostics } from "@/components/social/ConnectionDiagnostics";
import { useSocialAccounts } from "@/hooks/useSocialAccounts";
import { channelList } from "@/config/channels";
import { useTranslations } from "next-intl";

export default function SocialAccountsPage() {
  const t = useTranslations("social");
  const {
    statuses,
    connectedChannels,
    isConnectDialogOpen,
    setIsConnectDialogOpen,
    handleConnect,
    handleDisconnect,
  } = useSocialAccounts();

  const connectedConfigs = channelList.filter(
    (channel) => statuses[channel.id].connected,
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {t("title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {t("description")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsConnectDialogOpen(true)}
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("connectChannel")}
        </button>
      </div>

      {connectedConfigs.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {connectedConfigs.map((channel) => {
            const Icon = channel.icon;
            const status = statuses[channel.id];
            return (
              <ChannelCard
                key={channel.id}
                icon={<Icon className="h-5 w-5 text-[#3556d9]" />}
                name={channel.name}
                description={channel.description}
                gradient={channel.gradient}
                isConnected={status.connected}
                isLoading={status.loading}
                onDisconnect={() => handleDisconnect(channel.id)}
              >
                {(channel.id === "facebook" || channel.id === "instagram") && (
                  <ConnectionDiagnostics platform={channel.platform as "Facebook" | "Instagram"} />
                )}
              </ChannelCard>
            );
          })}
        </div>
      ) : (
        <EmptyState onConnect={() => setIsConnectDialogOpen(true)} />
      )}

      <ConnectChannelDialog
        isOpen={isConnectDialogOpen}
        onClose={() => setIsConnectDialogOpen(false)}
        onConnect={handleConnect}
        channels={channelList.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
        }))}
        connectedChannels={connectedChannels}
        title={t("addTitle")}
        description={t("addDescription")}
      />
    </div>
  );
}

function EmptyState({ onConnect }: { onConnect: () => void }) {
  const t = useTranslations("social");
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-gradient-to-b from-gray-50/80 to-white px-6 py-16 text-center dark:border-gray-700 dark:from-gray-800/60 dark:to-gray-800/30">
      <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-64 -translate-x-1/2 rounded-full bg-blue-500/5 blur-3xl" />
      <div className="relative mx-auto flex max-w-sm flex-col items-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 ring-1 ring-gray-200 dark:bg-gray-700/60 dark:ring-gray-600">
          <Search className="h-6 w-6 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-base font-semibold tracking-tight text-gray-900 dark:text-white">
          {t("emptyTitle")}
        </h3>
        <p className="mt-1.5 max-w-xs text-sm leading-6 text-gray-500 dark:text-gray-400">
          {t("emptyDescription")}
        </p>
        <button
          type="button"
          onClick={onConnect}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gray-800 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-900/20 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
        >
          <Plus className="h-4 w-4" />
          {t("connectChannel")}
        </button>
      </div>
    </div>
  );
}
