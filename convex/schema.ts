import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({

  users: defineTable({
    clerkUserId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_clerkUserId", ["clerkUserId"]),


  socialAccounts: defineTable({
    userId: v.optional(v.string()),
    platform: v.union(
      v.literal("Instagram"),
      v.literal("Facebook"),
      v.literal("LinkedIn"),
      v.literal("TikTok"),
      v.literal("X"),
    ),
    accountName: v.string(),
    accountHandle: v.string(),
    status: v.union(
      v.literal("Connected"),
      v.literal("Disconnected"),
    ),
    // Meta Graph API credentials for Facebook/Instagram. platformAccountId is
    // the Facebook Page id (Facebook) or Instagram Business Account id
    // (Instagram); accessToken is the Page access token used for both, since
    // Instagram publishing on a linked account is authorized through its
    // parent Page. Never return accessToken from a public query.
    platformAccountId: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    tokenObtainedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_platform", ["platform"])
    .index("by_userId_platform", ["userId", "platform"]),

  posts: defineTable({
    userId: v.string(),
    platform: v.union(v.literal("Instagram"), v.literal("Facebook"), v.literal("LinkedIn"), v.literal("TikTok"), v.literal("X")),
    content: v.string(),
    mediaUrl: v.optional(v.string()),
    socialAccountId: v.optional(v.string()),
    status: v.union(
      v.literal("Scheduled"),
      v.literal("Processing"),
      v.literal("PendingApproval"),
      v.literal("Published"),
      v.literal("Failed")
    ),
    scheduledAt: v.optional(v.number()),
    publishedAt: v.optional(v.number()),
    postUrl: v.optional(v.string()),
    platformPostId: v.optional(v.string()),
    analyticsCollected: v.optional(v.boolean()),
    lastAnalyticsScraped: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  analytics: defineTable({
    postId: v.id("posts"),
    userId: v.string(),
    platform: v.string(),
    likes: v.number(),
    comments: v.number(),
    shares: v.number(),
    // Pulled from the Graph API's /insights edge (post_impressions/reach for
    // Facebook, impressions/reach for Instagram). Optional because insights
    // can fail independently of the base like/comment/share fetch (low
    // activity, permission edge cases) — a failed insights call shouldn't
    // block recording the metrics that did succeed.
    reach: v.optional(v.number()),
    impressions: v.optional(v.number()),
    scrapedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_postId", ["postId"])
    .index("by_userId", ["userId"])
    .index("by_postId_scrapedAt", ["postId", "scrapedAt"]),
    
  comments: defineTable({
    userId: v.string(),
    targetUrl: v.string(),
    postId: v.optional(v.id("posts")),
    authorName: v.string(),
    content: v.string(),
    classification: v.string(),
    platform: v.union(v.literal("facebook"), v.literal("instagram")),
    scheduledAt: v.optional(v.number()),
    status: v.union(
      v.literal("Scheduled"),
      v.literal("Processing"),
      v.literal("Published"),
      v.literal("Failed")
    ),
    error: v.optional(v.string()),
    createdAt: v.number(),
    // Set when logSocialSignalForCommenter matches this commenter's name to
    // a tracked growth account's buying-group member — denormalized here
    // (not just on the account's signal) so the social side of the app can
    // show "this is a known CRM contact" right where comments are reviewed.
    matchedAccountId: v.optional(v.id("growthAccounts")),
    matchedAccountName: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_status_scheduled", ["status", "scheduledAt"])
    .index("by_platform", ["platform"])
    .index("by_postId", ["postId"]),

  followUpTasks: defineTable({
    commentId: v.id("comments"),
    userId: v.id("users"),

    title: v.string(),

    status: v.union(
      v.literal("Todo"),
      v.literal("InProgress"),
      v.literal("Completed"),
    ),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_commentId", ["commentId"])
    .index("by_status", ["status"]),

  teamMembers: defineTable({
    clerkUserId: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    role: v.union(
      v.literal("ownerAdmin"),
      v.literal("cmo"),
      v.literal("marketingManager"),
      v.literal("socialMediaUser"),
    ),
    status: v.union(
      v.literal("active"),
      v.literal("invited"),
      v.literal("suspended"),
    ),
    lastActive: v.optional(v.number()),
    createdAt: v.number(),
    // Which of an admin's teams this person belongs to. Optional so members
    // created before multi-team support (or never assigned) just show up as
    // ungrouped rather than requiring a backfill migration.
    teamId: v.optional(v.id("teams")),
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_email", ["email"])
    .index("by_teamId", ["teamId"]),

  // A named group of teamMembers an admin can create, assign people to, and
  // monitor on its own or alongside every other team.
  teams: defineTable({
    name: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
  }),

  // A real task assigned to a whole team (not one person's comment-derived
  // followUpTasks row) — an admin hands the team something concrete to do,
  // and any member of that team can move it along.
  teamTasks: defineTable({
    teamId: v.id("teams"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("Todo"),
      v.literal("InProgress"),
      v.literal("Completed"),
    ),
    assignedBy: v.string(),
    dueAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_teamId", ["teamId"]),

  growthAccounts: defineTable({
    name: v.string(),
    domain: v.string(),
    industry: v.string(),
    employees: v.number(),
    tier: v.union(
      v.literal("enterprise"),
      v.literal("midMarket"),
      v.literal("smallBusiness"),
    ),
    stage: v.union(
      v.literal("discover"),
      v.literal("engaged"),
      v.literal("demo"),
      v.literal("trial"),
      v.literal("activated"),
      v.literal("customer"),
      v.literal("renewal"),
    ),
    intentScore: v.number(),
    engagementScore: v.number(),
    adoptionScore: v.number(),
    buyingGroupCoverage: v.number(),
    pipelineValue: v.number(),
    ltv: v.number(),
    owner: v.string(),
    // Which team is accountable for this account — separate from `owner`
    // (a free-text person name), so a team's real pipeline/LTV rollup can
    // be computed from accounts actually assigned to it.
    teamId: v.optional(v.id("teams")),
    nextAction: v.union(
      v.literal("bookExecutiveDemo"),
      v.literal("shareSecurityGuide"),
      v.literal("inviteSecondAdmin"),
      v.literal("resolveSupportBlocker"),
      v.literal("launchRenewalReview"),
    ),
    members: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        title: v.string(),
        role: v.union(
          v.literal("decisionMaker"),
          v.literal("champion"),
          v.literal("user"),
          v.literal("technicalEvaluator"),
        ),
        score: v.number(),
        email: v.string(),
        status: v.union(
          v.literal("active"),
          v.literal("missing"),
          v.literal("atRisk"),
        ),
      }),
    ),
    signals: v.array(
      v.object({
        id: v.string(),
        source: v.union(
          v.literal("website"),
          v.literal("campaign"),
          v.literal("social"),
          v.literal("email"),
          v.literal("crm"),
          v.literal("product"),
          v.literal("support"),
        ),
        kind: v.union(
          v.literal("pricingVisit"),
          v.literal("socialQuestion"),
          v.literal("campaignClick"),
          v.literal("demoRequested"),
          v.literal("trialStarted"),
          v.literal("postCreated"),
          v.literal("productLogin"),
          v.literal("teamInvited"),
          v.literal("supportOpened"),
          v.literal("supportResolved"),
          v.literal("renewalViewed"),
        ),
        occurredAt: v.number(),
        detail: v.optional(v.string()),
        postId: v.optional(v.string()),
      }),
    ),
    // Timestamped record of every stage transition, oldest first. Optional
    // because accounts created before this field existed have none — used to
    // compute a real sales-cycle length instead of a hardcoded number.
    stageHistory: v.optional(
      v.array(
        v.object({
          stage: v.union(
            v.literal("discover"),
            v.literal("engaged"),
            v.literal("demo"),
            v.literal("trial"),
            v.literal("activated"),
            v.literal("customer"),
            v.literal("renewal"),
          ),
          occurredAt: v.number(),
        }),
      ),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_stage", ["stage"])
    .index("by_teamId", ["teamId"]),

  campaigns: defineTable({
    name: v.string(),
    channel: v.union(
      v.literal("website"),
      v.literal("campaign"),
      v.literal("social"),
      v.literal("email"),
      v.literal("crm"),
      v.literal("product"),
      v.literal("support"),
    ),
    spend: v.number(),
    // No real ad-spend data source exists (no Marketing API integration),
    // so spend stays manual entry — everything below it doesn't have to.
    // accounts/opportunities/pipeline/customers/retained/ltv are stored as
    // 0 and computed at query time from accountIds' real account data
    // whenever accounts are actually linked (see campaigns.listCampaigns).
    accountIds: v.optional(v.array(v.id("growthAccounts"))),
    // Real posts this campaign covers — reach/impressions/engagement are
    // computed at query time from these posts' actual analytics, same
    // "link real records instead of typing a number" pattern as accountIds.
    postIds: v.optional(v.array(v.id("posts"))),
    accounts: v.number(),
    opportunities: v.number(),
    pipeline: v.number(),
    customers: v.number(),
    retained: v.number(),
    ltv: v.number(),
    // Which team owns running this campaign — for the same per-team rollup
    // purpose as growthAccounts.teamId.
    teamId: v.optional(v.id("teams")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_teamId", ["teamId"]),

  journeySteps: defineTable({
    stage: v.union(
      v.literal("workspaceCreated"),
      v.literal("dataConnected"),
      v.literal("teamInvited"),
      v.literal("permissionsAssigned"),
      v.literal("firstCampaign"),
      v.literal("growthOperations"),
    ),
    owner: v.union(
      v.literal("ownerAdmin"),
      v.literal("cmo"),
      v.literal("marketingManager"),
      v.literal("socialMediaUser"),
    ),
    completed: v.boolean(),
    updatedAt: v.number(),
  }).index("by_stage", ["stage"]),

  approvalPosts: defineTable({
    author: v.string(),
    // The Clerk user id to publish as once every step approves — derived
    // server-side from the submitter's identity, not client-supplied.
    // Optional since posts created before this field existed have none;
    // those can't be auto-published, only manually.
    authorUserId: v.optional(v.string()),
    campaign: v.string(),
    content: v.string(),
    channels: v.array(v.union(v.literal("facebook"), v.literal("instagram"))),
    storageId: v.optional(v.id("_storage")),
    resultingPostId: v.optional(v.id("posts")),
    publishError: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("pending"),
      v.literal("changesRequested"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("scheduled"),
      v.literal("published"),
    ),
    priority: v.union(v.literal("standard"), v.literal("high")),
    scheduledAt: v.optional(v.number()),
    submittedAt: v.number(),
    steps: v.array(
      v.object({
        id: v.string(),
        role: v.union(
          v.literal("ownerAdmin"),
          v.literal("cmo"),
          v.literal("marketingManager"),
          v.literal("socialMediaUser"),
        ),
        assignee: v.string(),
        status: v.union(
          v.literal("waiting"),
          v.literal("current"),
          v.literal("approved"),
          v.literal("rejected"),
        ),
      }),
    ),
    history: v.array(
      v.object({
        id: v.string(),
        actor: v.string(),
        action: v.union(
          v.literal("created"),
          v.literal("submitted"),
          v.literal("approved"),
          v.literal("rejected"),
          v.literal("changesRequested"),
          v.literal("commented"),
        ),
        occurredAt: v.number(),
        note: v.optional(v.string()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),

  workspaceNotifications: defineTable({
    kind: v.union(
      v.literal("approval"),
      v.literal("signal"),
      v.literal("support"),
      v.literal("system"),
    ),
    title: v.string(),
    detail: v.string(),
    occurredAt: v.number(),
    read: v.boolean(),
    href: v.string(),
  }).index("by_occurredAt", ["occurredAt"]),

  auditLog: defineTable({
    actor: v.string(),
    action: v.union(
      v.literal("roleChanged"),
      v.literal("integrationConnected"),
      v.literal("approvalRuleChanged"),
      v.literal("postApproved"),
      v.literal("memberInvited"),
      v.literal("teamCreated"),
      v.literal("memberCreated"),
    ),
    target: v.string(),
    occurredAt: v.number(),
  }).index("by_occurredAt", ["occurredAt"]),

  // Anonymous consumer-side funnel tracking for the public landing page
  // (spiders.ai) — a browser-generated id, not a login, so we can see
  // first visit -> engagement -> signup before anyone has an account.
  // "Activated"/"retained" aren't stored here; they're derived at query
  // time from real published-post counts once a visitor links to a real
  // Clerk user, same as everything else in this app that's computed
  // rather than hand-set.
  // A real, sent record of every personalized outreach email — created only
  // after Resend confirms the send. Lets the account profile show real
  // "last contacted" history instead of the draft dialog being a dead end
  // with no trace of what actually went out.
  outreachEmails: defineTable({
    accountId: v.id("growthAccounts"),
    memberId: v.string(),
    toEmail: v.string(),
    subject: v.string(),
    body: v.string(),
    sentBy: v.string(),
    sentAt: v.number(),
    resendId: v.optional(v.string()),
  }).index("by_accountId", ["accountId"]),

  consumerVisitors: defineTable({
    visitorId: v.string(),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    engagedAt: v.optional(v.number()),
    signedUpAt: v.optional(v.number()),
    clerkUserId: v.optional(v.string()),
    // Real email opt-in captured before (or instead of) a full signup — see
    // consumerJourney.captureLead. Optional because most visitors never
    // opt in; first capture wins, it's never overwritten.
    email: v.optional(v.string()),
    emailCapturedAt: v.optional(v.number()),
  })
    .index("by_visitorId", ["visitorId"])
    .index("by_clerkUserId", ["clerkUserId"]),

});