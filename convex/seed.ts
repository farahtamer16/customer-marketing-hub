import { mutation } from "./_generated/server";

// One-time seed for the Growth/CRM workspace so the dashboards aren't empty
// on a fresh Convex deployment. Safe to call repeatedly — it no-ops once
// growthAccounts already has data. Team members are NOT seeded here: the
// signed-in Clerk user is bootstrapped as the workspace owner automatically
// (see convex/team.ts, ensureCurrentMember), so the roster reflects real
// people instead of demo placeholders.
export const seedDemoWorkspace = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("growthAccounts").first();
    if (existing) return { seeded: false };

    const now = Date.now();
    const minute = 60_000;
    const hour = 60 * minute;
    const day = 24 * hour;

    const accounts = [
      {
        name: "Northstar Retail",
        domain: "northstar.example",
        industry: "Retail technology",
        employees: 1280,
        tier: "enterprise" as const,
        stage: "demo" as const,
        intentScore: 91,
        engagementScore: 84,
        adoptionScore: 18,
        buyingGroupCoverage: 75,
        pipelineValue: 180000,
        ltv: 540000,
        owner: "Lina Hassan",
        nextAction: "bookExecutiveDemo" as const,
        members: [
          { id: "nora", name: "Nora Alami", title: "Chief Marketing Officer", role: "decisionMaker" as const, score: 94, email: "nora@northstar.example", status: "active" as const },
          { id: "sami", name: "Sami Kareem", title: "Marketing Manager", role: "champion" as const, score: 88, email: "sami@northstar.example", status: "active" as const },
          { id: "maya", name: "Maya Noor", title: "Social Media Specialist", role: "user" as const, score: 79, email: "maya@northstar.example", status: "active" as const },
          { id: "missing-northstar", name: "Unassigned", title: "Technical evaluator needed", role: "technicalEvaluator" as const, score: 0, email: "", status: "missing" as const },
        ],
        signals: [
          { id: "ns-1", source: "social" as const, kind: "socialQuestion" as const, occurredAt: now - 18 * minute, detail: "Asked about team approval workflows on an Instagram post.", postId: "ig-campaign-launch" },
          { id: "ns-2", source: "website" as const, kind: "pricingVisit" as const, occurredAt: now - 2 * hour, detail: "Visited enterprise pricing twice from the same account." },
          { id: "ns-3", source: "crm" as const, kind: "demoRequested" as const, occurredAt: now - day, detail: "Champion requested a 45-minute workflow demo." },
          { id: "ns-4", source: "campaign" as const, kind: "campaignClick" as const, occurredAt: now - 2 * day, detail: "Clicked the Arabic customer-story campaign." },
        ],
      },
      {
        name: "Crescent Labs",
        domain: "crescent.example",
        industry: "Professional services",
        employees: 340,
        tier: "midMarket" as const,
        stage: "trial" as const,
        intentScore: 78,
        engagementScore: 72,
        adoptionScore: 61,
        buyingGroupCoverage: 100,
        pipelineValue: 92000,
        ltv: 276000,
        owner: "Omar Saleh",
        nextAction: "inviteSecondAdmin" as const,
        members: [
          { id: "layan", name: "Layan Fahad", title: "VP Marketing", role: "decisionMaker" as const, score: 81, email: "layan@crescent.example", status: "active" as const },
          { id: "tariq", name: "Tariq Amin", title: "Growth Lead", role: "champion" as const, score: 86, email: "tariq@crescent.example", status: "active" as const },
          { id: "reem", name: "Reem Adel", title: "Content Specialist", role: "user" as const, score: 73, email: "reem@crescent.example", status: "active" as const },
          { id: "waleed", name: "Waleed Sami", title: "IT Manager", role: "technicalEvaluator" as const, score: 54, email: "waleed@crescent.example", status: "active" as const },
        ],
        signals: [
          { id: "cl-1", source: "product" as const, kind: "postCreated" as const, occurredAt: now - 42 * minute, detail: "Created the first cross-channel campaign post." },
          { id: "cl-2", source: "product" as const, kind: "trialStarted" as const, occurredAt: now - 3 * day, detail: "Started a 14-day workspace trial." },
          { id: "cl-3", source: "email" as const, kind: "campaignClick" as const, occurredAt: now - 4 * day, detail: "Clicked the onboarding checklist email." },
        ],
      },
      {
        name: "Masar Logistics",
        domain: "masar.example",
        industry: "Logistics",
        employees: 810,
        tier: "enterprise" as const,
        stage: "engaged" as const,
        intentScore: 69,
        engagementScore: 63,
        adoptionScore: 0,
        buyingGroupCoverage: 50,
        pipelineValue: 64000,
        ltv: 210000,
        owner: "Dana Fares",
        nextAction: "shareSecurityGuide" as const,
        members: [
          { id: "huda", name: "Huda Saeed", title: "Marketing Director", role: "decisionMaker" as const, score: 71, email: "huda@masar.example", status: "active" as const },
          { id: "faisal", name: "Faisal Rami", title: "Digital Marketing Manager", role: "champion" as const, score: 77, email: "faisal@masar.example", status: "active" as const },
          { id: "missing-masar-user", name: "Unassigned", title: "Day-to-day user needed", role: "user" as const, score: 0, email: "", status: "missing" as const },
          { id: "missing-masar-it", name: "Unassigned", title: "Technical evaluator needed", role: "technicalEvaluator" as const, score: 0, email: "", status: "missing" as const },
        ],
        signals: [
          { id: "ml-1", source: "website" as const, kind: "pricingVisit" as const, occurredAt: now - 6 * hour, detail: "Viewed security and enterprise plan pages." },
          { id: "ml-2", source: "social" as const, kind: "socialQuestion" as const, occurredAt: now - day, detail: "Asked whether scheduled posts support approvals.", postId: "fb-product-tour" },
        ],
      },
      {
        name: "Namaa Health",
        domain: "namaa.example",
        industry: "Healthcare",
        employees: 2250,
        tier: "enterprise" as const,
        stage: "activated" as const,
        intentScore: 74,
        engagementScore: 80,
        adoptionScore: 82,
        buyingGroupCoverage: 100,
        pipelineValue: 230000,
        ltv: 720000,
        owner: "Lina Hassan",
        nextAction: "resolveSupportBlocker" as const,
        members: [
          { id: "amal", name: "Amal Riyad", title: "Chief Marketing Officer", role: "decisionMaker" as const, score: 76, email: "amal@namaa.example", status: "active" as const },
          { id: "khaled", name: "Khaled Nasser", title: "Brand Manager", role: "champion" as const, score: 84, email: "khaled@namaa.example", status: "active" as const },
          { id: "sara", name: "Sara Mahmoud", title: "Social Media Lead", role: "user" as const, score: 89, email: "sara@namaa.example", status: "active" as const },
          { id: "yousef", name: "Yousef Adel", title: "Security Architect", role: "technicalEvaluator" as const, score: 67, email: "yousef@namaa.example", status: "atRisk" as const },
        ],
        signals: [
          { id: "nh-1", source: "support" as const, kind: "supportOpened" as const, occurredAt: now - 34 * minute, detail: "Admin reported an Instagram reconnect issue." },
          { id: "nh-2", source: "product" as const, kind: "teamInvited" as const, occurredAt: now - 5 * hour, detail: "Invited three teammates and assigned an approver." },
          { id: "nh-3", source: "product" as const, kind: "postCreated" as const, occurredAt: now - 8 * hour, detail: "Published five posts across Facebook and Instagram." },
        ],
      },
      {
        name: "Vertex Cloud",
        domain: "vertex.example",
        industry: "Cloud software",
        employees: 165,
        tier: "smallBusiness" as const,
        stage: "renewal" as const,
        intentScore: 66,
        engagementScore: 58,
        adoptionScore: 47,
        buyingGroupCoverage: 75,
        pipelineValue: 48000,
        ltv: 144000,
        owner: "Omar Saleh",
        nextAction: "launchRenewalReview" as const,
        members: [
          { id: "rania", name: "Rania Bassam", title: "Head of Marketing", role: "decisionMaker" as const, score: 62, email: "rania@vertex.example", status: "atRisk" as const },
          { id: "jad", name: "Jad Nabil", title: "Demand Generation Manager", role: "champion" as const, score: 59, email: "jad@vertex.example", status: "active" as const },
          { id: "mira", name: "Mira Samir", title: "Content Manager", role: "user" as const, score: 48, email: "mira@vertex.example", status: "atRisk" as const },
          { id: "missing-vertex", name: "Unassigned", title: "Technical evaluator needed", role: "technicalEvaluator" as const, score: 0, email: "", status: "missing" as const },
        ],
        signals: [
          { id: "vc-1", source: "crm" as const, kind: "renewalViewed" as const, occurredAt: now - day, detail: "Renewal opportunity entered the 60-day window." },
          { id: "vc-2", source: "product" as const, kind: "postCreated" as const, occurredAt: now - 6 * day, detail: "Publishing frequency decreased by 38% this month." },
          { id: "vc-3", source: "support" as const, kind: "supportResolved" as const, occurredAt: now - 9 * day, detail: "Scheduling timezone issue resolved." },
        ],
      },
    ];
    for (const account of accounts) {
      await ctx.db.insert("growthAccounts", {
        ...account,
        createdAt: now,
        updatedAt: now,
      });
    }

    const campaigns = [
      { name: "Arabic growth playbook", channel: "social" as const, spend: 18000, accounts: 46, opportunities: 12, pipeline: 410000, customers: 5, retained: 4, ltv: 620000 },
      { name: "Enterprise workflow webinar", channel: "campaign" as const, spend: 27000, accounts: 31, opportunities: 15, pipeline: 680000, customers: 7, retained: 7, ltv: 1120000 },
      { name: "Trial activation nurture", channel: "email" as const, spend: 9500, accounts: 58, opportunities: 18, pipeline: 350000, customers: 11, retained: 9, ltv: 530000 },
      { name: "Customer story retargeting", channel: "website" as const, spend: 14000, accounts: 39, opportunities: 10, pipeline: 290000, customers: 6, retained: 6, ltv: 470000 },
    ];
    for (const campaign of campaigns) {
      await ctx.db.insert("campaigns", { ...campaign, createdAt: now, updatedAt: now });
    }

    const journeySteps = [
      { stage: "workspaceCreated" as const, owner: "ownerAdmin" as const, completed: true },
      { stage: "dataConnected" as const, owner: "ownerAdmin" as const, completed: true },
      { stage: "teamInvited" as const, owner: "ownerAdmin" as const, completed: false },
      { stage: "permissionsAssigned" as const, owner: "ownerAdmin" as const, completed: false },
      { stage: "firstCampaign" as const, owner: "marketingManager" as const, completed: false },
      { stage: "growthOperations" as const, owner: "cmo" as const, completed: false },
    ];
    for (const step of journeySteps) {
      await ctx.db.insert("journeySteps", { ...step, updatedAt: now });
    }

    const approvalPosts = [
      {
        author: "Noura Hassan",
        campaign: "Product launch",
        content:
          "Your social strategy should create customers—not just impressions. Meet the unified growth workspace.",
        channels: ["facebook" as const, "instagram" as const],
        status: "pending" as const,
        priority: "high" as const,
        scheduledAt: now + day,
        submittedAt: now - 2 * hour,
        steps: [
          { id: "launch-manager", role: "marketingManager" as const, assignee: "Omar Saleh", status: "approved" as const },
          { id: "launch-cmo", role: "cmo" as const, assignee: "Sarah Alotaibi", status: "current" as const },
        ],
        history: [
          { id: "launch-created", actor: "Noura Hassan", action: "created" as const, occurredAt: now - 5 * hour },
          { id: "launch-submitted", actor: "Noura Hassan", action: "submitted" as const, occurredAt: now - 2 * hour },
          { id: "launch-approved", actor: "Omar Saleh", action: "approved" as const, occurredAt: now - hour },
        ],
      },
      {
        author: "Noura Hassan",
        campaign: "Customer story",
        content:
          "Northstar Retail shortened its content cycle while keeping every stakeholder aligned. Here is what changed.",
        channels: ["facebook" as const],
        status: "changesRequested" as const,
        priority: "standard" as const,
        scheduledAt: now + 2 * day,
        submittedAt: now - day,
        steps: [
          { id: "story-manager", role: "marketingManager" as const, assignee: "Omar Saleh", status: "rejected" as const },
        ],
        history: [
          { id: "story-created", actor: "Noura Hassan", action: "created" as const, occurredAt: now - 2 * day },
          { id: "story-submitted", actor: "Noura Hassan", action: "submitted" as const, occurredAt: now - day },
          { id: "story-changes", actor: "Omar Saleh", action: "changesRequested" as const, occurredAt: now - 18 * hour, note: "Add the approved customer quote and shorten the first sentence." },
        ],
      },
      {
        author: "Omar Saleh",
        campaign: "Growth webinar",
        content:
          "Join our live session on turning social engagement into buying-group intent, activation, and revenue.",
        channels: ["instagram" as const],
        status: "approved" as const,
        priority: "standard" as const,
        scheduledAt: now + 3 * day,
        submittedAt: now - 8 * hour,
        steps: [
          { id: "webinar-manager", role: "marketingManager" as const, assignee: "Omar Saleh", status: "approved" as const },
        ],
        history: [
          { id: "webinar-created", actor: "Omar Saleh", action: "created" as const, occurredAt: now - day },
          { id: "webinar-approved", actor: "Omar Saleh", action: "approved" as const, occurredAt: now - 7 * hour },
        ],
      },
      {
        author: "Noura Hassan",
        campaign: "Always-on social",
        content:
          "Growth tip: connect content performance to what the customer does next—not only to likes and comments.",
        channels: ["facebook" as const, "instagram" as const],
        status: "draft" as const,
        priority: "standard" as const,
        submittedAt: now - 3 * hour,
        steps: [
          { id: "tip-manager", role: "marketingManager" as const, assignee: "Omar Saleh", status: "waiting" as const },
        ],
        history: [
          { id: "tip-created", actor: "Noura Hassan", action: "created" as const, occurredAt: now - 3 * hour },
        ],
      },
    ];
    for (const post of approvalPosts) {
      await ctx.db.insert("approvalPosts", { ...post, createdAt: now, updatedAt: now });
    }

    const notifications = [
      { kind: "approval" as const, title: "Product launch needs executive approval", detail: "Sarah Alotaibi is the current approver for the Product launch post.", occurredAt: now - hour, read: false, href: "/growth/approvals" },
      { kind: "signal" as const, title: "Northstar Retail asked about approvals", detail: "A high-intent account asked about team approval workflows on Instagram.", occurredAt: now - 2 * hour, read: false, href: "/growth/accounts" },
      { kind: "support" as const, title: "Namaa Health opened a support ticket", detail: "An admin reported an Instagram reconnect issue.", occurredAt: now - 5 * hour, read: true, href: "/growth/accounts" },
      { kind: "system" as const, title: "Workspace setup reminder", detail: "Finish inviting your team and assigning permissions.", occurredAt: now - day, read: true, href: "/growth/admin/setup" },
    ];
    for (const notification of notifications) {
      await ctx.db.insert("workspaceNotifications", notification);
    }

    const auditEntries = [
      { actor: "System", action: "integrationConnected" as const, target: "CRM", occurredAt: now - day },
      { actor: "System", action: "approvalRuleChanged" as const, target: "High-risk campaign workflow", occurredAt: now - 6 * hour },
    ];
    for (const entry of auditEntries) {
      await ctx.db.insert("auditLog", entry);
    }

    return { seeded: true };
  },
});
