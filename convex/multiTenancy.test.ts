import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

function identity(subject: string, email: string, name: string) {
  return { subject, tokenIdentifier: `test|${subject}`, email, name };
}

describe("multi-tenant workspace isolation", () => {
  test("createWorkspace: both intents create an isolated ownerAdmin workspace, and a second call is refused", async () => {
    const t = convexTest(schema);
    const alice = t.withIdentity(identity("alice_sub", "alice@a.com", "Alice"));
    const bob = t.withIdentity(identity("bob_sub", "bob@b.com", "Bob"));

    const aliceResult = await alice.mutation(api.workspaces.createWorkspace, {
      name: "Alice Co",
      intent: "workspace",
    });
    const bobResult = await bob.mutation(api.workspaces.createWorkspace, {
      name: "Bob Co",
      intent: "individual",
    });

    expect(aliceResult.workspaceId).not.toEqual(bobResult.workspaceId);

    const aliceRole = await alice.query(api.team.getMyRole, {});
    const bobRole = await bob.query(api.team.getMyRole, {});
    expect(aliceRole).toBe("admin");
    expect(bobRole).toBe("social_media_user");

    // Both are ownerAdmin underneath regardless of dashboardHint — neither
    // sign-up path should lock its creator out of their own workspace.
    const aliceMember = await t.run((ctx) => ctx.db.get(aliceResult.memberId));
    const bobMember = await t.run((ctx) => ctx.db.get(bobResult.memberId));
    expect(aliceMember?.role).toBe("ownerAdmin");
    expect(bobMember?.role).toBe("ownerAdmin");

    await expect(
      alice.mutation(api.workspaces.createWorkspace, {
        name: "Alice Co Again",
        intent: "workspace",
      }),
    ).rejects.toThrow(/already belong to a workspace/i);
  });

  test("ensureCurrentMember: existing member touched, invited-by-email linked, brand-new identity refused", async () => {
    const t = convexTest(schema);
    const alice = t.withIdentity(identity("alice_sub", "alice@a.com", "Alice"));
    const { workspaceId } = await alice.mutation(api.workspaces.createWorkspace, {
      name: "Alice Co",
      intent: "workspace",
    });

    // Existing member: just a lastActive touch, no error.
    await expect(alice.mutation(api.team.ensureCurrentMember, {})).resolves.toBeDefined();

    // Invited-by-email placeholder, no clerkUserId yet.
    const invitedMemberId = await t.run((ctx) =>
      ctx.db.insert("teamMembers", {
        workspaceId,
        name: "Invited Person",
        email: "invited@a.com",
        role: "marketingManager",
        status: "invited",
        createdAt: Date.now(),
      }),
    );
    const invited = t.withIdentity(
      identity("invited_sub", "invited@a.com", "Invited Person"),
    );
    const linkedId = await invited.mutation(api.team.ensureCurrentMember, {});
    expect(linkedId).toEqual(invitedMemberId);
    const linkedRow = await t.run((ctx) => ctx.db.get(invitedMemberId));
    expect(linkedRow?.clerkUserId).toBe("invited_sub");
    expect(linkedRow?.status).toBe("active");

    // Genuinely new identity, no workspace, no invite.
    const charlie = t.withIdentity(identity("charlie_sub", "charlie@c.com", "Charlie"));
    await expect(charlie.mutation(api.team.ensureCurrentMember, {})).rejects.toThrow(
      /no workspace to join/i,
    );
  });

  test("cross-tenant isolation: workspace A cannot read, write, or enumerate workspace B's data", async () => {
    const t = convexTest(schema);
    const alice = t.withIdentity(identity("alice_sub", "alice@a.com", "Alice"));
    const bob = t.withIdentity(identity("bob_sub", "bob@b.com", "Bob"));

    const { workspaceId: wsA } = await alice.mutation(api.workspaces.createWorkspace, {
      name: "Workspace A",
      intent: "workspace",
    });
    const { workspaceId: wsB, memberId: bobMemberId } = await bob.mutation(
      api.workspaces.createWorkspace,
      { name: "Workspace B", intent: "workspace" },
    );

    // --- Seed real data in B, as bob, through the app's own mutations ---
    const bobAccountId = await bob.mutation(api.growth.createAccount, {
      name: "Bob's Account",
      domain: "bobco.com",
      industry: "Software",
      employees: 50,
      tier: "midMarket",
      stage: "discover",
      owner: "Bob",
      pipelineValue: 1000,
      ltv: 5000,
    });
    const bobTeamId = await bob.mutation(api.teams.createTeam, { name: "Bob's Team" });
    const bobCampaignId = await bob.mutation(api.campaigns.createCampaign, {
      name: "Bob's Campaign",
      channel: "email",
      spend: 100,
    });
    const bobPostId = await bob.mutation(api.posts.schedulePost, {
      platform: "Facebook",
      content: "Bob's scheduled post",
      scheduledAt: Date.now() + 60_000,
    });
    const bobCommentId = await bob.mutation(api.comments.createComment, {
      targetUrl: "https://example.com/bob-post",
      authorName: "Someone",
      content: "Nice post",
      platform: "facebook",
    });
    const bobApprovalId = await bob.mutation(api.approvals.createPost, {
      author: "Bob",
      campaign: "Bob's Campaign",
      content: "Approve me",
      channels: ["facebook"],
      priority: "standard",
      steps: [{ id: "step1", role: "ownerAdmin", assignee: "Bob" }],
    });
    const bobNotificationId = await bob.mutation(api.notifications.createNotification, {
      kind: "system",
      title: "Bob notif",
      detail: "detail",
      href: "/x",
    });

    // --- As alice (workspace A), every one of these must be refused ---
    await expect(alice.query(api.growth.getAccount, { accountId: bobAccountId })).rejects.toThrow(
      /not found/i,
    );
    await expect(
      alice.mutation(api.growth.deleteAccount, { accountId: bobAccountId }),
    ).rejects.toThrow(/not found/i);
    await expect(
      alice.mutation(api.growth.updateAccount, { accountId: bobAccountId, stage: "customer" }),
    ).rejects.toThrow(/not found/i);
    await expect(
      alice.mutation(api.growth.addSignal, {
        accountId: bobAccountId,
        signal: {
          id: "sig1",
          source: "website",
          kind: "pricingVisit",
          occurredAt: Date.now(),
        },
      }),
    ).rejects.toThrow(/not found/i);
    await expect(
      alice.mutation(api.growth.addMember, {
        accountId: bobAccountId,
        member: {
          id: "m1",
          name: "X",
          title: "CTO",
          role: "decisionMaker",
          email: "x@bobco.com",
          status: "active",
        },
      }),
    ).rejects.toThrow(/not found/i);

    await expect(alice.mutation(api.teams.deleteTeam, { teamId: bobTeamId })).rejects.toThrow(
      /not found/i,
    );
    await expect(
      alice.mutation(api.teams.assignMemberToTeam, { memberId: bobMemberId, teamId: undefined }),
    ).rejects.toThrow(/not found/i);
    await expect(
      alice.mutation(api.teams.createTeamMember, {
        name: "New",
        email: "new@a.com",
        role: "socialMediaUser",
        clerkUserId: "new_sub",
        teamId: bobTeamId,
      }),
    ).rejects.toThrow(/not found/i);

    await expect(
      alice.mutation(api.campaigns.deleteCampaign, { campaignId: bobCampaignId }),
    ).rejects.toThrow(/not found/i);
    await expect(
      alice.mutation(api.campaigns.updateCampaign, { campaignId: bobCampaignId, spend: 999 }),
    ).rejects.toThrow(/not found/i);

    await expect(
      alice.mutation(api.comments.deleteCommentAdmin, { commentId: bobCommentId }),
    ).rejects.toThrow(/not found/i);
    await expect(
      alice.query(api.comments.getCommentsForUserAdmin, { userId: "bob_sub" }),
    ).rejects.toThrow(/not found/i);

    await expect(
      alice.mutation(api.posts.cancelScheduledItemAdmin, { postId: bobPostId }),
    ).rejects.toThrow(/not found/i);
    await expect(
      alice.mutation(api.posts.deletePostAdmin, { postId: bobPostId }),
    ).rejects.toThrow(/not found/i);
    await expect(
      alice.mutation(api.posts.retryPostAdmin, { postId: bobPostId }),
    ).rejects.toThrow(/not found/i);
    await expect(
      alice.query(api.posts.getPostsForUserAdmin, { userId: "bob_sub" }),
    ).rejects.toThrow(/not found/i);

    await expect(
      alice.mutation(api.notifications.markRead, { notificationId: bobNotificationId }),
    ).rejects.toThrow(/not found/i);

    await expect(alice.query(api.approvals.getPost, { postId: bobApprovalId })).rejects.toThrow(
      /not found/i,
    );
    await expect(
      alice.mutation(api.approvals.decide, { postId: bobApprovalId, decision: "approve" }),
    ).rejects.toThrow(/not found/i);

    // Sanity: bob himself can still do all of this against his own data.
    await expect(
      alice.query(api.growth.getAccount, { accountId: bobAccountId }),
    ).rejects.toThrow();
    const bobsOwnView = await bob.query(api.growth.getAccount, { accountId: bobAccountId });
    expect(bobsOwnView?.id).toEqual(bobAccountId);
    void wsA;
    void wsB;
  });

  test("scoped list queries never mix data across workspaces", async () => {
    const t = convexTest(schema);
    const alice = t.withIdentity(identity("alice_sub", "alice@a.com", "Alice"));
    const bob = t.withIdentity(identity("bob_sub", "bob@b.com", "Bob"));

    await alice.mutation(api.workspaces.createWorkspace, { name: "A", intent: "workspace" });
    await bob.mutation(api.workspaces.createWorkspace, { name: "B", intent: "workspace" });

    await alice.mutation(api.growth.createAccount, {
      name: "A-Account",
      domain: "a.com",
      industry: "Tech",
      employees: 10,
      tier: "smallBusiness",
      stage: "discover",
      owner: "Alice",
      pipelineValue: 1,
      ltv: 1,
    });
    await bob.mutation(api.growth.createAccount, {
      name: "B-Account",
      domain: "b.com",
      industry: "Tech",
      employees: 10,
      tier: "smallBusiness",
      stage: "discover",
      owner: "Bob",
      pipelineValue: 1,
      ltv: 1,
    });
    await alice.mutation(api.campaigns.createCampaign, {
      name: "A-Campaign",
      channel: "email",
      spend: 1,
    });
    await bob.mutation(api.campaigns.createCampaign, {
      name: "B-Campaign",
      channel: "email",
      spend: 1,
    });
    await alice.mutation(api.teams.createTeam, { name: "A-Team" });
    await bob.mutation(api.teams.createTeam, { name: "B-Team" });
    await alice.mutation(api.notifications.createNotification, {
      kind: "system",
      title: "A-notif",
      detail: "d",
      href: "/x",
    });
    await bob.mutation(api.notifications.createNotification, {
      kind: "system",
      title: "B-notif",
      detail: "d",
      href: "/x",
    });
    await alice.mutation(api.approvals.createPost, {
      author: "Alice",
      campaign: "A-Campaign",
      content: "A approval",
      channels: ["facebook"],
      priority: "standard",
      steps: [{ id: "s1", role: "ownerAdmin", assignee: "Alice" }],
    });
    await bob.mutation(api.approvals.createPost, {
      author: "Bob",
      campaign: "B-Campaign",
      content: "B approval",
      channels: ["facebook"],
      priority: "standard",
      steps: [{ id: "s1", role: "ownerAdmin", assignee: "Bob" }],
    });

    // Note: createWorkspace also seeds 5 demo accounts / 4 demo campaigns
    // per workspace (seedDemoWorkspace) — so each side has more than just
    // its one hand-created row. The assertion that matters is containment
    // and cross-tenant exclusion, not an exact count.
    const aliceAccounts = await alice.query(api.growth.listAccounts, {});
    const bobAccounts = await bob.query(api.growth.listAccounts, {});
    expect(aliceAccounts.map((a) => a.name)).toContain("A-Account");
    expect(aliceAccounts.map((a) => a.name)).not.toContain("B-Account");
    expect(bobAccounts.map((a) => a.name)).toContain("B-Account");
    expect(bobAccounts.map((a) => a.name)).not.toContain("A-Account");

    const aliceCampaigns = await alice.query(api.campaigns.listCampaigns, {});
    const bobCampaigns = await bob.query(api.campaigns.listCampaigns, {});
    expect(aliceCampaigns.map((c) => c.name)).toContain("A-Campaign");
    expect(aliceCampaigns.map((c) => c.name)).not.toContain("B-Campaign");
    expect(bobCampaigns.map((c) => c.name)).toContain("B-Campaign");
    expect(bobCampaigns.map((c) => c.name)).not.toContain("A-Campaign");

    const aliceTeams = await alice.query(api.teams.listTeams, {});
    const bobTeams = await bob.query(api.teams.listTeams, {});
    expect(aliceTeams.map((tm) => tm.name)).toEqual(["A-Team"]);
    expect(bobTeams.map((tm) => tm.name)).toEqual(["B-Team"]);

    const aliceMembers = await alice.query(api.team.listMembers, {});
    const bobMembers = await bob.query(api.team.listMembers, {});
    expect(aliceMembers.map((m) => m.email)).toEqual(["alice@a.com"]);
    expect(bobMembers.map((m) => m.email)).toEqual(["bob@b.com"]);

    const aliceNotifs = await alice.query(api.notifications.listNotifications, {});
    const bobNotifs = await bob.query(api.notifications.listNotifications, {});
    expect(aliceNotifs.map((n) => n.title)).toContain("A-notif");
    expect(aliceNotifs.map((n) => n.title)).not.toContain("B-notif");
    expect(bobNotifs.map((n) => n.title)).toContain("B-notif");
    expect(bobNotifs.map((n) => n.title)).not.toContain("A-notif");

    const aliceAudit = await alice.query(api.audit.listEntries, {});
    const bobAudit = await bob.query(api.audit.listEntries, {});
    expect(aliceAudit.every((e) => e.target !== "B-Team")).toBe(true);
    expect(bobAudit.every((e) => e.target !== "A-Team")).toBe(true);
    expect(aliceAudit.some((e) => e.target === "A-Team")).toBe(true);
    expect(bobAudit.some((e) => e.target === "B-Team")).toBe(true);

    const aliceApprovals = await alice.query(api.approvals.listPosts, {});
    const bobApprovals = await bob.query(api.approvals.listPosts, {});
    expect(aliceApprovals.map((p) => p.content)).toContain("A approval");
    expect(aliceApprovals.map((p) => p.content)).not.toContain("B approval");
    expect(bobApprovals.map((p) => p.content)).toContain("B approval");
    expect(bobApprovals.map((p) => p.content)).not.toContain("A approval");

    // Journey steps get seeded automatically by seedDemoWorkspace at
    // createWorkspace time — confirm each workspace has its own full set,
    // not one shared global singleton (the exact bug this migration fixes).
    const aliceSteps = await alice.query(api.journey.listSteps, {});
    const bobSteps = await bob.query(api.journey.listSteps, {});
    expect(aliceSteps.length).toBeGreaterThan(0);
    expect(bobSteps.length).toEqual(aliceSteps.length);
  });

  test("backfillDefaultWorkspace is idempotent against already-scoped data", async () => {
    const t = convexTest(schema);
    const alice = t.withIdentity(identity("alice_sub", "alice@a.com", "Alice"));
    await alice.mutation(api.workspaces.createWorkspace, { name: "A", intent: "workspace" });

    const first = await t.mutation(internal.workspaces.backfillDefaultWorkspace, {});
    const second = await t.mutation(internal.workspaces.backfillDefaultWorkspace, {});

    // Nothing to backfill — every row already has a required workspaceId
    // (the schema itself would reject an unscoped insert now), so both
    // runs should report zero patched rows across every table.
    for (const table of Object.keys(first.patched)) {
      expect(first.patched[table]).toBe(0);
    }
    expect(second.workspaceId).toEqual(first.workspaceId);
  });
});

