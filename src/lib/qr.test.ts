import { describe, expect, it } from "vitest";
import { qrMatrix, qrSvg } from "./qr";

describe("wedding website QR", () => {
  it("draws a quiet-zone code for an Amplify public URL", () => {
    const url = "https://dev.debru5zwxk5qm.amplifyapp.com/w/sara-weel-23102026";
    const matrix = qrMatrix(url);
    expect(matrix.length).toBe(matrix[0].length);
    expect(matrix.length).toBeGreaterThanOrEqual(37);
    expect(qrSvg(url)).toContain(
      `viewBox="0 0 ${matrix.length} ${matrix.length}"`,
    );
  });

  it("uses the current host for localhost and Amplify without a fixed domain", () => {
    const local = qrMatrix("http://localhost:3000/w/sara-weel-23102026");
    const amplify = qrMatrix(
      "https://dev.debru5zwxk5qm.amplifyapp.com/w/sara-weel-23102026",
    );
    expect(local).not.toEqual(amplify);
  });

  it("rejects a URL that cannot fit version 5", () => {
    expect(() => qrMatrix("https://example.com/" + "a".repeat(120))).toThrow(
      /too long/i,
    );
  });

  it("counts UTF-8 bytes, not characters, when a URL is too long", () => {
    expect(() => qrMatrix("https://example.com/" + "é".repeat(60))).toThrow(
      /too long/i,
    );
  });
});
