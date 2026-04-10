"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function AssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [done, setDone] = useState(false);
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
    try {
      await fetch(`/api/assessment/sessions/${sessionId}/complete`, {
        method: "POST",
      });
      router.push(`/assessment/complete?sessionId=${sessionId}`);
    } catch {
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
