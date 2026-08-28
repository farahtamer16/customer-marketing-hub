import type { WorkspaceRole } from "@/types/growth";

export type ApprovalStatus =
  | "draft"
  | "pending"
  | "changesRequested"
  | "approved"
  | "rejected"
  | "scheduled"
  | "published";

export type ApprovalStepStatus =
  "waiting" | "current" | "approved" | "rejected";

export interface ApprovalStep {
  id: string;
  role: WorkspaceRole;
  assignee: string;
  status: ApprovalStepStatus;
}

export interface ApprovalHistoryEntry {
  id: string;
  actor: string;
  action:
    | "created"
    | "submitted"
    | "approved"
    | "rejected"
    | "changesRequested"
    | "commented";
  occurredAt: number;
  note?: string;
}

export interface ApprovalPost {
  id: string;
  author: string;
  campaign: string;
  content: string;
  channels: ("facebook" | "instagram")[];
  status: ApprovalStatus;
  priority: "standard" | "high";
  scheduledAt?: number;
  submittedAt: number;
  steps: ApprovalStep[];
  history: ApprovalHistoryEntry[];
}

export interface WorkspaceNotification {
  id:
    | "notification-approval"
    | "notification-signal"
    | "notification-support"
    | "notification-system";
  kind: "approval" | "signal" | "support" | "system";
  occurredAt: number;
  read: boolean;
  href: string;
}

export interface WorkspaceAuditEntry {
  id: string;
  actor: string;
  action:
    | "roleChanged"
    | "integrationConnected"
    | "approvalRuleChanged"
    | "postApproved"
    | "memberInvited";
  target: string;
  occurredAt: number;
}