describe("posts.getPost (found unauthenticated/unscoped during this pass, now fixed)", () => {
  test("same-workspace read succeeds, cross-workspace read is refused, unauthenticated is refused", async () => {
    const t = convexTest(schema);
    const alice = t.withIdentity(identity("alice_sub", "alice@a.com", "Alice"));
    const bob = t.withIdentity(identity("bob_sub", "bob@b.com", "Bob"));
    await alice.mutation(api.workspaces.createWorkspace, { name: "A", intent: "workspace" });
    await bob.mutation(api.workspaces.createWorkspace, { name: "B", intent: "workspace" });

    const bobPostId = await bob.mutation(api.posts.schedulePost, {
      platform: "Facebook",
      content: "Bob's private draft content",
      scheduledAt: Date.now() + 60_000,
    });

    // Positive: bob (owner, same workspace) can read it.
    const ownRead = await bob.query(api.posts.getPost, { postId: bobPostId });
    expect(ownRead?.content).toBe("Bob's private draft content");

    // Negative: alice (a different workspace entirely) gets nothing back.
    const crossTenantRead = await alice.query(api.posts.getPost, { postId: bobPostId });
    expect(crossTenantRead).toBeNull();

    // Negative: unauthenticated gets nothing back either.
    const anonRead = await t.query(api.posts.getPost, { postId: bobPostId });
    expect(anonRead).toBeNull();
  });
});

describe("meta.publishScheduledPost still works with no identity (cron pipeline)", () => {
  test("getPostInternal is reachable with no signed-in caller and the action doesn't throw on a non-Processing post", async () => {
    const t = convexTest(schema);
    const bob = t.withIdentity(identity("bob_sub", "bob@b.com", "Bob"));
    await bob.mutation(api.workspaces.createWorkspace, { name: "B", intent: "workspace" });
    const bobPostId = await bob.mutation(api.posts.schedulePost, {
      platform: "Facebook",
      content: "Bob's scheduled post",
      scheduledAt: Date.now() + 60_000,
    });

    // Unauthenticated internal query — must not throw "Not authenticated".
    const internalRead = await t.query(internal.posts.getPostInternal, { postId: bobPostId });
    expect(internalRead?.content).toBe("Bob's scheduled post");

    // The action itself: post is still "Scheduled", not "Processing" yet,
    // so it should just no-op and return rather than throwing or hanging
    // on a real network call.
    await expect(
      t.action(internal.meta.publishScheduledPost, { postId: bobPostId }),
    ).resolves.toBeNull();
  });
});
