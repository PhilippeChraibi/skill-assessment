import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { LlmScoringResponse } from "@/types";

const log = logger.child({ service: "report-generator" });

export interface CandidateReport {
  candidateName: string;
  candidateEmail: string;
  sessionId: string;
  assessmentDate: string;
  jobFamily: string;
  seniorityLevel: string;
  jobProfileDisplayName: string;

  overallScore: number;
  theoryScore: number;
  practiceScore: number;
  percentile: number | null;

  domainScores: Record<string, number>;

  qualitativeSummary: string;
  strengths: string[];
  developmentAreas: string[];

  questionFeedback: Array<{
    questionStem: string;
    questionType: string;
    domainTag: string;
    score: number;
    maxScore: number;
    feedback: string | null;
  }>;

  integrityFlagged: boolean;
}

export async function generateCandidateReport(sessionId: string): Promise<CandidateReport> {
  const session = await prisma.assessmentSession.findUnique({
    where: { id: sessionId },
    include: {
      candidate: { select: { name: true, email: true, preferredLanguage: true } },
      jobProfile: true,
      campaign: { select: { name: true } },
      answers: {
        include: { question: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) throw new Error("Session not found");
  if (session.status !== "COMPLETED") throw new Error("Session not completed");

  const displayName = session.jobProfile.displayName as Record<string, string>;
  const language = session.candidate.preferredLanguage ?? "en";

  // Build per-question feedback (only for open-text/scenario)
  const questionFeedback = session.answers
    .filter((a) => ["OPEN_TEXT", "SCENARIO"].includes(a.question.questionType))
    .map((a) => {
      const content = a.question.content as Record<string, unknown>;
      return {
        questionStem: content.stem as string,
        questionType: a.question.questionType,
        domainTag: a.question.domainTag,
        score: a.finalScore ?? 0,
        maxScore: 10 * a.question.difficultyWeight,
        feedback: a.llmFeedback,
      };
    });

  // Collect all LLM feedback for narrative synthesis
  const allFeedback = session.answers
    .filter((a) => a.llmFeedback)
    .map((a) => ({
      domainTag: a.question.domainTag,
      feedback: a.llmFeedback!,
      score: a.finalScore ?? 0,
      scoringData: a.llmScoringData as LlmScoringResponse | null,
    }));

  // Generate qualitative summary via Claude
  const { summary, strengths, developmentAreas } = await generateNarrativeSummary(
    allFeedback,
    session.overallScore ?? 0,
    session.domainScores as Record<string, number> ?? {},
    displayName[language] ?? displayName.en ?? session.jobProfile.jobFamily,
    session.jobProfile.seniorityLevel,
    language,
  );

  // Compute percentile within cohort
  let percentile: number | null = null;
  if (session.overallScore !== null) {
    const allSessionsInCampaign = await prisma.assessmentSession.findMany({
      where: {
        campaignId: session.campaignId,
        status: "COMPLETED",
        deletedAt: null,
      },
      select: { overallScore: true },
    });

    if (allSessionsInCampaign.length > 1) {
      const scores = allSessionsInCampaign
        .map((s) => s.overallScore ?? 0)
        .sort((a, b) => a - b);
      const rank = scores.filter((s) => s < session.overallScore!).length;
      percentile = Math.round((rank / scores.length) * 100);
    }
  }

  return {
    candidateName: session.candidate.name ?? "Candidate",
    candidateEmail: session.candidate.email,
    sessionId: session.id,
    assessmentDate: session.completedAt?.toISOString() ?? new Date().toISOString(),
    jobFamily: session.jobProfile.jobFamily,
    seniorityLevel: session.jobProfile.seniorityLevel,
    jobProfileDisplayName: displayName[language] ?? displayName.en ?? session.jobProfile.jobFamily,

    overallScore: session.overallScore ?? 0,
    theoryScore: session.theoryScore ?? 0,
    practiceScore: session.practiceScore ?? 0,
    percentile,

    domainScores: (session.domainScores as Record<string, number>) ?? {},

    qualitativeSummary: summary,
    strengths,
    developmentAreas,

    questionFeedback,
    integrityFlagged: (session.integrityScore ?? 0) > 0.5,
  };
}

async function generateNarrativeSummary(
  feedbackItems: Array<{
    domainTag: string;
    feedback: string;
    score: number;
    scoringData: LlmScoringResponse | null;
  }>,
  overallScore: number,
  domainScores: Record<string, number>,
  profileName: string,
  seniorityLevel: string,
  language: string,
): Promise<{ summary: string; strengths: string[]; developmentAreas: string[] }> {
  const languageNames: Record<string, string> = {
    en: "English", fr: "French", es: "Spanish",
    de: "German", ar: "Arabic", zh: "Chinese",
  };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      summary: "Detailed narrative summary unavailable.",
      strengths: ["Assessment completed"],
      developmentAreas: ["Review individual question feedback for details"],
    };
  }

  const feedbackSummary = feedbackItems
    .map((f) => `[${f.domainTag}] Score: ${f.score.toFixed(1)} — ${f.feedback}`)
    .join("\n");

  const domainSummary = Object.entries(domainScores)
    .map(([k, v]) => `${k}: ${v.toFixed(1)}`)
    .join(", ");

  const prompt = `You are writing a professional assessment report for a ${profileName} (${seniorityLevel.replace(/_/g, " ")}).
Overall score: ${overallScore.toFixed(1)}/100.
Domain scores: ${domainSummary}.

Individual question feedback:
${feedbackSummary}

Write in ${languageNames[language] ?? "English"}. Respond with ONLY valid JSON:
{
  "summary": "<2-3 paragraphs synthesizing performance across all domains>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "developmentAreas": ["<area 1>", "<area 2>", "<area 3>"]
}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);

    const data = await res.json();
    const text = data.content?.[0]?.text ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    log.error({ error }, "Failed to generate narrative summary");
    return {
      summary: "A detailed narrative summary could not be generated at this time. Please review the individual question feedback below.",
      strengths: ["Assessment completed successfully"],
      developmentAreas: ["Please refer to individual question scores for detailed insights"],
    };
  }
}
