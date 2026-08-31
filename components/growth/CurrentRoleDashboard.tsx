"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import RoleDashboard from "./RoleDashboard";

export default function CurrentRoleDashboard() {
  const role = useQuery(api.team.getMyRole);
  if (role === undefined) return null;
  return <RoleDashboard role={role} />;
}
