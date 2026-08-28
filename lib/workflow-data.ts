import type {
  ApprovalPost,
  WorkspaceAuditEntry,
  WorkspaceNotification,
} from "@/types/workflow";

const hour = 60 * 60 * 1000;
const day = 24 * hour;
const now = Date.UTC(2026, 7, 25, 10, 0);

export const approvalPosts: ApprovalPost[] = [
  {
    id: "approval-launch",
    author: "Noura Hassan",
    campaign: "Product launch",
    content:
      "Your social strategy should create customers—not just impressions. Meet the unified Spiders AI growth workspace.",
    channels: ["facebook", "instagram"],
    status: "pending",
    priority: "high",
    scheduledAt: now + day,
    submittedAt: now - 2 * hour,
    steps: [
      {
        id: "launch-manager",
        role: "marketingManager",
        assignee: "Omar Saleh",
        status: "approved",
      },
      {
        id: "launch-cmo",
        role: "cmo",
        assignee: "Sarah Alotaibi",
        status: "current",
      },
    ],
    history: [
      {
        id: "launch-created",
        actor: "Noura Hassan",
        action: "created",
        occurredAt: now - 5 * hour,
      },
      {
        id: "launch-submitted",
        actor: "Noura Hassan",
        action: "submitted",
        occurredAt: now - 2 * hour,
      },
      {
        id: "launch-approved",
        actor: "Omar Saleh",
        action: "approved",
        occurredAt: now - hour,
      },
    ],
  },
  {
    id: "approval-customer-story",
    author: "Noura Hassan",
    campaign: "Customer story",
    content:
      "Northstar Retail shortened its content cycle while keeping every stakeholder aligned. Here is what changed.",
    channels: ["facebook"],
    status: "changesRequested",
    priority: "standard",
    scheduledAt: now + 2 * day,
    submittedAt: now - day,
    steps: [
      {
        id: "story-manager",
        role: "marketingManager",
        assignee: "Omar Saleh",
        status: "rejected",
      },
    ],
    history: [
      {
        id: "story-created",
        actor: "Noura Hassan",
        action: "created",
        occurredAt: now - 2 * day,
      },
      {
        id: "story-submitted",
        actor: "Noura Hassan",
        action: "submitted",
        occurredAt: now - day,
      },
      {
        id: "story-changes",
        actor: "Omar Saleh",
        action: "changesRequested",
        occurredAt: now - 18 * hour,
        note: "Add the approved customer quote and shorten the first sentence.",
      },
    ],
  },
  {
    id: "approval-webinar",
    author: "Omar Saleh",
    campaign: "Growth webinar",
    content:
      "Join our live session on turning social engagement into buying-group intent, activation, and revenue.",
    channels: ["instagram"],
    status: "approved",
    priority: "standard",
    scheduledAt: now + 3 * day,
    submittedAt: now - 8 * hour,
    steps: [
      {
        id: "webinar-manager",
        role: "marketingManager",
        assignee: "Omar Saleh",
        status: "approved",
      },
    ],
    history: [
      {
        id: "webinar-created",
        actor: "Omar Saleh",
        action: "created",
        occurredAt: now - day,
      },
      {
        id: "webinar-approved",
        actor: "Omar Saleh",
        action: "approved",
        occurredAt: now - 7 * hour,
      },
    ],
  },
  {
    id: "approval-tip",
    author: "Noura Hassan",
    campaign: "Always-on social",
    content:
      "Growth tip: connect content performance to what the customer does next—not only to likes and comments.",
    channels: ["facebook", "instagram"],
    status: "draft",
    priority: "standard",
    submittedAt: now - 3 * hour,
    steps: [
      {
        id: "tip-manager",
        role: "marketingManager",
        assignee: "Omar Saleh",
        status: "waiting",
      },
    ],
    history: [
      {
        id: "tip-created",
        actor: "Noura Hassan",
        action: "created",
        occurredAt: now - 3 * hour,
      },
    ],
  },
];

export const workspaceNotifications: WorkspaceNotification[] = [
  {
    id: "notification-approval",
    kind: "approval",
    occurredAt: now - hour,
    read: false,
    href: "/growth/approvals/approval-launch",
  },
  {
    id: "notification-signal",
    kind: "signal",
    occurredAt: now - 2 * hour,
    read: false,
    href: "/growth/accounts/northstar-retail",
  },
  {
    id: "notification-support",
    kind: "support",
    occurredAt: now - 5 * hour,
    read: true,
    href: "/growth/accounts/namaa-health",
  },
  {
    id: "notification-system",
    kind: "system",
    occurredAt: now - day,
    read: true,
    href: "/growth/admin/setup",
  },
];

export const workspaceAudit: WorkspaceAuditEntry[] = [
  {
    id: "audit-role",
    actor: "Farah Tamer",
    action: "roleChanged",
    target: "Omar Saleh → Marketing manager",
    occurredAt: now - hour,
  },
  {
    id: "audit-post",
    actor: "Omar Saleh",
    action: "postApproved",
    target: "Product launch",
    occurredAt: now - 2 * hour,
  },
  {
    id: "audit-rule",
    actor: "Farah Tamer",
    action: "approvalRuleChanged",
    target: "High-risk campaign workflow",
    occurredAt: now - 6 * hour,
  },
  {
    id: "audit-integration",
    actor: "Farah Tamer",
    action: "integrationConnected",
    target: "CRM",
    occurredAt: now - day,
  },
  {
    id: "audit-member",
    actor: "Farah Tamer",
    action: "memberInvited",
    target: "Lama Ibrahim",
    occurredAt: now - 2 * day,
  },
];

export function getApprovalPost(id: string) {
  return approvalPosts.find((post) => post.id === id);
}
