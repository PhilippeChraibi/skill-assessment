import { describe, it, expect } from "vitest";
import { computeIntegrity, computeBurstinessScore } from "../integrity-service";

const makeAnswer = (overrides: Record<string, unknown> = {}) => ({
  id: "a1",
  sessionId: "s1",
  questionId: "q1",
  rawAnswer: null,
  selectedOptions: [],
  autoScore: null,
  llmScore: null,
  finalScore: 5,
  llmFeedback: null,
  llmScoringData: null,
  timeSpentSeconds: 120,
  keystrokeCadenceData: null,
  pastedCharCount: 0,
  focusLossCount: 0,
  focusLossDuration: 0,
  submittedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("computeIntegrity", () => {
  it("returns PASS with no flags for clean answers", () => {
    const answers = [makeAnswer(), makeAnswer({ id: "a2", questionId: "q2" })];
    const result = computeIntegrity(answers as any, 600);

    expect(result.integrityScore).toBe(0);
    expect(result.flags).toHaveLength(0);
    expect(result.recommendation).toBe("PASS");
  });

  it("flags excessive focus loss", () => {
    const answers = [
      makeAnswer({ focusLossCount: 10, focusLossDuration: 200 }),
      makeAnswer({ id: "a2", questionId: "q2", focusLossCount: 8, focusLossDuration: 150 }),
    ];
    const result = computeIntegrity(answers as any, 600); // 350/600 = 58% focus loss

    expect(result.flags.some((f) => f.type === "FOCUS_LOSS")).toBe(true);
    expect(result.integrityScore).toBeGreaterThan(0);
  });

  it("flags large paste events", () => {
    const answers = [
      makeAnswer({
        rawAnswer: "This is a pasted answer with a lot of content that was copied from somewhere else",
        pastedCharCount: 70,
      }),
    ];
    const result = computeIntegrity(answers as any, 300);

    expect(result.flags.some((f) => f.type === "PASTE_DETECTED")).toBe(true);
  });

  it("flags missing keystroke data for substantial answers", () => {
    const answers = [
      makeAnswer({
        rawAnswer: "This answer has enough words to be suspicious if no keystrokes were recorded at all",
        keystrokeCadenceData: [],
      }),
    ];
    const result = computeIntegrity(answers as any, 300);

    expect(result.flags.some((f) => f.type === "KEYSTROKE_ANOMALY")).toBe(true);
  });

  it("flags unnaturally fast typing", () => {
    // 200 words in 30 seconds = 400 WPM
    const longAnswer = Array(200).fill("word").join(" ");
    const answers = [
      makeAnswer({
        rawAnswer: longAnswer,
        timeSpentSeconds: 30,
      }),
    ];
    const result = computeIntegrity(answers as any, 300);

    expect(result.flags.some((f) => f.type === "FAST_ANSWER")).toBe(true);
  });

  it("flags AI suspicion from LLM scoring data", () => {
    const answers = [
      makeAnswer({
        llmScoringData: {
          score: 8,
          flags: ["possible_ai_generated"],
        },
      }),
    ];
    const result = computeIntegrity(answers as any, 300);

    expect(result.flags.some((f) => f.type === "AI_SUSPICION")).toBe(true);
  });

  it("recommends REVIEW for moderate flags", () => {
    const answers = [
      makeAnswer({
        focusLossCount: 10,
        focusLossDuration: 200,
        rawAnswer: Array(200).fill("word").join(" "),
        timeSpentSeconds: 30, // fast answer
        pastedCharCount: 500, // paste detected
      }),
    ];
    const result = computeIntegrity(answers as any, 600);

    expect(["REVIEW", "FLAG"]).toContain(result.recommendation);
  });

  it("recommends FLAG for many severe flags", () => {
    const longAnswer = Array(200).fill("word").join(" ");
    const answers = [
      makeAnswer({
        rawAnswer: longAnswer,
        timeSpentSeconds: 20,
        pastedCharCount: 900,
        focusLossCount: 20,
        focusLossDuration: 400,
        keystrokeCadenceData: [],
        llmScoringData: { flags: ["possible_ai_generated"] },
      }),
    ];
    const result = computeIntegrity(answers as any, 500);

    expect(result.integrityScore).toBeGreaterThan(0.5);
  });

  it("caps integrityScore at 1.0", () => {
    const answers = Array(10).fill(null).map((_, i) =>
      makeAnswer({
        id: `a${i}`,
        questionId: `q${i}`,
        rawAnswer: Array(200).fill("word").join(" "),
        timeSpentSeconds: 10,
        pastedCharCount: 1000,
        focusLossCount: 50,
        focusLossDuration: 500,
        keystrokeCadenceData: [],
        llmScoringData: { flags: ["possible_ai_generated"] },
      }),
    );
    const result = computeIntegrity(answers as any, 100);

    expect(result.integrityScore).toBeLessThanOrEqual(1.0);
  });
});

describe("computeBurstinessScore", () => {
  it("computes stats for normal text", () => {
    const text = "This is a short sentence. Here is a much longer sentence with many more words in it. Short again.";
    const stats = computeBurstinessScore(text);

    expect(stats.burstiness).toBeGreaterThan(0);
    expect(stats.typeTokenRatio).toBeGreaterThan(0);
    expect(stats.typeTokenRatio).toBeLessThanOrEqual(1);
  });

  it("returns low burstiness for uniform sentences", () => {
    const text = "Each sentence has five words. Each sentence has five words. Each sentence has five words.";
    const stats = computeBurstinessScore(text);

    expect(stats.burstiness).toBeLessThan(0.2);
  });

  it("returns high burstiness for varied sentences", () => {
    const text = "Short. This is a moderately long sentence with several words. Yes. Here we have an extraordinarily lengthy sentence that goes on and on with many words.";
    const stats = computeBurstinessScore(text);

    expect(stats.burstiness).toBeGreaterThan(0.5);
  });

  it("handles single sentence", () => {
    const stats = computeBurstinessScore("Just one sentence here");
    expect(stats.burstiness).toBe(0);
  });
});
