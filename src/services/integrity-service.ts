import { Answer } from "@/generated/prisma";
import { logger } from "@/lib/logger";
import type { IntegrityFlag } from "@/types";

const log = logger.child({ service: "integrity" });

// ─── INTEGRITY COMPUTATION ──────────────────────────────────────────────────────

interface IntegrityResult {
  integrityScore: number;
  flags: IntegrityFlag[];
  recommendation: "PASS" | "REVIEW" | "FLAG";
}

export function computeIntegrity(
  answers: Answer[],
  totalDurationSeconds: number,
): IntegrityResult {
  const flags: IntegrityFlag[] = [];

  // 1. Focus loss analysis (aggregated across all answers)
  const totalFocusLoss = answers.reduce((sum, a) => sum + a.focusLossDuration, 0);
  const totalFocusEvents = answers.reduce((sum, a) => sum + a.focusLossCount, 0);
  const focusLossRatio = totalDurationSeconds > 0 ? totalFocusLoss / totalDurationSeconds : 0;

  if (focusLossRatio > 0.2) {
    flags.push({
      type: "FOCUS_LOSS",
      detail: `${totalFocusEvents} focus-loss events, ${totalFocusLoss}s total (${Math.round(focusLossRatio * 100)}% of session)`,
    });
  }

  // 2. Paste detection per answer
  for (const answer of answers) {
    if (answer.pastedCharCount > 50 && answer.rawAnswer) {
      const pasteRatio = answer.pastedCharCount / answer.rawAnswer.length;
      if (pasteRatio > 0.5) {
        flags.push({
          type: "PASTE_DETECTED",
          questionId: answer.questionId,
          pastedChars: answer.pastedCharCount,
          detail: `${Math.round(pasteRatio * 100)}% of answer was pasted`,
        });
      }
    }
  }

  // 3. Keystroke cadence analysis for open-text answers
  for (const answer of answers) {
    if (!answer.rawAnswer || !answer.keystrokeCadenceData) continue;

    const cadence = answer.keystrokeCadenceData as number[];
    if (cadence.length === 0 && answer.rawAnswer.length > 20) {
      // No keystrokes but answer exists → likely pasted entirely
      flags.push({
        type: "KEYSTROKE_ANOMALY",
        questionId: answer.questionId,
        detail: "No keystroke data recorded for substantial text answer",
      });
      continue;
    }

    if (cadence.length < 5) continue;

    // Check for unnaturally uniform typing (bots/macros)
    const mean = cadence.reduce((a, b) => a + b, 0) / cadence.length;
    const variance = cadence.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / cadence.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0; // coefficient of variation

    // Natural typing typically has CV > 0.3; very uniform typing suggests automation
    if (cv < 0.15 && cadence.length > 20) {
      flags.push({
        type: "KEYSTROKE_ANOMALY",
        questionId: answer.questionId,
        detail: `Unusually uniform keystroke cadence (CV=${cv.toFixed(3)})`,
      });
    }
  }

  // 4. Suspicious answer speed (open-text/scenario)
  for (const answer of answers) {
    if (!answer.rawAnswer || !answer.timeSpentSeconds) continue;

    const wordCount = answer.rawAnswer.split(/\s+/).filter(Boolean).length;
    if (wordCount < 10) continue;

    // Average typing speed is ~40 WPM; reading + thinking adds time
    // Flag if answer speed exceeds 80 WPM (suspiciously fast)
    const wpm = (wordCount / answer.timeSpentSeconds) * 60;
    if (wpm > 80) {
      flags.push({
        type: "FAST_ANSWER",
        questionId: answer.questionId,
        detail: `${wordCount} words in ${answer.timeSpentSeconds}s (${Math.round(wpm)} WPM)`,
      });
    }
  }

  // 5. Check LLM-scored flags (AI suspicion from scoring service)
  for (const answer of answers) {
    if (!answer.llmScoringData) continue;
    const scoringData = answer.llmScoringData as Record<string, unknown>;
    const answerFlags = scoringData.flags as string[] | undefined;
    if (answerFlags?.includes("possible_ai_generated")) {
      flags.push({
        type: "AI_SUSPICION",
        questionId: answer.questionId,
        score: 0.7,
        reasoning: "Scoring model flagged as possibly AI-generated",
      });
    }
  }

  // Compute composite integrity score
  const integrityScore = computeCompositeScore(flags, answers.length);

  // Determine recommendation
  let recommendation: "PASS" | "REVIEW" | "FLAG";
  if (integrityScore > 0.7) {
    recommendation = "FLAG";
  } else if (integrityScore > 0.3) {
    recommendation = "REVIEW";
  } else {
    recommendation = "PASS";
  }

  log.info(
    { integrityScore, flagCount: flags.length, recommendation },
    "Integrity computed",
  );

  return { integrityScore, flags, recommendation };
}

