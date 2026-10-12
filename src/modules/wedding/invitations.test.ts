import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));

import { User } from "@/modules/auth/models";
import { InvitationEmailError } from "@/server/email/member-invitation";
import {
  acceptMemberInvitation,
  createMemberInvitation,
  getPublicMemberInvitation,
  revokeMemberInvitation,
} from "./invitations";
import { Wedding, WeddingMemberInvitation, WeddingMembership } from "./models";

describe("wedding member invitations", () => {
  let server: MongoMemoryReplSet;
  let weddingId: string;
  let ownerId: string;
  let invitationToken = "";
  const deliver = vi.fn(async (message: { acceptUrl: string }) => {
    invitationToken = message.acceptUrl.split("/").at(-1)!;
  });

  beforeAll(async () => {
    server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    vi.stubEnv("MONGODB_URI", server.getUri());
    vi.stubEnv(
      "MEMBER_INVITATION_SECRET",
      "a-test-secret-that-is-at-least-32-characters",
    );
    await mongoose.connect(server.getUri());
    await Promise.all([
      User.init(),
      Wedding.init(),
      WeddingMembership.init(),
      WeddingMemberInvitation.init(),
    ]);
  }, 60_000);

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Wedding.deleteMany({}),
      WeddingMembership.deleteMany({}),
      WeddingMemberInvitation.deleteMany({}),
    ]);
    deliver.mockClear();
    invitationToken = "";
    const owner = await User.create({
      name: "Ayesha Qureshi",
      email: "owner@example.com",
      emailNormalized: "owner@example.com",
      passwordHash: "unused",
    });
    ownerId = String(owner._id);
    const wedding = await Wedding.create({
      brideName: "Meher",
      groomName: "Zayan",
      weddingDate: "2027-12-18",
      timeZone: "Asia/Karachi",
      website: { slug: "meher-zayan" },
      gallery: { tokenHash: "gallery-token" },
      createdByUserId: owner._id,
    });
    weddingId = String(wedding._id);
    await WeddingMembership.create({
      userId: owner._id,
      weddingId: wedding._id,
      role: "ADMIN",
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    delete (globalThis as { mongooseConnection?: unknown }).mongooseConnection;
    await server?.stop();
    vi.unstubAllEnvs();
  });

  async function invite(
    email = "manager@example.com",
    role: "ADMIN" | "MANAGER" = "MANAGER",
  ) {
    return createMemberInvitation(
      {
        weddingId,
        invitedByUserId: ownerId,
        inviterName: "Ayesha Qureshi",
        brideName: "Meher",
        groomName: "Zayan",
        weddingDate: "2027-02-14",
      },
      { email, role },
      "http://localhost:3000",
      deliver,
    );
  }

  it("stores only the token hash and exposes only allowed public details", async () => {
    const created = await invite();
    const stored = await WeddingMemberInvitation.findById(created.id).lean();
    expect(stored?.tokenHash).not.toContain(invitationToken);
    expect(invitationToken).toHaveLength(43);
    await expect(
      getPublicMemberInvitation(invitationToken),
    ).resolves.toMatchObject({
      state: "PENDING",
      email: "manager@example.com",
      role: "MANAGER",
      accountExists: false,
      wedding: { brideName: "Meher", groomName: "Zayan" },
    });
    await User.create({
      name: "Registered Guest",
      email: "registered@example.com",
      emailNormalized: "registered@example.com",
      passwordHash: "unused",
    });
    await invite("registered@example.com");
    await expect(
      getPublicMemberInvitation(invitationToken),
    ).resolves.toMatchObject({
      email: "registered@example.com",
      accountExists: true,
    });
    expect(deliver).toHaveBeenLastCalledWith(
      expect.objectContaining({ accountExists: true }),
    );
  });

  it("rejects duplicate pending invitations and existing members", async () => {
    await invite();
    await expect(invite()).rejects.toMatchObject({
      code: "INVITATION_PENDING",
    });
    await expect(invite("owner@example.com")).rejects.toMatchObject({
      code: "ALREADY_MEMBER",
    });
  });

  it("does not email an existing user who already belongs to another wedding", async () => {
    const otherUser = await User.create({
      name: "Other Wedding Member",
      email: "other-wedding@example.com",
      emailNormalized: "other-wedding@example.com",
      passwordHash: "unused",
    });
    const otherWedding = await Wedding.create({
      brideName: "Nadia",
      groomName: "Yusuf",
      weddingDate: "2028-01-15",
      timeZone: "Asia/Karachi",
      website: { slug: "nadia-yusuf" },
      gallery: { tokenHash: "other-gallery-token" },
      createdByUserId: otherUser._id,
    });
    await WeddingMembership.create({
      userId: otherUser._id,
      weddingId: otherWedding._id,
      role: "ADMIN",
    });
    await expect(invite(otherUser.email)).rejects.toMatchObject({
      code: "ALREADY_HAS_WEDDING",
    });
    expect(deliver).not.toHaveBeenCalled();
    expect(await WeddingMemberInvitation.countDocuments()).toBe(0);
  });

  it("accepts with the invited email exactly once", async () => {
    await invite();
    const manager = await User.create({
      name: "Rahul",
      email: "manager@example.com",
      emailNormalized: "manager@example.com",
      passwordHash: "unused",
    });
    await expect(
      acceptMemberInvitation(invitationToken, String(manager._id)),
    ).resolves.toMatchObject({ weddingId, role: "MANAGER" });
    expect(
      await WeddingMembership.findOne({ userId: manager._id }).lean(),
    ).toMatchObject({
      role: "MANAGER",
    });
    await expect(
      acceptMemberInvitation(invitationToken, String(manager._id)),
    ).rejects.toMatchObject({ code: "INVITATION_ALREADY_ACCEPTED" });
  });

  it("accepts an Admin-role invitation", async () => {
    await invite("admin@example.com", "ADMIN");
    const admin = await User.create({
      name: "Admin Invitee",
      email: "admin@example.com",
      emailNormalized: "admin@example.com",
      passwordHash: "unused",
    });
    await expect(
      acceptMemberInvitation(invitationToken, String(admin._id)),
    ).resolves.toMatchObject({ weddingId, role: "ADMIN" });
  });

  it("allows repeated revocation but never revokes another wedding's invite", async () => {
    const created = await invite();
    await expect(
      revokeMemberInvitation(weddingId, created.id),
    ).resolves.toMatchObject({
      status: "REVOKED",
    });
    await expect(
      revokeMemberInvitation(weddingId, created.id),
    ).resolves.toMatchObject({
      status: "REVOKED",
    });
    await expect(
      revokeMemberInvitation(String(new mongoose.Types.ObjectId()), created.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("allows a fresh invite after revocation and keeps the old link invalid", async () => {
    const old = await invite();
    const oldToken = invitationToken;
    await revokeMemberInvitation(weddingId, old.id);
    const current = await invite();
    expect(current.id).not.toBe(old.id);
    await expect(getPublicMemberInvitation(oldToken)).rejects.toMatchObject({
      code: "INVITATION_REVOKED",
    });
    expect(
      await WeddingMemberInvitation.countDocuments({
        weddingId,
        emailNormalized: "manager@example.com",
        status: "PENDING",
      }),
    ).toBe(1);
  });

  it("rejects the wrong account and revoked links", async () => {
    const created = await invite();
    const wrong = await User.create({
      name: "Wrong Account",
      email: "wrong@example.com",
      emailNormalized: "wrong@example.com",
      passwordHash: "unused",
    });
    await expect(
      acceptMemberInvitation(invitationToken, String(wrong._id)),
    ).rejects.toMatchObject({ code: "INVITATION_EMAIL_MISMATCH" });
    await revokeMemberInvitation(weddingId, created.id);
    await expect(
      getPublicMemberInvitation(invitationToken),
    ).rejects.toMatchObject({
      code: "INVITATION_REVOKED",
    });
  });

  it("removes the pending record when email delivery fails", async () => {
    await expect(
      createMemberInvitation(
        {
          weddingId,
          invitedByUserId: ownerId,
          inviterName: "Ayesha",
          brideName: "Meher",
          groomName: "Zayan",
          weddingDate: "2027-02-14",
        },
        { email: "failure@example.com", role: "MANAGER" },
        "http://localhost:3000",
        async () => {
          throw new Error("provider down");
        },
      ),
    ).rejects.toMatchObject({ code: "EMAIL_DELIVERY_FAILED" });
    expect(await WeddingMemberInvitation.countDocuments()).toBe(0);
  });

  it("explains when the wedding email sender is not verified", async () => {
    await expect(
      createMemberInvitation(
        {
          weddingId,
          invitedByUserId: ownerId,
          inviterName: "Ayesha",
          brideName: "Meher",
          groomName: "Zayan",
          weddingDate: "2027-02-14",
        },
        { email: "other@example.com", role: "MANAGER" },
        "http://localhost:3000",
        async () => {
          throw new InvitationEmailError(
            "Invitation email delivery failed.",
            "DOMAIN_NOT_VERIFIED",
          );
        },
      ),
    ).rejects.toMatchObject({
      code: "EMAIL_DELIVERY_FAILED",
      message:
        "The wedding email sender is not verified yet. Ask the site owner to finish email setup, then try again.",
    });
    expect(await WeddingMemberInvitation.countDocuments()).toBe(0);
  });

  it("does not leave a pending invitation when wedding email is in test mode", async () => {
    await expect(
      createMemberInvitation(
        {
          weddingId,
          invitedByUserId: ownerId,
          inviterName: "Ayesha",
          brideName: "Meher",
          groomName: "Zayan",
          weddingDate: "2027-02-14",
        },
        { email: "test@example.com", role: "MANAGER" },
        "http://localhost:3000",
        async () => {
          throw new InvitationEmailError("Test mode.", "TEST_MODE");
        },
      ),
    ).rejects.toMatchObject({
      code: "EMAIL_DELIVERY_FAILED",
      message:
        "Wedding email is still in test mode, so this invitation was not delivered.",
    });
    expect(await WeddingMemberInvitation.countDocuments()).toBe(0);
  });
});
