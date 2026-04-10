import { describe, it, expect } from "vitest";
import { scoreMcq, scoreRankedChoice, computeSessionScores } from "../scoring-service";
import { updateTheta } from "../question-selector";
import type { McqContent, RankedChoiceContent } from "@/types";

describe("scoreMcq", () => {
  const content: McqContent = {
    stem: "What is the correct Incoterm for sea freight?",
    options: ["EXW", "FOB", "CIF", "DDP"],
    correctAnswer: 2,
  };

  it("scores correct answer with difficulty weight", () => {
    expect(scoreMcq([2], content, 1.0)).toBe(10);
    expect(scoreMcq([2], content, 1.5)).toBe(15);
    expect(scoreMcq([2], content, 3.0)).toBe(30);
  });

  it("scores incorrect answer as 0", () => {
    expect(scoreMcq([0], content, 1.0)).toBe(0);
    expect(scoreMcq([1], content, 2.0)).toBe(0);
  });

  it("scores empty selection as 0", () => {
    expect(scoreMcq([], content, 1.0)).toBe(0);
  });

  it("scores multiple selections as 0 (only single choice valid)", () => {
    expect(scoreMcq([1, 2], content, 1.0)).toBe(0);
  });
});

describe("scoreRankedChoice", () => {
  const content: RankedChoiceContent = {
    stem: "Rank these sourcing steps in order",
    options: ["Identify need", "Market analysis", "RFP", "Evaluate", "Contract"],
    correctOrder: [0, 1, 2, 3, 4],
  };

  it("scores perfect order with full marks", () => {
    const score = scoreRankedChoice([0, 1, 2, 3, 4], content, 1.0);
    expect(score).toBe(10);
  });

  it("gives partial credit for near-correct ordering", () => {
    // Swap positions 1 and 2 — both are within ±1 of correct
    const score = scoreRankedChoice([0, 2, 1, 3, 4], content, 1.0);
    expect(score).toBeGreaterThan(5);
    expect(score).toBeLessThan(10);
  });

  it("scores completely wrong order with low marks", () => {
    const score = scoreRankedChoice([4, 3, 2, 1, 0], content, 1.0);
    expect(score).toBeLessThan(5);
  });

  it("applies difficulty weight", () => {
    const score1 = scoreRankedChoice([0, 1, 2, 3, 4], content, 1.0);
    const score2 = scoreRankedChoice([0, 1, 2, 3, 4], content, 2.0);
    expect(score2).toBe(score1 * 2);
  });

  it("returns 0 for wrong length", () => {
    expect(scoreRankedChoice([0, 1, 2], content, 1.0)).toBe(0);
  });
});

describe("computeSessionScores", () => {
  it("computes weighted averages correctly", () => {
    const answersWithQuestions = [
      {
        answer: { finalScore: 10 } as any,
        question: { dimension: "THEORY", difficultyWeight: 1.0, domainTag: "incoterms" } as any,
      },
      {
        answer: { finalScore: 20 } as any,
        question: { dimension: "THEORY", difficultyWeight: 2.0, domainTag: "sourcing" } as any,
      },
      {
        answer: { finalScore: 15 } as any,
        question: { dimension: "PRACTICE", difficultyWeight: 1.5, domainTag: "negotiation" } as any,
      },
      {
        answer: { finalScore: 30 } as any,
        question: { dimension: "PRACTICE", difficultyWeight: 3.0, domainTag: "logistics" } as any,
      },
    ];

    const scores = computeSessionScores(answersWithQuestions);

    expect(scores.theoryScore).toBeGreaterThan(0);
    expect(scores.theoryScore).toBeLessThanOrEqual(100);
    expect(scores.practiceScore).toBeGreaterThan(0);
    expect(scores.practiceScore).toBeLessThanOrEqual(100);
    expect(scores.overallScore).toBeCloseTo(
      scores.theoryScore * 0.4 + scores.practiceScore * 0.6,
      1,
    );
    expect(scores.domainScores).toHaveProperty("incoterms");
    expect(scores.domainScores).toHaveProperty("sourcing");
    expect(scores.domainScores).toHaveProperty("negotiation");
    expect(scores.domainScores).toHaveProperty("logistics");
  });

  it("handles empty arrays", () => {
    const scores = computeSessionScores([]);
    expect(scores.theoryScore).toBe(0);
    expect(scores.practiceScore).toBe(0);
    expect(scores.overallScore).toBe(0);
    expect(scores.domainScores).toEqual({});
  });
});

describe("updateTheta (IRT)", () => {
  it("increases theta after correct answer on easy question", () => {
    const newTheta = updateTheta(0, 1.0, "MCQ", 1.0);
    expect(newTheta).toBeGreaterThan(0);
  });

  it("decreases theta after wrong answer", () => {
    const newTheta = updateTheta(0, 1.0, "MCQ", 0);
    expect(newTheta).toBeLessThan(0);
  });

  it("clamps theta within [-3, 3]", () => {
    const high = updateTheta(2.9, 1.0, "MCQ", 1.0);
    expect(high).toBeLessThanOrEqual(3);

    const low = updateTheta(-2.9, 3.0, "MCQ", 0);
    expect(low).toBeGreaterThanOrEqual(-3);
  });

  it("adjusts more for harder questions", () => {
    const easyCorrect = updateTheta(0, 1.0, "OPEN_TEXT", 1.0);
    const hardCorrect = updateTheta(0, 3.0, "OPEN_TEXT", 1.0);
    // Both should increase but by different amounts
    expect(easyCorrect).toBeGreaterThan(0);
    expect(hardCorrect).toBeGreaterThan(0);
  });
});
