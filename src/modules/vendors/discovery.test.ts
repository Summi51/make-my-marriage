import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { discoverVendors } from "./discovery";

describe("vendor discovery", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does not contact Google without an owner-configured key", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(
      discoverVendors({ category: "FLORIST", query: "Jaipur" }, {}),
    ).rejects.toMatchObject({ code: "NOT_CONFIGURED", status: 503 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses a narrow server-side field mask and returns no secret", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "server-secret");
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          places: [
            {
              id: "place_123",
              displayName: { text: "Bloom" },
              formattedAddress: "Jaipur",
              rating: 4.7,
              userRatingCount: 12,
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const results = await discoverVendors(
      { category: "FLORIST", query: "Jaipur" },
      {},
    );
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, request] = fetcher.mock.calls[0];
    expect(url).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(request.headers["X-Goog-Api-Key"]).toBe("server-secret");
    expect(request.headers["X-Goog-FieldMask"]).not.toContain("*");
    expect(results[0]).toMatchObject({
      name: "Bloom",
      address: "Jaipur",
      rating: 4.7,
    });
    expect(JSON.stringify(results)).not.toContain("server-secret");
  });
});
