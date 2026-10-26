import { describe, expect, it } from "vitest";

import { readServerEnv } from "./env-validation";

describe("readServerEnv", () => {
  it("accepts a MongoDB connection string", () => {
    expect(
      readServerEnv({ MONGODB_URI: "mongodb://127.0.0.1:27017/app" }),
    ).toEqual({
      MONGODB_URI: "mongodb://127.0.0.1:27017/app",
    });
  });

  it("rejects a missing connection string", () => {
    expect(() => readServerEnv({})).toThrow(
      "Invalid server environment: MONGODB_URI is required.",
    );
  });

  it("rejects a connection string that is not MongoDB", () => {
    expect(() =>
      readServerEnv({ MONGODB_URI: "postgres://localhost/app" }),
    ).toThrow(
      "Invalid server environment: MONGODB_URI must be a MongoDB connection string.",
    );
  });
});