function computeCompositeScore(flags: IntegrityFlag[], totalAnswers: number): number {
  if (flags.length === 0) return 0;

  // Weight each flag type
  const weights: Record<IntegrityFlag["type"], number> = {
    FOCUS_LOSS: 0.15,
    PASTE_DETECTED: 0.25,
    KEYSTROKE_ANOMALY: 0.2,
    FAST_ANSWER: 0.2,
    AI_SUSPICION: 0.3,
  };

  let score = 0;
  for (const flag of flags) {
    score += weights[flag.type] ?? 0.1;
  }

  // Normalize: more flags on more questions = higher score
  // But cap at 1.0
  return Math.min(1.0, score);
}

// ─── AI TEXT DETECTION ──────────────────────────────────────────────────────────

export function computeBurstinessScore(text: string): {
  burstiness: number;
  typeTokenRatio: number;
  fleschKincaid: number;
} {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length < 2) {
    return { burstiness: 0, typeTokenRatio: 1, fleschKincaid: 0 };
  }

  // Sentence length variance (burstiness)
  const lengths = sentences.map((s) => s.trim().split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length;
  const burstiness = Math.sqrt(variance) / mean; // CV of sentence lengths

  // Type-token ratio (lexical diversity)
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words);
  const typeTokenRatio = words.length > 0 ? uniqueWords.size / words.length : 1;

  // Simplified Flesch-Kincaid grade level
  const totalWords = words.length;
  const totalSentences = sentences.length;
  const totalSyllables = words.reduce((sum, w) => sum + estimateSyllables(w), 0);

  const fleschKincaid =
    0.39 * (totalWords / totalSentences) +
    11.8 * (totalSyllables / totalWords) -
    15.59;

  return { burstiness, typeTokenRatio, fleschKincaid };
}

function estimateSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 2) return 1;

  const vowels = word.match(/[aeiouy]+/g);
  let count = vowels ? vowels.length : 1;

  // Adjust for silent e
  if (word.endsWith("e") && count > 1) count--;
  // Adjust for -le endings
  if (word.endsWith("le") && word.length > 2 && !/[aeiouy]/.test(word[word.length - 3])) count++;

  return Math.max(1, count);
}

export async function detectAiGenerated(
  text: string,
  language: string,
): Promise<{ probability: number; reasoning: string }> {
  // First, compute statistical signals
  const stats = computeBurstinessScore(text);

  // Flag: low burstiness (uniform sentence lengths) + high readability + low lexical diversity
  const statisticalSuspicion =
    stats.burstiness < 0.3 && stats.typeTokenRatio < 0.5 && stats.fleschKincaid > 8;

  // Call Claude for advisory AI detection
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback to statistical-only if no API key
    return {
      probability: statisticalSuspicion ? 0.6 : 0.2,
      reasoning: `Statistical analysis only. Burstiness: ${stats.burstiness.toFixed(2)}, TTR: ${stats.typeTokenRatio.toFixed(2)}`,
    };
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: `You are an AI-generated text detector. Analyze the following text and estimate the probability (0.0-1.0) that it was generated by an AI language model. Consider: sentence structure uniformity, vocabulary patterns, hedging language, lack of personal anecdotes, and overall style. Be calibrated — most humans write somewhat uniformly in exam conditions. Only flag high-confidence cases.

Respond with ONLY valid JSON: {"probability": <0.0-1.0>, "reasoning": "<brief explanation>"}`,
      messages: [{ role: "user", content: text }],
    }),
  });

  if (!res.ok) {
    return {
      probability: statisticalSuspicion ? 0.5 : 0.15,
      reasoning: "API unavailable, statistical analysis only",
    };
  }

  const data = await res.json();
  const responseText = data.content?.[0]?.text ?? "";
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return { probability: 0.3, reasoning: "Could not parse detection response" };
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Blend statistical and LLM signals
  const blendedProbability = parsed.probability * 0.7 + (statisticalSuspicion ? 0.6 : 0.1) * 0.3;

  return {
    probability: Math.min(1, blendedProbability),
    reasoning: parsed.reasoning,
  };
}
