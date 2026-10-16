import { describe, expect, it } from "vitest";
import { guestQrCardSvg, qrMatrix, qrSvg } from "./qr";

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

  it("supports long wedding slugs beyond version 5", () => {
    expect(
      qrMatrix(
        "https://dev.debru5zwxk5qm.amplifyapp.com/w/" +
          "a".repeat(210) +
          "#livestream",
      ).length,
    ).toBeGreaterThan(45);
  });

  it("supports multibyte URLs beyond the small encoder capacity", () => {
    expect(
      qrMatrix("https://example.com/" + "é".repeat(120)).length,
    ).toBeGreaterThan(45);
  });

  it("puts the couple's name on the downloadable guest card", () => {
    const url = "http://localhost:3000/gallery/Artd0MYExampleTokenValueHere";
    const card = guestQrCardSvg(url, "Sara & weel");
    const code = qrSvg(url);
    expect(card).toContain("Sara &amp; weel");
    expect(card).toContain("SHARE THE MEMORIES");
    expect(card).toContain("No account needed.");
    expect(card).toContain(`<rect x="4" y="4" width="1" height="1"/>`);
    expect(code).toContain(`<rect x="4" y="4" width="1" height="1"/>`);
    expect(card).not.toContain("<script");
  });

  it("escapes a couple name so it cannot break the card markup", () => {
    const card = guestQrCardSvg(
      "http://localhost:3000/gallery/Artd0MYExampleTokenValueHere",
      `A <script> & B`,
    );
    expect(card).toContain("A &lt;script&gt; &amp; B");
    expect(card).not.toContain("<script>");
  });

  it("prints the WhatsApp caption on the card so the picture keeps the message", () => {
    const url = "http://localhost:3000/gallery/Artd0MYExampleTokenValueHere";
    const card = guestQrCardSvg(
      url,
      "Sara & weel",
      `Share the memories from Sara & weel.\n\nOpen this private album to view and add wedding photos. No account is needed.\n\n${url}`,
    );
    expect(card).toContain("Share the memories from Sara &amp; weel.");
    expect(card).toContain("this private album to view and add wedding");
    expect(card).toContain(escapeForCard(url));
    expect(card).not.toContain("<script");
  });
});

function escapeForCard(value: string) {
  return value.replace(/&/g, "&amp;");
}
