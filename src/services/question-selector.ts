import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Question, Dimension, QuestionType } from "@prisma/client";
import type { CampaignSettings } from "@/types";

interface QuestionSelectionInput {
  jobProfileId: string;
  language: string;
  campaignSettings: CampaignSettings;
}

interface SelectedQuestion {
  question: Question;
  estimatedDifficulty: number;
}

// Simple 3-Parameter Logistic (3PL) IRT model
// P(correct | theta, a, b, c) = c + (1 - c) / (1 + exp(-a * (theta - b)))
// a = discrimination (we use 1.0 for simplicity)
// b = difficulty (mapped from difficultyWeight: 1.0–3.0 → -1.0–1.0)
// c = guessing parameter (0.25 for MCQ with 4 options, 0 for open-text)

const DISCRIMINATION = 1.0;

function mapDifficultyToB(difficultyWeight: number): number {
  // Map 1.0–3.0 to -1.0–1.0
  return (difficultyWeight - 2.0);
}

function guessingParam(questionType: QuestionType): number {
  if (questionType === "MCQ") return 0.25;
  if (questionType === "RANKED_CHOICE") return 0.1;
  return 0;
}

function probability3PL(theta: number, b: number, c: number): number {
  return c + (1 - c) / (1 + Math.exp(-DISCRIMINATION * (theta - b)));
}

// Information function for 3PL: how much "info" a question gives at a given theta
function itemInformation(theta: number, b: number, c: number): number {
  const p = probability3PL(theta, b, c);
  const q = 1 - p;
  if (p <= c || q <= 0) return 0;
  const numerator = Math.pow(DISCRIMINATION, 2) * Math.pow(p - c, 2) * q;
  const denominator = Math.pow(1 - c, 2) * p;
  return denominator > 0 ? numerator / denominator : 0;
}

// Update theta estimate after observing a response (MLE approximation via Newton-Raphson step)
export function updateTheta(
  currentTheta: number,
  difficultyWeight: number,
  questionType: QuestionType,
  scoreRatio: number, // 0–1 representing how well the candidate did
): number {
  const b = mapDifficultyToB(difficultyWeight);
  const c = guessingParam(questionType);
  const p = probability3PL(currentTheta, b, c);

  // Single Newton-Raphson step for MLE
  const info = itemInformation(currentTheta, b, c);
  if (info <= 0) return currentTheta;

  const residual = scoreRatio - p;
  const step = residual / info;
  const newTheta = currentTheta + step;

  // Clamp to reasonable range
  return Math.max(-3, Math.min(3, newTheta));
}

// Select the next best question given current theta
function selectBestQuestion(
  candidates: Question[],
  theta: number,
): Question | null {
  if (candidates.length === 0) return null;

  let best: Question | null = null;
  let bestInfo = -Infinity;

  for (const q of candidates) {
    const b = mapDifficultyToB(q.difficultyWeight);
    const c = guessingParam(q.questionType);
    const info = itemInformation(theta, b, c);
    if (info > bestInfo) {
      bestInfo = info;
      best = q;
    }
  }

  return best;
}

// Fisher-Yates shuffle
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Pick one question per variant group (random selection among variants)
function deduplicateVariants(questions: Question[]): Question[] {
  const grouped = new Map<string, Question[]>();
  const standalone: Question[] = [];

  for (const q of questions) {
    if (q.variantGroupId) {
      const group = grouped.get(q.variantGroupId) ?? [];
      group.push(q);
      grouped.set(q.variantGroupId, group);
    } else {
      standalone.push(q);
    }
  }

  const deduplicated: Question[] = [...standalone];
  for (const variants of grouped.values()) {
    const pick = variants[Math.floor(Math.random() * variants.length)];
    deduplicated.push(pick);
  }

  return deduplicated;
}

