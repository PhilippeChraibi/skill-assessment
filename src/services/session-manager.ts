import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { SessionStatus, AssessmentSession, Answer } from "@prisma/client";
import { selectQuestions } from "./question-selector";
import { scoreAnswer, computeSessionScores } from "./scoring-service";
import { computeIntegrity } from "./integrity-service";
import type { CampaignSettings, IntegrityFlag } from "@/types";

const log = logger.child({ service: "session-manager" });

// ─── SESSION CREATION ───────────────────────────────────────────────────────────

export async function createSession(
  candidateId: string,
  campaignId: string,
): Promise<AssessmentSession> {
  // Fetch campaign with profile
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { jobProfile: true },
  });

  if (!campaign) throw new Error("Campaign not found");

  // Check campaign is active
  const now = new Date();
  if (now < campaign.startsAt || now > campaign.endsAt) {
    throw new Error("Campaign is not currently active");
  }
  if (campaign.isArchived) {
    throw new Error("Campaign has been archived");
  }

  // Enforce maxAttempts
  const existingCount = await prisma.assessmentSession.count({
    where: {
      candidateId,
      campaignId,
      deletedAt: null,
    },
  });

  if (existingCount >= campaign.maxAttempts) {
    throw new Error(`Maximum attempts (${campaign.maxAttempts}) reached for this campaign`);
  }

  // Check for an existing PENDING or IN_PROGRESS session (resume instead of creating new)
  const existingSession = await prisma.assessmentSession.findFirst({
    where: {
      candidateId,
      campaignId,
      status: { in: ["PENDING", "IN_PROGRESS"] },
      deletedAt: null,
    },
  });

  if (existingSession) {
    log.info({ sessionId: existingSession.id }, "Resuming existing session");
    return existingSession;
  }

  // Get candidate's preferred language
  const candidate = await prisma.user.findUnique({
    where: { id: candidateId },
    select: { preferredLanguage: true },
  });

  const settings = campaign.settings as CampaignSettings;
  const allowedLangs = settings.allowedLanguages ?? ["en"];
  const language = candidate && allowedLangs.includes(candidate.preferredLanguage)
    ? candidate.preferredLanguage
    : allowedLangs[0];

  // Select questions
  const questions = await selectQuestions({
    jobProfileId: campaign.jobProfileId,
    language,
    campaignSettings: settings,
  });

  const questionSequence = questions.map((q) => q.id);

  // Create session
  const session = await prisma.assessmentSession.create({
    data: {
      candidateId,
      jobProfileId: campaign.jobProfileId,
      campaignId,
      status: "PENDING",
      questionSequence,
    },
  });

  log.info(
    { sessionId: session.id, questionCount: questionSequence.length },
    "Session created",
  );

  return session;
}

// ─── SESSION START ──────────────────────────────────────────────────────────────

export async function startSession(sessionId: string, candidateId: string): Promise<AssessmentSession> {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) throw new Error("Session not found");
  if (session.candidateId !== candidateId) throw new Error("Unauthorized");
  if (session.status !== "PENDING") throw new Error("Session already started or completed");

  const updated = await prisma.assessmentSession.update({
    where: { id: sessionId },
    data: {
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });

  log.info({ sessionId }, "Session started");
  return updated;
}

// ─── ANSWER SUBMISSION ──────────────────────────────────────────────────────────

interface SubmitAnswerInput {
  sessionId: string;
  candidateId: string;
  questionId: string;
  rawAnswer?: string;
  selectedOptions?: number[];
  timeSpentSeconds: number;
  keystrokeCadenceData?: number[];
  pastedCharCount?: number;
  focusLossCount?: number;
  focusLossDuration?: number;
}

