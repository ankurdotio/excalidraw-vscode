import { describe, expect, it } from "vitest";
import { getFrameBlockingReason } from "../../src/embedHeaders";

describe("getFrameBlockingReason", () => {
  it("detects X-Frame-Options deny and same-origin policies", () => {
    expect(getFrameBlockingReason({ "X-Frame-Options": "DENY" })).toBe(
      "x-frame-options"
    );
    expect(getFrameBlockingReason({ "x-frame-options": "SAMEORIGIN" })).toBe(
      "x-frame-options"
    );
  });

  it("detects restrictive frame-ancestors policies", () => {
    expect(
      getFrameBlockingReason({
        "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
      })
    ).toBe("frame-ancestors");
    expect(
      getFrameBlockingReason({
        "Content-Security-Policy": "frame-ancestors 'self' https://example.com",
      })
    ).toBe("frame-ancestors");
  });

  it("does not flag policies that allow arbitrary webview ancestors", () => {
    expect(
      getFrameBlockingReason({
        "content-security-policy": "frame-ancestors https:; default-src 'self'",
      })
    ).toBeUndefined();
    expect(
      getFrameBlockingReason({
        "content-security-policy": "frame-ancestors http:",
      })
    ).toBe("frame-ancestors");
    expect(
      getFrameBlockingReason({
        "X-Frame-Options": "DENY",
        "Content-Security-Policy": "frame-ancestors https:",
      })
    ).toBeUndefined();
    expect(
      getFrameBlockingReason({
        "content-security-policy": "default-src 'self'",
      })
    ).toBeUndefined();
    expect(getFrameBlockingReason({})).toBeUndefined();
  });

  it("treats multiple enforced policies as restrictive if any blocks framing", () => {
    expect(
      getFrameBlockingReason({
        "content-security-policy": [
          "frame-ancestors https:",
          "frame-ancestors 'none'",
        ],
      })
    ).toBe("frame-ancestors");
  });
});
