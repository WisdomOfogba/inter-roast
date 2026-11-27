import { describe, expect, it } from "vitest";
import { generateLocalRoast, analyze } from "@/lib/roast-engine";
import { prepareSubmission } from "@/lib/validation/prepare";
import { roastOutputSchema, containsBlockedContent } from "@/lib/validation/roast-output";
import { SAMPLES } from "@/lib/samples";
import { INTENSITIES } from "@/types/roast";

const prep = (content: string, bio = "") => prepareSubmission({ handle: "tester", bio, content, context: "" });

describe("local roast engine", () => {
  it("produces schema-valid output for every sample and intensity", () => {
    for (const [name, content] of Object.entries(SAMPLES)) {
      for (const intensity of INTENSITIES) {
        const r = generateLocalRoast(prep(content), intensity);
        const parsed = roastOutputSchema.safeParse(r);
        if (!parsed.success) throw new Error(`${name}/${intensity}: ${JSON.stringify(parsed.error.issues)}`);
        expect(r.roastIntensity).toBe(intensity);
        expect(containsBlockedContent(r)).toBe(false);
      }
    }
  });

  it("picks archetypes that match the content", () => {
    expect(generateLocalRoast(prep(SAMPLES.tech), "brutal").personalityTitle).toBe("The Argument Specialist");
    expect(generateLocalRoast(prep(SAMPLES.sparse), "brutal").personalityTitle).toBe("The Certified Lurker");
    expect(generateLocalRoast(prep(SAMPLES.relationships), "brutal").personalityTitle).toMatch(/Therapist|Overthinker|Contradiction/);
  });

  it("is deterministic for identical input and varies across inputs", () => {
    const a = generateLocalRoast(prep(SAMPLES.finance), "savage");
    const b = generateLocalRoast(prep(SAMPLES.finance), "savage");
    const c = generateLocalRoast(prep(SAMPLES.entertainment), "savage");
    expect(a).toEqual(b);
    expect(a.mainRoast).not.toEqual(c.mainRoast);
  });

  it("intensity changes the actual writing, not just the label", () => {
    const p = generateLocalRoast(prep(SAMPLES.tech), "playful");
    const s = generateLocalRoast(prep(SAMPLES.tech), "savage");
    expect(p.mainRoast).not.toEqual(s.mainRoast);
    expect(p.observations).not.toEqual(s.observations);
    expect(s.roastScore).toBeGreaterThan(p.roastScore);
  });

  it("only quotes text that exists in the submission", () => {
    const sub = prep(SAMPLES.finance);
    const sig = analyze(sub);
    expect(sig.receipt).toBeTruthy();
    expect(SAMPLES.finance).toContain(sig.receipt!);
  });

  it("reports real counts", () => {
    const sig = analyze(prep("Actually no. Actually yes. Actually, maybe? I'm not sure."));
    expect(sig.markers.argue.hits["actually"]).toBe(3);
    expect(sig.questionMarks).toBe(1);
  });

  it("handles sparse input honestly", () => {
    const r = generateLocalRoast(prep(SAMPLES.sparse), "playful");
    expect(r.observations.join(" ")).toMatch(/word/);
    expect(r.mainRoast.length).toBeGreaterThan(80);
  });

  it("detects subreddits and topics", () => {
    const sig = analyze(prep(SAMPLES.finance));
    expect(sig.subreddits).toContain("r/personalfinance");
    expect(sig.topics[0].id).toBe("finance");
  });
});