export async function submitAnswer(input: SubmitAnswerInput): Promise<Answer> {
  const { sessionId, candidateId, questionId, rawAnswer, selectedOptions, timeSpentSeconds } = input;

  // Verify session ownership and status
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: { campaign: { include: { jobProfile: true } } },
  });

  if (!session) throw new Error("Session not found");
  if (session.candidateId !== candidateId) throw new Error("Unauthorized");
  if (session.status !== "IN_PROGRESS") throw new Error("Session is not in progress");

  // Verify question is in this session's sequence
  const sequence = session.questionSequence as string[];
  if (!sequence.includes(questionId)) {
    throw new Error("Question not part of this session");
  }

  // Check question hasn't already been answered (no back-navigation)
  const existing = await prisma.answer.findUnique({
    where: { sessionId_questionId: { sessionId, questionId } },
  });

  if (existing?.submittedAt) {
    throw new Error("Question already submitted");
  }

  // Upsert the answer (supports partial saves before final submission)
  const answer = await prisma.answer.upsert({
    where: { sessionId_questionId: { sessionId, questionId } },
    create: {
      sessionId,
      questionId,
      rawAnswer: rawAnswer ?? null,
      selectedOptions: selectedOptions ?? [],
      timeSpentSeconds,
      keystrokeCadenceData: input.keystrokeCadenceData ? JSON.parse(JSON.stringify(input.keystrokeCadenceData)) : undefined,
      pastedCharCount: input.pastedCharCount ?? 0,
      focusLossCount: input.focusLossCount ?? 0,
      focusLossDuration: input.focusLossDuration ?? 0,
      submittedAt: new Date(),
    },
    update: {
      rawAnswer: rawAnswer ?? undefined,
      selectedOptions: selectedOptions ?? undefined,
      timeSpentSeconds,
      keystrokeCadenceData: input.keystrokeCadenceData ?? undefined,
      pastedCharCount: input.pastedCharCount ?? undefined,
      focusLossCount: input.focusLossCount ?? undefined,
      focusLossDuration: input.focusLossDuration ?? undefined,
      submittedAt: new Date(),
    },
  });

  log.info({ sessionId, questionId, answerId: answer.id }, "Answer submitted");

  return answer;
}

// ─── PARTIAL SAVE (auto-save every 30s) ─────────────────────────────────────────

export async function savePartialAnswer(
  sessionId: string,
  candidateId: string,
  questionId: string,
  rawAnswer?: string,
  selectedOptions?: number[],
  keystrokeCadenceData?: number[],
): Promise<void> {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    select: { candidateId: true, status: true, questionSequence: true },
  });

  if (!session || session.candidateId !== candidateId) return;
  if (session.status !== "IN_PROGRESS") return;

  const sequence = session.questionSequence as string[];
  if (!sequence.includes(questionId)) return;

  await prisma.answer.upsert({
    where: { sessionId_questionId: { sessionId, questionId } },
    create: {
      sessionId,
      questionId,
      rawAnswer: rawAnswer ?? null,
      selectedOptions: selectedOptions ?? [],
      keystrokeCadenceData: keystrokeCadenceData ? JSON.parse(JSON.stringify(keystrokeCadenceData)) : undefined,
    },
    update: {
      rawAnswer: rawAnswer ?? undefined,
      selectedOptions: selectedOptions ?? undefined,
      keystrokeCadenceData: keystrokeCadenceData ? JSON.parse(JSON.stringify(keystrokeCadenceData)) : undefined,
    },
  });
}

// ─── SESSION COMPLETION ─────────────────────────────────────────────────────────

