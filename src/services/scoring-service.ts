import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { QuestionType, Answer, Question } from "@prisma/client";
import type { McqContent, RankedChoiceContent, LlmScoringResponse } from "@/types";
import { createHash } from "crypto";

const log = logger.child({ service: "scoring" });

// ─── MCQ SCORING ────────────────────────────────────────────────────────────────

export function scoreMcq(
  selectedOptions: number[],
  content: McqContent,
  difficultyWeight: number,
): number {
  const isCorrect = selectedOptions.length === 1 && selectedOptions[0] === content.correctAnswer;
  const rawScore = isCorrect ? 10 : 0;
  return rawScore * difficultyWeight;
}

// ─── RANKED CHOICE SCORING (Borda count with partial credit) ────────────────────

export function scoreRankedChoice(
  selectedOptions: number[],
  content: RankedChoiceContent,
  difficultyWeight: number,
): number {
  const correctOrder = content.correctOrder;
  const n = correctOrder.length;

  if (selectedOptions.length !== n) return 0;

  // Borda count: award points based on positional agreement
  // Max score when all positions match
  let score = 0;
  let maxScore = 0;

  for (let i = 0; i < n; i++) {
    const points = n - i; // higher points for items at the top
    maxScore += points;
    if (selectedOptions[i] === correctOrder[i]) {
      score += points;
    } else {
      // Partial credit: half points if the item is in the correct "zone" (±1 position)
      const correctPosition = correctOrder.indexOf(selectedOptions[i]);
      if (correctPosition !== -1 && Math.abs(correctPosition - i) <= 1) {
        score += points * 0.5;
      }
    }
  }

  const normalizedScore = (score / maxScore) * 10;
  return normalizedScore * difficultyWeight;
}

// ─── LLM SCORING (Claude API for SCENARIO and OPEN_TEXT) ────────────────────────

function buildCacheKey(questionId: string, rawAnswer: string, language: string): string {
  const payload = `${questionId}:${rawAnswer}:${language}`;
  return createHash("sha256").update(payload).digest("hex");
}

export async function scoreLlm(
  questionId: string,
  questionContent: { stem: string; rubric: { criteria: string[]; maxScore: number } },
  rawAnswer: string,
  bandLabel: string,
  language: string,
): Promise<LlmScoringResponse> {
  const cacheKey = buildCacheKey(questionId, rawAnswer, language);

  // Check cache first
  const cached = await prisma.llmCache.findUnique({ where: { cacheKey } });
  if (cached) {
    log.info({ questionId, cacheKey }, "LLM cache hit");
    return cached.response as unknown as LlmScoringResponse;
  }

  log.info({ questionId, cacheKey }, "LLM cache miss, calling Claude API");

  const response = await callClaudeForScoring(
    questionContent,
    rawAnswer,
    bandLabel,
    language,
  );

  // Store in cache
  await prisma.llmCache.create({
    data: {
      cacheKey,
      response: JSON.parse(JSON.stringify(response)),
      modelVersion: "claude-sonnet-4-20250514",
    },
  });

  return response;
}

