import { describe, expect, it } from "vitest";
import { parseRedditHandle } from "@/lib/validation/reddit-handle";
import { roastRequestSchema } from "@/lib/validation/input";
import { prepareSubmission, splitItems, cleanText } from "@/lib/validation/prepare";

describe("parseRedditHandle", () => {
  it.each([
    ["spez", "spez"],
    ["u/spez", "spez"],
    ["/u/Some_User-1", "Some_User-1"],
    ["@spez", "spez"],
    ["https://www.reddit.com/user/spez/", "spez"],
    ["reddit.com/u/spez", "spez"],
    ["https://old.reddit.com/user/spez/comments/", "spez"],
    ["  spez  ", "spez"],
  ])("accepts %s", (input, expected) => {
    expect(parseRedditHandle(input)).toEqual({ ok: true, handle: expected });
  });

  it.each([
    "",
    "ab",
    "this_name_is_way_too_long_for_reddit",
    "bad name",
    "name!",
    "https://example.com/user/spez",
    "https://evilreddit.com/user/spez",
    "https://www.reddit.com/r/programming",
    "https://www.reddit.com/user/",
    "javascript:alert(1)",
    "<script>",
  ])("rejects %s", (input) => {
    expect(parseRedditHandle(input).ok).toBe(false);
  });
});

describe("roastRequestSchema", () => {
  const base = { intensity: "brutal", consent: true, content: "I post about index funds every single day and I'm not sorry." };
  it("accepts a valid request", () => {
    const r = roastRequestSchema.safeParse({ ...base, handle: "u/spez" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.handle).toBe("spez");
  });
  it("treats empty handle as null", () => {
    const r = roastRequestSchema.safeParse({ ...base, handle: "" });
    expect(r.success && r.data.handle).toBe(null);
  });
  it("rejects malformed handle", () => {
    expect(roastRequestSchema.safeParse({ ...base, handle: "not a user!" }).success).toBe(false);
  });
  it("requires consent", () => {
    expect(roastRequestSchema.safeParse({ ...base, consent: false }).success).toBe(false);
  });
  it("rejects insufficient input", () => {
    expect(roastRequestSchema.safeParse({ ...base, content: "hi" }).success).toBe(false);
  });
  it("rejects over-limit content", () => {
    expect(roastRequestSchema.safeParse({ ...base, content: "a".repeat(8001) }).success).toBe(false);
  });
  it("rejects unknown intensity", () => {
    expect(roastRequestSchema.safeParse({ ...base, intensity: "nuclear" }).success).toBe(false);
  });
});

describe("prepareSubmission", () => {
  it("splits on separators and dedupes", () => {
    const sub = prepareSubmission({ handle: null, bio: "", context: "", content: "One post here.\n\n---\n\nOne post here!\n\nAnother one." });
    expect(sub.items).toEqual(["One post here.", "Another one."]);
    expect(sub.stats.duplicatesRemoved).toBe(1);
  });
  it("strips zero-width and control characters", () => {
    expect(cleanText("he​llo\u0007 world")).toBe("hello world");
  });
  it("falls back to lines when there are no blank-line separators", () => {
    expect(splitItems("a line\nanother line")).toEqual(["a line", "another line"]);
  });
  it("caps forwarded size", () => {
    const content = Array.from({ length: 200 }, (_, i) => `Post number ${i} ` + "x".repeat(100)).join("\n\n");
    const sub = prepareSubmission({ handle: null, bio: "", context: "", content });
    expect(sub.stats.truncated).toBe(true);
    expect(sub.items.join("").length).toBeLessThanOrEqual(6000);
  });
});
