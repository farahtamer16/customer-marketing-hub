"use client";

import { useEffect } from "react";
import { AccessDenied } from "@/components/growth/DashboardPrimitives";

// Catches the "not authenticated" / "doesn't have permission" errors thrown
// by requirePermission in the growth-hub queries (accounts, leads,
// campaigns, team, audit, journeys) when someone without the right role
// navigates here directly by URL — without this boundary, that throw would
// otherwise crash the whole page instead of showing a normal access-denied
// message.
export default function GrowthError({ error }: { error: Error }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <AccessDenied />;
}