async function callClaudeForScoring(
  questionContent: { stem: string; rubric: { criteria: string[]; maxScore: number } },
  rawAnswer: string,
  bandLabel: string,
  language: string,
): Promise<LlmScoringResponse> {
  const languageNames: Record<string, string> = {
    en: "English",
    fr: "French",
    es: "Spanish",
    de: "German",
    ar: "Arabic",
    zh: "Chinese",
  };

  const systemPrompt = `You are an expert assessment evaluator for procurement and supply chain professionals.
You evaluate answers at the ${bandLabel} level.
Provide your feedback in ${languageNames[language] ?? "English"}.
Be fair, constructive, and specific. Reference industry best practices where relevant.`;

  const userPrompt = `Evaluate the following answer.

QUESTION:
${questionContent.stem}

RUBRIC CRITERIA:
${questionContent.rubric.criteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

CANDIDATE'S ANSWER:
${rawAnswer}

Respond with ONLY valid JSON in this exact format:
{
  "score": <0-10>,
  "dimensionScores": {
    "accuracy": <0-10>,
    "depth": <0-10>,
    "bestPracticeAlignment": <0-10>,
    "clarity": <0-10>
  },
  "feedback": "<2-3 sentence qualitative feedback in ${languageNames[language] ?? "English"}>",
  "flags": [<array of any applicable flags: "possible_ai_generated", "off_topic", "plagiarism_risk">]
}`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
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
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    log.error({ status: res.status, body: errorText }, "Claude API error");
    throw new Error(`Claude API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;

  if (!text) {
    throw new Error("Empty response from Claude API");
  }

  // Parse JSON from response (handle possible markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from Claude response");
  }

  const parsed: LlmScoringResponse = JSON.parse(jsonMatch[0]);

  // Validate response shape
  if (typeof parsed.score !== "number" || parsed.score < 0 || parsed.score > 10) {
    throw new Error("Invalid score in Claude response");
  }

  return parsed;
}

// ─── AGGREGATE SCORING ──────────────────────────────────────────────────────────

interface AnswerWithQuestion {
  answer: Answer;
  question: Question;
}

export interface SessionScores {
  theoryScore: number;
  practiceScore: number;
  overallScore: number;
  domainScores: Record<string, number>;
}

export function computeSessionScores(answersWithQuestions: AnswerWithQuestion[]): SessionScores {
  const theoryAnswers = answersWithQuestions.filter((a) => a.question.dimension === "THEORY");
  const practiceAnswers = answersWithQuestions.filter((a) => a.question.dimension === "PRACTICE");

  const theoryScore = computeWeightedAverage(theoryAnswers);
  const practiceScore = computeWeightedAverage(practiceAnswers);
  const overallScore = theoryScore * 0.4 + practiceScore * 0.6;

  // Per-domain breakdown
  const domainGroups = new Map<string, AnswerWithQuestion[]>();
  for (const aq of answersWithQuestions) {
    const tag = aq.question.domainTag;
    const group = domainGroups.get(tag) ?? [];
    group.push(aq);
    domainGroups.set(tag, group);
  }

  const domainScores: Record<string, number> = {};
  for (const [tag, group] of domainGroups) {
    domainScores[tag] = computeWeightedAverage(group);
  }

  return {
    theoryScore: Math.round(theoryScore * 100) / 100,
    practiceScore: Math.round(practiceScore * 100) / 100,
    overallScore: Math.round(overallScore * 100) / 100,
    domainScores: Object.fromEntries(
      Object.entries(domainScores).map(([k, v]) => [k, Math.round(v * 100) / 100]),
    ),
  };
}

function computeWeightedAverage(answers: AnswerWithQuestion[]): number {
  if (answers.length === 0) return 0;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const { answer, question } of answers) {
    const score = answer.finalScore ?? 0;
    const weight = question.difficultyWeight;

    // Normalize to 0–100 scale
    // For MCQ/ranked: finalScore is already (rawScore * difficultyWeight), max = 10 * 3.0 = 30
    // For LLM-scored: finalScore is 0–10 * difficultyWeight, max = 10 * 3.0 = 30
    const maxPossible = 10 * weight;
    const normalizedScore = maxPossible > 0 ? (score / maxPossible) * 100 : 0;

    weightedSum += normalizedScore * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

// ─── SCORE A SINGLE ANSWER ──────────────────────────────────────────────────────

export async function scoreAnswer(
  answer: Answer,
  question: Question,
  bandLabel: string,
  language: string,
): Promise<{ autoScore?: number; llmScore?: number; finalScore: number; llmFeedback?: string; llmScoringData?: LlmScoringResponse }> {
  const content = question.content as Record<string, unknown>;

  switch (question.questionType) {
    case "MCQ": {
      const autoScore = scoreMcq(
        answer.selectedOptions,
        content as unknown as McqContent,
        question.difficultyWeight,
      );
      return { autoScore, finalScore: autoScore };
    }

    case "RANKED_CHOICE": {
      const autoScore = scoreRankedChoice(
        answer.selectedOptions,
        content as unknown as RankedChoiceContent,
        question.difficultyWeight,
      );
      return { autoScore, finalScore: autoScore };
    }

    case "SCENARIO":
    case "OPEN_TEXT": {
      if (!answer.rawAnswer) {
        return { llmScore: 0, finalScore: 0 };
      }

      const llmResponse = await scoreLlm(
        question.id,
        content as { stem: string; rubric: { criteria: string[]; maxScore: number } },
        answer.rawAnswer,
        bandLabel,
        language,
      );

      const llmScore = llmResponse.score * question.difficultyWeight;

      return {
        llmScore,
        finalScore: llmScore,
        llmFeedback: llmResponse.feedback,
        llmScoringData: llmResponse,
      };
    }

    default:
      return { finalScore: 0 };
  }
}
