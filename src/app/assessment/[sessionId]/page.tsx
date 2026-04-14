"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { McqQuestion } from "@/components/assessment/McqQuestion";
import { RankedChoiceQuestion } from "@/components/assessment/RankedChoiceQuestion";
import { OpenTextQuestion } from "@/components/assessment/OpenTextQuestion";
import { ScenarioQuestion } from "@/components/assessment/ScenarioQuestion";
import { TimerDisplay } from "@/components/assessment/TimerDisplay";
import { SaveIndicator } from "@/components/assessment/SaveIndicator";
import { SessionWatermark } from "@/components/assessment/SessionWatermark";
import { useAntiCheat } from "@/hooks/useAntiCheat";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useTimer } from "@/hooks/useTimer";

interface QuestionData {
  id: string;
  questionType: "MCQ" | "RANKED_CHOICE" | "SCENARIO" | "OPEN_TEXT";
  dimension: string;
  domainTag: string;
  content: {
    stem: string;
    options?: string[];
    context?: string;
    guidanceWordCount?: { min: number; max: number };
  };
}

interface SessionInfo {
  status: string;
  campaignSettings: {
    timeLimitPerQuestion?: number;
  };
}

// ─── Completing screen ──────────────────────────────────────────────────────────

const STEPS = [
  { label: "Securing your responses", duration: 2000 },
  { label: "Analysing answers with AI", duration: 8000 },
  { label: "Calculating scores", duration: 4000 },
  { label: "Preparing your report", duration: 0 }, // stays until redirect
];

function CompletingScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const [dots, setDots] = useState(".");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Advance steps automatically
  useEffect(() => {
    if (stepIndex < STEPS.length - 1 && STEPS[stepIndex].duration > 0) {
      timerRef.current = setTimeout(() => setStepIndex((i) => i + 1), STEPS[stepIndex].duration);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [stepIndex]);

  // Animated ellipsis
  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center space-y-8">

        {/* Spinner */}
        <div className="relative w-20 h-20 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-900">Building your report{dots}</h1>
          <p className="mt-2 text-sm text-gray-500">This usually takes 20–40 seconds. Please keep this page open.</p>
        </div>

        {/* Step list */}
        <ol className="text-left space-y-3">
          {STEPS.map((step, i) => {
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <li key={step.label} className={`flex items-center gap-3 text-sm transition-opacity duration-300 ${i > stepIndex ? "opacity-30" : "opacity-100"}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-colors ${
                  done ? "bg-green-100 text-green-600" : active ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"
                }`}>
                  {done ? "✓" : i + 1}
                </span>
                <span className={active ? "text-gray-900 font-medium" : done ? "text-green-700" : "text-gray-400"}>
                  {step.label}
                </span>
                {active && <span className="ml-auto w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
              </li>
            );
          })}
        </ol>

        <p className="text-xs text-gray-400">Do not close this tab — your results will appear automatically.</p>
      </div>
    </div>
  );
}