export async function selectQuestions(
  input: QuestionSelectionInput,
): Promise<Question[]> {
  const { jobProfileId, language, campaignSettings } = input;
  const totalQuestions = campaignSettings.totalQuestions ?? 15;
  const ratio = campaignSettings.theoryPracticeRatio ?? { theory: 0.4, practice: 0.6 };
  const theoryCount = Math.round(totalQuestions * ratio.theory);
  const practiceCount = totalQuestions - theoryCount;

  const log = logger.child({ service: "question-selector", jobProfileId, language });

  // Fetch all active questions for this profile + language
  const allQuestions = await prisma.question.findMany({
    where: {
      jobProfileId,
      language,
      isActive: true,
    },
  });

  log.info({ totalAvailable: allQuestions.length }, "Fetched question pool");

  // Deduplicate variants — pick one per variant group
  const pool = deduplicateVariants(allQuestions);

  // Split by dimension
  const theoryPool = pool.filter((q) => q.dimension === "THEORY");
  const practicePool = pool.filter((q) => q.dimension === "PRACTICE");

  // Ensure minimum open-text questions
  const openTextPool = pool.filter((q) => q.questionType === "OPEN_TEXT");
  const minOpenText = 2;

  // Select theory questions using IRT (start with theta=0, average ability)
  const selectedTheory = selectAdaptiveSet(theoryPool, theoryCount, 0);
  const selectedPractice = selectAdaptiveSet(practicePool, practiceCount, 0);

  let selected = [...selectedTheory, ...selectedPractice];

  // Guarantee minimum open-text questions
  const openTextInSelected = selected.filter((q) => q.questionType === "OPEN_TEXT");
  if (openTextInSelected.length < minOpenText) {
    const additionalNeeded = minOpenText - openTextInSelected.length;
    const availableOpenText = openTextPool.filter(
      (q) => !selected.some((s) => s.id === q.id),
    );
    const extras = availableOpenText.slice(0, additionalNeeded);
    // Replace the last N non-open-text questions
    if (extras.length > 0) {
      const nonOpenText = selected.filter((q) => q.questionType !== "OPEN_TEXT");
      selected = [
        ...selected.filter((q) => q.questionType === "OPEN_TEXT"),
        ...nonOpenText.slice(0, nonOpenText.length - extras.length),
        ...extras,
      ];
    }
  }

  // Shuffle if campaign setting enables it (default: true)
  if (campaignSettings.shuffleQuestions !== false) {
    selected = shuffle(selected);
  }

  log.info(
    {
      selected: selected.length,
      theory: selected.filter((q) => q.dimension === "THEORY").length,
      practice: selected.filter((q) => q.dimension === "PRACTICE").length,
      openText: selected.filter((q) => q.questionType === "OPEN_TEXT").length,
    },
    "Question set selected",
  );

  return selected;
}

// Select N questions from a pool using adaptive IRT-based selection
function selectAdaptiveSet(
  pool: Question[],
  count: number,
  initialTheta: number,
): Question[] {
  const selected: Question[] = [];
  let remaining = [...pool];
  let theta = initialTheta;

  // Distribute across domain tags for coverage
  const domainTags = [...new Set(pool.map((q) => q.domainTag))];
  const perDomain = Math.max(1, Math.floor(count / domainTags.length));

  // First pass: ensure at least one question per domain tag (round-robin)
  for (const tag of domainTags) {
    if (selected.length >= count) break;
    const domainQuestions = remaining.filter((q) => q.domainTag === tag);
    const best = selectBestQuestion(domainQuestions, theta);
    if (best) {
      selected.push(best);
      remaining = remaining.filter((q) => q.id !== best.id);
    }
  }

  // Second pass: fill remaining slots with best IRT picks
  while (selected.length < count && remaining.length > 0) {
    const best = selectBestQuestion(remaining, theta);
    if (!best) break;
    selected.push(best);
    remaining = remaining.filter((q) => q.id !== best.id);
  }

  return selected;
}

// For adaptive mid-session: select the next question given current theta and already-answered IDs
export async function selectNextQuestion(
  jobProfileId: string,
  language: string,
  currentTheta: number,
  answeredQuestionIds: string[],
  requiredDimension?: Dimension,
): Promise<Question | null> {
  const pool = await prisma.question.findMany({
    where: {
      jobProfileId,
      language,
      isActive: true,
      id: { notIn: answeredQuestionIds },
      ...(requiredDimension ? { dimension: requiredDimension } : {}),
    },
  });

  const deduplicated = deduplicateVariants(pool);
  return selectBestQuestion(deduplicated, currentTheta);
}
