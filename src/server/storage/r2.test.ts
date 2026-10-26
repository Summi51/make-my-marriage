import { afterEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@aws-sdk/client-s3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@aws-sdk/client-s3")>()),
  S3Client: class {
    send = send;
  },
}));
import { objectExists } from "./r2";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe("R2 missing-object detection", () => {
  for (const status of [403, 500, 503]) {
    it(`treats HTTP ${status} as an error, not a deleted object`, async () => {
      for (const key of [
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET_NAME",
      ])
        vi.stubEnv(key, "isolated-test");
      send.mockRejectedValue({ $metadata: { httpStatusCode: status } });
      await expect(objectExists("photo")).rejects.toMatchObject({
        code: "STORAGE_UNAVAILABLE",
      });
    });
  }
  it("recognizes a definitive missing key", async () => {
    for (const key of [
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
    ])
      vi.stubEnv(key, "isolated-test");
    send.mockRejectedValue({ $metadata: { httpStatusCode: 404 } });
    await expect(objectExists("photo")).resolves.toBe(false);
  });
});
