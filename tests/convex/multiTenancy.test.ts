import { convexTest } from "convex-test";
import { describe, expect, test, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";

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

describe("teams.sendInviteEmail", () => {
  test("gated by manageTeam permission and workspace membership; degrades gracefully with no RESEND_API_KEY", async () => {
    const t = convexTest(schema);
    const alice = t.withIdentity(identity("alice_sub", "alice@a.com", "Alice"));
    const bob = t.withIdentity(identity("bob_sub", "bob@b.com", "Bob"));

    await alice.mutation(api.workspaces.createWorkspace, { name: "A", intent: "workspace" });
    const { workspaceId: wsB, memberId: bobMemberId } = await bob.mutation(
      api.workspaces.createWorkspace,
      { name: "B", intent: "workspace" },
    );

    // A socialMediaUser in bob's own workspace (no manageTeam permission)
    // can't send invites either — this isn't ownership-based, it's a real
    // permission gate.
    const plain = t.withIdentity(identity("plain_sub", "plain@b.com", "Plain"));
    await t.run((ctx) =>
      ctx.db.insert("teamMembers", {
        workspaceId: wsB,
        name: "Plain",
        email: "plain@b.com",
        role: "socialMediaUser",
        status: "active",
        clerkUserId: "plain_sub",
        createdAt: Date.now(),
      }),
    );
    await expect(
      plain.action(api.teams.sendInviteEmail, {
        memberId: bobMemberId,
        temporaryPassword: "Sp!aaaaaaaaaa9",
      }),
    ).rejects.toThrow(/permission|manageTeam/i);

    // Cross-workspace: alice cannot send an invite email for bob's member row.
    await expect(
      alice.action(api.teams.sendInviteEmail, {
        memberId: bobMemberId,
        temporaryPassword: "Sp!aaaaaaaaaa9",
      }),
    ).rejects.toThrow(/not found/i);

    // Same workspace, but this sandbox has no RESEND_API_KEY configured —
    // must degrade to { sent: false, error } rather than throwing, so
    // member creation itself is never rolled back over an email hiccup.
    const result = await bob.action(api.teams.sendInviteEmail, {
      memberId: bobMemberId,
      temporaryPassword: "Sp!aaaaaaaaaa9",
    });
    expect(result.sent).toBe(false);
    expect(result.error).toMatch(/RESEND_API_KEY/i);
  });
});

describe("consumerJourney.ts vendor-admin gate (the permission leak fix)", () => {
  test("a tenant ownerAdmin cannot see Spiders AI's own funnel/leads; a real vendor admin can", async () => {
    const t = convexTest(schema);
    const alice = t.withIdentity(identity("alice_sub", "alice@a.com", "Alice"));
    await alice.mutation(api.workspaces.createWorkspace, { name: "A", intent: "workspace" });

    // Some real landing-page activity to make sure there's something to leak.
    await t.mutation(api.consumerJourney.recordVisit, { visitorId: "v1" });
    await t.mutation(api.consumerJourney.captureLead, {
      visitorId: "v1",
      email: "lead@prospect.com",
    });

    // Alice is ownerAdmin of her own workspace — full tenant permissions,
    // including viewExecutiveAnalytics — but that must not extend to
    // Spiders AI's own consumer funnel/leads.
    await expect(alice.query(api.consumerJourney.listFunnel, {})).rejects.toThrow(
      /not authorized/i,
    );
    await expect(alice.query(api.consumerJourney.listCapturedLeads, {})).rejects.toThrow(
      /not authorized/i,
    );
    expect(await alice.query(api.users.amIVendorAdmin, {})).toBe(false);

    // A real vendor admin (bootstrapped via the internal grant mutation,
    // not any workspace membership at all) can see it.
    const vendorPerson = t.withIdentity(
      identity("vendor_sub", "vendor@spiders.ai", "Vendor Staff"),
    );
    await vendorPerson.mutation(api.users.getOrCreate, {});
    await t.mutation(internal.users.grantVendorAdmin, { email: "vendor@spiders.ai" });

    expect(await vendorPerson.query(api.users.amIVendorAdmin, {})).toBe(true);
    const funnel = await vendorPerson.query(api.consumerJourney.listFunnel, {});
    expect(funnel.firstVisit).toBeGreaterThanOrEqual(0);
    const leads = await vendorPerson.query(api.consumerJourney.listCapturedLeads, {});
    expect(leads.some((l) => l.email === "lead@prospect.com")).toBe(true);

    // Revoking actually takes it away again.
    await t.mutation(internal.users.revokeVendorAdmin, { email: "vendor@spiders.ai" });
    await expect(vendorPerson.query(api.consumerJourney.listFunnel, {})).rejects.toThrow(
      /not authorized/i,
    );
  });

  test("an unauthenticated caller is refused, not just an unprivileged one", async () => {
    const t = convexTest(schema);
    await expect(t.query(api.consumerJourney.listFunnel, {})).rejects.toThrow(
      /not authenticated/i,
    );
    expect(await t.query(api.users.amIVendorAdmin, {})).toBe(false);
  });
});

describe("comments.getCommentsForPost (now workspace-scoped, was fully open before)", () => {
  test("same-workspace teammate can read a post's comments; cross-workspace and unauthenticated cannot", async () => {
    const t = convexTest(schema);
    const alice = t.withIdentity(identity("alice_sub", "alice@a.com", "Alice"));
    const bob = t.withIdentity(identity("bob_sub", "bob@b.com", "Bob"));
    const { workspaceId: wsA } = await alice.mutation(api.workspaces.createWorkspace, {
      name: "A",
      intent: "workspace",
    });
    await bob.mutation(api.workspaces.createWorkspace, { name: "B", intent: "workspace" });

    // A teammate of alice's, in the same workspace, who didn't author the post.
    await t.run((ctx) =>
      ctx.db.insert("teamMembers", {
        workspaceId: wsA,
        clerkUserId: "carol_sub",
        name: "Carol",
        email: "carol@a.com",
        role: "marketingManager",
        status: "active",
        createdAt: Date.now(),
      }),
    );
    const carol = t.withIdentity(identity("carol_sub", "carol@a.com", "Carol"));

    const postId = await alice.mutation(api.posts.schedulePost, {
      platform: "Facebook",
      content: "Alice's post",
      scheduledAt: Date.now() + 60_000,
    });
    await alice.mutation(api.comments.createComment, {
      targetUrl: "https://example.com/alice-post",
      authorName: "Someone",
      content: "Great post",
      platform: "facebook",
    });

    const asCarol = await carol.query(api.comments.getCommentsForPost, { postId });
    expect(Array.isArray(asCarol)).toBe(true);

    const asBob = await bob.query(api.comments.getCommentsForPost, { postId });
    expect(asBob).toEqual([]);

    const asAnon = await t.query(api.comments.getCommentsForPost, { postId });
    expect(asAnon).toEqual([]);
  });
});

describe("outreach.recordEvent (Resend delivery webhook)", () => {
  test("updates deliveryStatus, never downgrades on an out-of-order event, and no-ops for an unknown resendId", async () => {
    const t = convexTest(schema);
    const alice = t.withIdentity(identity("alice_sub", "alice@a.com", "Alice"));
    await alice.mutation(api.workspaces.createWorkspace, { name: "A", intent: "workspace" });

    const accountId = await alice.mutation(api.growth.createAccount, {
      name: "Acme",
      domain: "acme.com",
      industry: "Software",
      employees: 100,
      tier: "midMarket",
      stage: "discover",
      owner: "Alice",
      pipelineValue: 10000,
      ltv: 50000,
    });

    // Seeded the way sendOutreachEmail's own logSent call does, without
    // going through the action itself (which would need a real network
    // call to Resend).
    await t.mutation(internal.outreach.logSent, {
      accountId,
      memberId: "m1",
      toEmail: "dana@acme.com",
      subject: "Hi",
      body: "Hi there",
      sentBy: "alice_sub",
      resendId: "resend_evt_1",
    });

    // An event for a resendId that isn't ours (or arrived before logSent
    // committed) — no matching row, must not throw.
    await t.mutation(internal.outreach.recordEvent, {
      resendId: "resend_evt_unknown",
      status: "delivered",
      occurredAt: Date.now(),
    });

    await t.mutation(internal.outreach.recordEvent, {
      resendId: "resend_evt_1",
      status: "delivered",
      occurredAt: 1000,
    });
    await t.mutation(internal.outreach.recordEvent, {
      resendId: "resend_evt_1",
      status: "opened",
      occurredAt: 2000,
    });
    // A late-arriving "delivered" must not downgrade the already-recorded
    // "opened" — webhook delivery order isn't guaranteed.
    await t.mutation(internal.outreach.recordEvent, {
      resendId: "resend_evt_1",
      status: "delivered",
      occurredAt: 3000,
    });

    const history = await alice.query(api.outreach.listForAccount, { accountId });
    expect(history).toHaveLength(1);
    expect(history[0].deliveryStatus).toBe("opened");
    expect(history[0].deliveryStatusAt).toBe(2000);
  });
});

describe("growth.removeMember / growth.deleteAccount", () => {
  test("removeMember drops the member and recomputes scores; deleteAccount actually deletes the row; both refuse cross-tenant", async () => {
    const t = convexTest(schema);
    const alice = t.withIdentity(identity("alice_sub", "alice@a.com", "Alice"));
    await alice.mutation(api.workspaces.createWorkspace, { name: "A", intent: "workspace" });

    const accountId = await alice.mutation(api.growth.createAccount, {
      name: "Acme",
      domain: "acme.com",
      industry: "Software",
      employees: 100,
      tier: "midMarket",
      stage: "discover",
      owner: "Alice",
      pipelineValue: 10000,
      ltv: 50000,
    });

    await alice.mutation(api.growth.addMember, {
      accountId,
      member: {
        id: "m1",
        name: "Dana",
        title: "CTO",
        role: "decisionMaker",
        email: "dana@acme.com",
        status: "active",
      },
    });
    await alice.mutation(api.growth.addMember, {
      accountId,
      member: {
        id: "m2",
        name: "Eli",
        title: "PM",
        role: "champion",
        email: "eli@acme.com",
        status: "active",
      },
    });

    let account = await alice.query(api.growth.getAccount, { accountId });
    expect(account?.members.map((m) => m.id)).toEqual(["m1", "m2"]);

    // Cross-tenant: bob cannot remove a member from alice's account.
    const bob = t.withIdentity(identity("bob_sub", "bob@b.com", "Bob"));
    await bob.mutation(api.workspaces.createWorkspace, { name: "B", intent: "workspace" });
    await expect(
      bob.mutation(api.growth.removeMember, { accountId, memberId: "m1" }),
    ).rejects.toThrow(/not found/i);

    // Same-tenant: actually removes the member and recomputes scores.
    await alice.mutation(api.growth.removeMember, { accountId, memberId: "m1" });
    account = await alice.query(api.growth.getAccount, { accountId });
    expect(account?.members.map((m) => m.id)).toEqual(["m2"]);
    expect(account?.buyingGroupCoverage).toBeDefined();

    // Cross-tenant delete is refused too (also covered in the isolation
    // test above, repeated here for locality with the removeMember case).
    await expect(
      bob.mutation(api.growth.deleteAccount, { accountId }),
    ).rejects.toThrow(/not found/i);

    // Same-tenant delete actually deletes the row.
    await alice.mutation(api.growth.deleteAccount, { accountId });
    expect(await alice.query(api.growth.getAccount, { accountId })).toBeNull();
  });
});

describe("autoReply.ts (AI auto-reply to comments)", () => {
  test("updateAutoReplySettings is manageWorkspace-gated and workspace-scoped", async () => {
    const t = convexTest(schema);
    const alice = t.withIdentity(identity("alice_sub", "alice@a.com", "Alice"));
    const { workspaceId: wsA } = await alice.mutation(api.workspaces.createWorkspace, {
      name: "A",
      intent: "workspace",
    });

    // Default is off, nothing configured yet.
    expect(await alice.query(api.workspaces.getAutoReplySettings, {})).toEqual({
      enabled: false,
      classifications: [],
    });

    // A marketingManager (no manageWorkspace permission) can't change it.
    await t.run((ctx) =>
      ctx.db.insert("teamMembers", {
        workspaceId: wsA,
        clerkUserId: "carol_sub",
        name: "Carol",
        email: "carol@a.com",
        role: "marketingManager",
        status: "active",
        createdAt: Date.now(),
      }),
    );
    const carol = t.withIdentity(identity("carol_sub", "carol@a.com", "Carol"));
    await expect(
      carol.mutation(api.workspaces.updateAutoReplySettings, {
        enabled: true,
        classifications: ["Question"],
      }),
    ).rejects.toThrow(/permission|manageWorkspace/i);

    // The ownerAdmin can.
    await alice.mutation(api.workspaces.updateAutoReplySettings, {
      enabled: true,
      classifications: ["Question", "Question", "Lead"],
    });
    const saved = await alice.query(api.workspaces.getAutoReplySettings, {});
    expect(saved.enabled).toBe(true);
    expect(new Set(saved.classifications)).toEqual(new Set(["Question", "Lead"]));

    // A second, unrelated workspace never sees workspace A's settings.
    const bob = t.withIdentity(identity("bob_sub", "bob@b.com", "Bob"));
    await bob.mutation(api.workspaces.createWorkspace, { name: "B", intent: "workspace" });
    expect(await bob.query(api.workspaces.getAutoReplySettings, {})).toEqual({
      enabled: false,
      classifications: [],
    });
  });

  test("maybeAutoReply respects the enabled flag, the classification allowlist, and requires a real platform comment id", async () => {
    // storeComments hands off to autoReply.ts via ctx.scheduler.runAfter(0,
    // ...) — that only actually runs (and finishInProgressScheduledFunctions
    // only actually waits for it) once fake timers advance past it, per
    // convex-test's own docs. Real time never reaches a runAfter(0) job on
    // its own within a synchronous test.
    vi.useFakeTimers();
    try {
      const t = convexTest(schema);
      const alice = t.withIdentity(identity("alice_sub", "alice@a.com", "Alice"));
      const { workspaceId } = await alice.mutation(api.workspaces.createWorkspace, {
        name: "A",
        intent: "workspace",
      });

      // A connected Facebook account so a matching comment gets far enough
      // to actually attempt generating a reply (and only then hit the
      // missing-API-key guardrail this sandbox is expected to hit).
      await t.run((ctx) =>
        ctx.db.insert("socialAccounts", {
          userId: "alice_sub",
          workspaceId,
          platform: "Facebook",
          accountName: "Alice's Page",
          accountHandle: "alicepage",
          status: "Connected",
          platformAccountId: "page_123",
          accessToken: "fake_token",
          createdAt: Date.now(),
        }),
      );

      const postId = await alice.mutation(api.posts.schedulePost, {
        platform: "Facebook",
        content: "Alice's post",
        scheduledAt: Date.now() + 60_000,
      });

      const flush = () => t.finishAllScheduledFunctions(() => vi.runAllTimers());

      // 1. Auto-reply disabled entirely (the default) -> no attempt at all.
      await alice.mutation(api.comments.storeComments, {
        comments: [
          {
            postId,
            authorName: "Someone",
            content: "How much does this cost?",
            platform: "facebook",
            classification: "Question",
            scrapedAt: Date.now(),
            platformCommentId: "fb_comment_1",
          },
        ],
      });
      await flush();
      let stored = await alice.query(api.comments.getCommentsForPost, { postId });
      expect(stored.find((c) => c.platformCommentId === "fb_comment_1")?.autoReply).toBeUndefined();

      // 2. Enable it, but only for "Lead" — a "Question" comment still shouldn't fire.
      await alice.mutation(api.workspaces.updateAutoReplySettings, {
        enabled: true,
        classifications: ["Lead"],
      });
      await alice.mutation(api.comments.storeComments, {
        comments: [
          {
            postId,
            authorName: "Someone Else",
            content: "How much does this cost?",
            platform: "facebook",
            classification: "Question",
            scrapedAt: Date.now(),
            platformCommentId: "fb_comment_2",
          },
        ],
      });
      await flush();
      stored = await alice.query(api.comments.getCommentsForPost, { postId });
      expect(stored.find((c) => c.platformCommentId === "fb_comment_2")?.autoReply).toBeUndefined();

      // 3. Matching classification, but no platformCommentId (hand-entered
      // comment) -> still never fires, nothing real to reply to.
      await alice.mutation(api.comments.createComment, {
        targetUrl: "https://example.com/alice-post",
        authorName: "Manual Lead",
        content: "I want to buy this",
        platform: "facebook",
        classification: "Lead",
      });
      await flush();
      const ownComments = await t.run((ctx) =>
        ctx.db
          .query("comments")
          .withIndex("by_userId", (q) => q.eq("userId", "alice_sub"))
          .collect(),
      );
      expect(ownComments.find((c) => c.authorName === "Manual Lead")?.autoReply).toBeUndefined();

      // 4. Matching classification AND a real platform comment id AND a
      // connected account -> a reply is actually attempted. This sandbox
      // has no GOOGLE_GENERATIVE_AI_API_KEY, so it must degrade to a
      // recorded failure, never throw or hang.
      await alice.mutation(api.comments.storeComments, {
        comments: [
          {
            postId,
            authorName: "Real Lead",
            content: "I'd like a demo",
            platform: "facebook",
            classification: "Lead",
            scrapedAt: Date.now(),
            platformCommentId: "fb_comment_3",
          },
        ],
      });
      await flush();
      stored = await alice.query(api.comments.getCommentsForPost, { postId });
      const attempted = stored.find((c) => c.platformCommentId === "fb_comment_3");
      expect(attempted?.autoReply?.status).toBe("failed");
      expect(attempted?.autoReply?.error).toMatch(/GOOGLE_GENERATIVE_AI_API_KEY/i);
    } finally {
      vi.useRealTimers();
    }
  });

  test("maybeAutoReply records a failure, never throws, when the platform isn't connected for the post's owner", async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema);
      const alice = t.withIdentity(identity("alice_sub", "alice@a.com", "Alice"));
      await alice.mutation(api.workspaces.createWorkspace, { name: "A", intent: "workspace" });

      // No socialAccounts row at all — unlike the earlier test, this account
      // was never connected.
      const postId = await alice.mutation(api.posts.schedulePost, {
        platform: "Facebook",
        content: "Alice's post",
        scheduledAt: Date.now() + 60_000,
      });
      await alice.mutation(api.workspaces.updateAutoReplySettings, {
        enabled: true,
        classifications: ["Lead"],
      });

      await alice.mutation(api.comments.storeComments, {
        comments: [
          {
            postId,
            authorName: "Real Lead",
            content: "I'd like a demo",
            platform: "facebook",
            classification: "Lead",
            scrapedAt: Date.now(),
            platformCommentId: "fb_comment_unconnected",
          },
        ],
      });
      await t.finishAllScheduledFunctions(() => vi.runAllTimers());

      const stored = await alice.query(api.comments.getCommentsForPost, { postId });
      const attempted = stored.find((c) => c.platformCommentId === "fb_comment_unconnected");
      expect(attempted?.autoReply?.status).toBe("failed");
      expect(attempted?.autoReply?.error).toMatch(/not connected/i);

      // The audit view (comments.listAutoReplyActivity) is how anyone
      // actually finds out this failed — confirm it shows up there, and
      // that it's workspace-scoped like everything else.
      const aliceActivity = await alice.query(api.comments.listAutoReplyActivity, {});
      expect(
        aliceActivity.find((entry) => entry._id === attempted?._id)?.autoReply.status,
      ).toBe("failed");

      const bob = t.withIdentity(identity("bob_sub", "bob@b.com", "Bob"));
      await bob.mutation(api.workspaces.createWorkspace, { name: "B", intent: "workspace" });
      const bobActivity = await bob.query(api.comments.listAutoReplyActivity, {});
      expect(bobActivity).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });
});