// ─── Main assessment page ───────────────────────────────────────────────────────

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [done, setDone] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const antiCheat = useAntiCheat();
  const autoSave = useAutoSave({
    sessionId,
    questionId: question?.id ?? "",
  });

  const handleTimerExpiry = useCallback(async () => {
    if (!question) return;
    // Auto-submit current answer on timer expiry
    await handleSubmit(undefined, []);
  }, [question]);

  const timer = useTimer({
    timeLimitSeconds: sessionInfo?.campaignSettings?.timeLimitPerQuestion,
    onExpiry: handleTimerExpiry,
  });

  // Fetch session info on mount
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/assessment/sessions/${sessionId}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error);
          return;
        }

        setSessionInfo(data);

        // If session is PENDING, start it
        if (data.status === "PENDING") {
          await fetch(`/api/assessment/sessions/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "start" }),
          });
        }

        // If already completed, redirect
        if (data.status === "COMPLETED") {
          router.push(`/assessment/complete?sessionId=${sessionId}`);
          return;
        }

        await fetchCurrentQuestion();
      } catch {
        setError("Failed to load assessment");
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [sessionId]);

  async function fetchCurrentQuestion() {
    try {
      const res = await fetch(
        `/api/assessment/sessions/${sessionId}/current-question`,
      );
      const data = await res.json();

      if (data.done) {
        setDone(true);
        return;
      }

      setQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      antiCheat.reset();
      timer.reset();
    } catch {
      setError("Failed to load question");
    }
  }

  async function handleSubmit(rawAnswer?: string, selectedOptions?: number[]) {
    if (!question || submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(
        `/api/assessment/sessions/${sessionId}/answers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: question.id,
            rawAnswer,
            selectedOptions,
            timeSpentSeconds: timer.elapsedSeconds,
            keystrokeCadenceData: antiCheat.data.keystrokeCadence,
            pastedCharCount: antiCheat.data.pastedCharCount,
            focusLossCount: antiCheat.data.focusLossCount,
            focusLossDuration: antiCheat.data.focusLossDuration,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error);
        return;
      }

      // Load next question
      await fetchCurrentQuestion();
    } catch {
      setError("Failed to submit answer. Your progress is saved.");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle completion
  useEffect(() => {
    if (done) {
      completeAssessment();
    }
  }, [done]);

  async function completeAssessment() {
    setCompleting(true);
    try {
      await fetch(`/api/assessment/sessions/${sessionId}/complete`, {
        method: "POST",
      });
      router.push(`/assessment/complete?sessionId=${sessionId}`);
    } catch {
      setCompleting(false);
      setError("Failed to complete assessment");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full
                          animate-spin mx-auto" />
          <p className="text-gray-500">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-red-200 p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (completing) {
    return <CompletingScreen />;
  }

  if (!question) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <TimerDisplay
        remainingSeconds={timer.remainingSeconds}
        show={timer.showTimer}
      />
      <SaveIndicator lastSaved={autoSave.lastSaved} saving={autoSave.saving} />
      <SessionWatermark sessionId={sessionId} />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Question {questionIndex} of ~{totalQuestions}
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                question.dimension === "THEORY"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {question.dimension}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
              {question.domainTag.replace(/-/g, " ")}
            </span>
          </div>
        </div>
      </header>

      {/* Question content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {submitting && (
          <div className="fixed inset-0 bg-white/50 z-30 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg px-6 py-4 flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-700">Submitting...</span>
            </div>
          </div>
        )}

        {question.questionType === "MCQ" && (
          <McqQuestion
            key={question.id}
            content={question.content as { stem: string; options: string[] }}
            onConfirm={(selected) => handleSubmit(undefined, selected)}
            disabled={submitting}
          />
        )}

        {question.questionType === "RANKED_CHOICE" && (
          <RankedChoiceQuestion
            key={question.id}
            content={question.content as { stem: string; options: string[] }}
            onConfirm={(order) => handleSubmit(undefined, order)}
            disabled={submitting}
          />
        )}

        {question.questionType === "OPEN_TEXT" && (
          <OpenTextQuestion
            key={question.id}
            content={question.content as { stem: string; guidanceWordCount?: { min: number; max: number } }}
            onConfirm={(text) => handleSubmit(text, undefined)}
            onKeyDown={antiCheat.handleKeyDown}
            onPaste={antiCheat.handlePaste}
            onTextChange={(text) =>
              autoSave.updateData({
                rawAnswer: text,
                keystrokeCadenceData: antiCheat.data.keystrokeCadence,
              })
            }
            disabled={submitting}
          />
        )}

        {question.questionType === "SCENARIO" && (
          <ScenarioQuestion
            key={question.id}
            content={
              question.content as {
                stem: string;
                context: string;
                guidanceWordCount?: { min: number; max: number };
              }
            }
            onConfirm={(text) => handleSubmit(text, undefined)}
            onKeyDown={antiCheat.handleKeyDown}
            onPaste={antiCheat.handlePaste}
            onTextChange={(text) =>
              autoSave.updateData({
                rawAnswer: text,
                keystrokeCadenceData: antiCheat.data.keystrokeCadence,
              })
            }
            disabled={submitting}
          />
        )}
      </main>
    </div>
  );
}
