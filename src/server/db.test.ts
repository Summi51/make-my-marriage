import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("connectToDatabase", () => {
  let server: MongoMemoryServer | undefined;

  afterEach(async () => {
    await mongoose.disconnect();
    delete (globalThis as { mongooseConnection?: unknown }).mongooseConnection;
    await server?.stop();
    server = undefined;
    delete process.env.MONGODB_URI;
  });

  it("connects to an isolated test database and reuses the connection", async () => {
    server = await MongoMemoryServer.create();
    process.env.MONGODB_URI = server.getUri();
    vi.resetModules();
    const { connectToDatabase } = await import("./database-connection");

    const first = await connectToDatabase();
    const second = await connectToDatabase();

    expect(first.connection.readyState).toBe(1);
    expect(second).toBe(first);
    expect(first.connection.name).toBeTruthy();
  });
});
