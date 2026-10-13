import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
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
import { Event } from "@/modules/events/models";
import { Vendor } from "./models";
import {
  archiveVendor,
  createVendor,
  getVendor,
  listVendors,
  restoreVendor,
  updateVendor,
} from "./use-cases";

describe("wedding vendors", () => {
  let server: MongoMemoryServer;
  const weddingA = new mongoose.Types.ObjectId().toString();
  const weddingB = new mongoose.Types.ObjectId().toString();

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    vi.stubEnv("MONGODB_URI", server.getUri());
    await mongoose.connect(server.getUri());
    await Promise.all([Vendor.init(), Event.init()]);
  }, 60000);
  afterAll(async () => {
    await mongoose.disconnect();
    await server?.stop();
  });
  beforeEach(async () => {
    await Promise.all([Vendor.deleteMany({}), Event.deleteMany({})]);
  });

  const input = {
    name: "Royal Flowers",
    category: "FLORIST" as const,
    eventIds: [],
    totalAgreedCostPaise: 250000,
  };

  it("scopes reads, updates and archives to the current wedding", async () => {
    const saved = await createVendor(weddingA, input);
    expect((await listVendors(weddingB, { page: 1, limit: 50 })).data).toEqual(
      [],
    );
    await expect(getVendor(weddingB, saved.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(
      updateVendor(weddingB, saved.id, { name: "Stolen" }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(archiveVendor(weddingB, saved.id)).rejects.toMatchObject({
      status: 404,
    });
    const ceremony = await Event.create({
      weddingId: weddingA,
      name: "Walima",
      startsAt: new Date(),
    });
    const updated = await updateVendor(weddingA, saved.id, {
      name: "New Flowers",
      eventIds: [String(ceremony._id)],
    });
    expect(updated.name).toBe("New Flowers");
    expect(updated.totalAgreedCostPaise).toBe(250000);
    expect(updated.eventIds).toEqual([String(ceremony._id)]);
    const stored = await Vendor.findById(saved.id).lean();
    expect(stored?.eventIds?.[0]).toBeInstanceOf(mongoose.Types.ObjectId);
    await archiveVendor(weddingA, saved.id);
    expect((await listVendors(weddingA, { page: 1, limit: 50 })).data).toEqual(
      [],
    );
    expect(
      (
        await listVendors(weddingA, {
          page: 1,
          limit: 50,
          includeArchived: true,
        })
      ).data,
    ).toHaveLength(1);
  });

  it("rejects another wedding's ceremony and duplicate event links", async () => {
    const event = await Event.create({
      weddingId: weddingB,
      name: "Mehendi",
      startsAt: new Date(),
    });
    await expect(
      createVendor(weddingA, { ...input, eventIds: [String(event._id)] }),
    ).rejects.toMatchObject({ status: 400 });
    const own = await Event.create({
      weddingId: weddingA,
      name: "Sangeet",
      startsAt: new Date(),
    });
    await expect(
      createVendor(weddingA, {
        ...input,
        eventIds: [String(own._id), String(own._id)],
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("restores only an archived vendor in the current wedding", async () => {
    const saved = await createVendor(weddingA, input);
    await expect(restoreVendor(weddingA, saved.id)).rejects.toMatchObject({
      status: 404,
    });
    await archiveVendor(weddingA, saved.id);
    await expect(restoreVendor(weddingB, saved.id)).rejects.toMatchObject({
      status: 404,
    });
    const restored = await restoreVendor(weddingA, saved.id);
    expect(restored.archivedAt).toBeNull();
    expect(
      (await listVendors(weddingA, { page: 1, limit: 50 })).data,
    ).toHaveLength(1);
  });
});
