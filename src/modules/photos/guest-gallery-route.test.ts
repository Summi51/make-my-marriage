import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
vi.mock("@/modules/photos/guest-gallery", () => ({
  guestGallery: vi.fn(),
  guestGalleryInfo: vi.fn(),
}));
vi.mock("@/modules/photos/use-cases", () => ({
  listPhotos: vi.fn(),
  reserveUpload: vi.fn(),
  confirmUpload: vi.fn(),
  uploadStagingFallback: vi.fn(),
}));
vi.mock("@/server/auth/rate-limit", () => ({ consumeLimit: vi.fn() }));
import { guestGallery, guestGalleryInfo } from "./guest-gallery";
import { consumeLimit } from "@/server/auth/rate-limit";
import { WeddingError } from "@/modules/wedding/errors";
import { GET } from "@/app/api/public/galleries/[token]/[[...action]]/route";
beforeEach(() => vi.resetAllMocks());
it("invalid tokens do not consume valid galleries' quotas", async () => {
  vi.mocked(guestGallery).mockRejectedValue(
    new WeddingError("NOT_FOUND", "Unavailable", 404),
  );
  const response = await GET(
    new NextRequest("http://localhost/api/public/galleries/invalid"),
    { params: Promise.resolve({ token: "invalid" }) },
  );
  expect(response.status).toBe(404);
  expect(consumeLimit).not.toHaveBeenCalled();
});
it("isolates read limits by resolved wedding rather than client input", async () => {
  vi.mocked(guestGalleryInfo).mockResolvedValue({} as never);
  for (const id of ["wedding-one", "wedding-two"]) {
    vi.mocked(guestGallery).mockResolvedValue({ _id: id } as never);
    const response = await GET(
      new NextRequest("http://localhost/api/public/galleries/token"),
      { params: Promise.resolve({ token: "token" }) },
    );
    expect(response.status).toBe(200);
    expect(consumeLimit).toHaveBeenCalledWith(
      `guest-gallery:reads:${id}`,
      3000,
    );
  }
});