export async function completeSession(
  sessionId: string,
  candidateId: string,
): Promise<AssessmentSession> {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: {
      campaign: { include: { jobProfile: true } },
      answers: { include: { question: true } },
    },
  });

  if (!session) throw new Error("Session not found");
  if (session.candidateId !== candidateId) throw new Error("Unauthorized");
  if (session.status !== "IN_PROGRESS") throw new Error("Session is not in progress");

  // Build a human-readable band label for AI scoring context
  const profile = session.campaign.jobProfile;
  const bandLabel = `${profile.bandLabel} (Band ${profile.band}) – ${profile.track.replace(/_/g, " ")}`;

  const candidate = await prisma.user.findUnique({
    where: { id: candidateId },
    select: { preferredLanguage: true },
  });
  const language = candidate?.preferredLanguage ?? "en";

  // Score all answers
  for (const answer of session.answers) {
    const result = await scoreAnswer(
      answer,
      answer.question,
      bandLabel,
      language,
    );

    await prisma.answer.update({
      where: { id: answer.id },
      data: {
        autoScore: result.autoScore ?? null,
        llmScore: result.llmScore ?? null,
        finalScore: result.finalScore,
        llmFeedback: result.llmFeedback ?? null,
        llmScoringData: result.llmScoringData ? JSON.parse(JSON.stringify(result.llmScoringData)) : undefined,
      },
    });
  }

  // Reload answers with updated scores
  const scoredAnswers = await prisma.answer.findMany({
    where: { sessionId },
    include: { question: true },
  });

  // Compute aggregate scores
  const answersWithQuestions = scoredAnswers.map((a) => ({
    answer: a,
    question: a.question,
  }));
  const scores = computeSessionScores(answersWithQuestions);

  // Compute integrity
  const startedAt = session.startedAt ?? new Date();
  const completedAt = new Date();
  const durationSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

  const integrity = computeIntegrity(scoredAnswers, durationSeconds);

  // Update session
  const updated = await prisma.assessmentSession.update({
    where: { id: sessionId },
    data: {
      status: "COMPLETED",
      completedAt,
      durationSeconds,
      theoryScore: scores.theoryScore,
      practiceScore: scores.practiceScore,
      overallScore: scores.overallScore,
      domainScores: scores.domainScores,
      integrityScore: integrity.integrityScore,
      integrityFlags: JSON.parse(JSON.stringify(integrity.flags)),
      integrityRecommendation: integrity.recommendation,
    },
  });

  // Queue report generation job
  await prisma.jobQueue.create({
    data: {
      type: "GENERATE_REPORT",
      payload: { sessionId, candidateId, language },
    },
  });

  // Queue email notification
  await prisma.jobQueue.create({
    data: {
      type: "SEND_EMAIL",
      payload: {
        sessionId,
        candidateId,
        type: "assessment_complete",
        language,
      },
    },
  });

  log.info(
    {
      sessionId,
      overallScore: scores.overallScore,
      integrityScore: integrity.integrityScore,
      recommendation: integrity.recommendation,
    },
    "Session completed",
  );

  return updated;
}

// ─── GET CURRENT QUESTION ───────────────────────────────────────────────────────

export async function getCurrentQuestion(sessionId: string, candidateId: string) {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    select: {
      candidateId: true,
      status: true,
      questionSequence: true,
      answers: {
        where: { submittedAt: { not: null } },
        select: { questionId: true },
      },
    },
  });

  if (!session) throw new Error("Session not found");
  if (session.candidateId !== candidateId) throw new Error("Unauthorized");
  if (session.status !== "IN_PROGRESS") throw new Error("Session is not in progress");

  const sequence = session.questionSequence as string[];
  const answeredIds = new Set(session.answers.map((a) => a.questionId));

  // Find first unanswered question in sequence
  const currentQuestionId = sequence.find((id) => !answeredIds.has(id));

  if (!currentQuestionId) {
    return { done: true, questionIndex: sequence.length, totalQuestions: sequence.length };
  }

  const question = await prisma.question.findUnique({
    where: { id: currentQuestionId },
  });

  const questionIndex = sequence.indexOf(currentQuestionId);

  return {
    done: false,
    question,
    questionIndex: questionIndex + 1,
    totalQuestions: sequence.length,
    // Preload next question ID for client-side prefetching
    nextQuestionId: sequence[questionIndex + 1] ?? null,
  };
}
