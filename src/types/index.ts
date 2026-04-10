import { UserRole } from "@/generated/prisma";

// Extend NextAuth session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: UserRole;
      organizationId?: string | null;
      preferredLanguage: string;
    };
  }

  interface User {
    role: UserRole;
    organizationId?: string | null;
    preferredLanguage: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    organizationId?: string | null;
    preferredLanguage: string;
  }
}

// LLM scoring response
export interface LlmScoringResponse {
  score: number;
  dimensionScores: {
    accuracy: number;
    depth: number;
    bestPracticeAlignment: number;
    clarity: number;
  };
  feedback: string;
  flags: Array<"possible_ai_generated" | "off_topic" | "plagiarism_risk">;
}

// AI detection response
export interface AiDetectionResponse {
  probability: number;
  reasoning: string;
}

// Integrity flag types
export interface IntegrityFlag {
  type: "FOCUS_LOSS" | "AI_SUSPICION" | "PASTE_DETECTED" | "FAST_ANSWER" | "KEYSTROKE_ANOMALY";
  detail?: string;
  questionId?: string;
  score?: number;
  reasoning?: string;
  pastedChars?: number;
}

// Question content structures
export interface McqContent {
  stem: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface RankedChoiceContent {
  stem: string;
  options: string[];
  correctOrder: number[];
}

export interface ScenarioContent {
  stem: string;
  context: string;
  rubric: {
    criteria: string[];
    maxScore: number;
  };
}

export interface OpenTextContent {
  stem: string;
  rubric: {
    criteria: string[];
    maxScore: number;
  };
  guidanceWordCount?: { min: number; max: number };
}

// Campaign settings
export interface CampaignSettings {
  shuffleQuestions?: boolean;
  showFeedbackImmediately?: boolean;
  allowedLanguages?: string[];
  timeLimitPerQuestion?: number;
  theoryPracticeRatio?: { theory: number; practice: number };
  totalQuestions?: number;
}
