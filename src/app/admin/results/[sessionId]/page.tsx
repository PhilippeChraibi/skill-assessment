"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function SessionReviewPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewNote, setReviewNote] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/sessions/${sessionId}`)
      .then((r) => r.json())
      .then(setSession)
      .finally(() => setLoading(false));
  }, [sessionId]);

  const submitReview = async (outcome: "CLEARED" | "INVALIDATED") => {
    setSubmittingReview(true);
    await fetch(`/api/admin/sessions/${sessionId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, note: reviewNote }),
    });
    // Reload
    const res = await fetch(`/api/admin/sessions/${sessionId}`);
    setSession(await res.json());
    setReviewNote("");
    setSubmittingReview(false);
  };

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading...</div>;
  if (!session) return <div className="text-red-600 py-12 text-center">Session not found</div>;

  const flags = (session.integrityFlags as any[]) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Review</h1>
          <p className="text-gray-500 text-sm mt-1">
            {session.candidate?.name ?? session.candidate?.email} &middot;{" "}
            {session.campaign?.name}
          </p>
        </div>
        <Link
          href={`/reports/${sessionId}`}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          target="_blank"
        >
          View Full Report
        </Link>
      </div>

      {/* Score summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Overall", value: session.overallScore?.toFixed(0) ?? "—" },
          { label: "Theory", value: session.theoryScore?.toFixed(0) ?? "—" },
          { label: "Practice", value: session.practiceScore?.toFixed(0) ?? "—" },
          { label: "Duration", value: session.durationSeconds ? `${Math.round(session.durationSeconds / 60)}m` : "—" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Integrity section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Integrity Analysis</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Score:</span>
            <span className={`text-lg font-bold ${
              (session.integrityScore ?? 0) > 0.7 ? "text-red-600" :
              (session.integrityScore ?? 0) > 0.3 ? "text-amber-600" :
              "text-green-600"
            }`}>
              {(session.integrityScore ?? 0).toFixed(2)}
            </span>
            {session.integrityRecommendation && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                session.integrityRecommendation === "PASS" ? "bg-green-100 text-green-700" :
                session.integrityRecommendation === "REVIEW" ? "bg-amber-100 text-amber-700" :
                "bg-red-100 text-red-700"
              }`}>
                {session.integrityRecommendation}
              </span>
            )}
          </div>
        </div>

        {flags.length > 0 ? (
          <div className="space-y-2">
            {flags.map((flag: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 flex items-start gap-3">
                <span className={`text-xs px-2 py-0.5 rounded font-medium mt-0.5 ${
                  flag.type === "AI_SUSPICION" ? "bg-red-100 text-red-700" :
                  flag.type === "PASTE_DETECTED" ? "bg-amber-100 text-amber-700" :
                  "bg-gray-200 text-gray-700"
                }`}>
                  {flag.type}
                </span>
                <div className="text-sm text-gray-600">
                  {flag.detail}
                  {flag.questionId && (
                    <span className="text-gray-400 ml-1">(Q: {flag.questionId.slice(-6)})</span>
                  )}
                  {flag.reasoning && (
                    <p className="text-xs text-gray-400 mt-1">{flag.reasoning}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No integrity flags.</p>
        )}

        {/* Review form */}
        {(session.integrityRecommendation === "REVIEW" || session.integrityRecommendation === "FLAG") && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Submit Review Decision</h3>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
              placeholder="Optional review note..."
            />
            <div className="flex gap-2">
              <button
                onClick={() => submitReview("CLEARED")}
                disabled={submittingReview}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Clear — No Issue
              </button>
              <button
                onClick={() => submitReview("INVALIDATED")}
                disabled={submittingReview}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
              >
                Invalidate Session
              </button>
            </div>
          </div>
        )}

        {/* Past reviews */}
        {session.integrityReviews?.length > 0 && (
          <div className="mt-4 border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Review History</h3>
            {session.integrityReviews.map((r: any) => (
              <div key={r.id} className="bg-gray-50 rounded-lg p-3 mb-2 text-sm">
                <span className={`font-medium ${r.outcome === "CLEARED" ? "text-green-700" : "text-red-700"}`}>
                  {r.outcome}
                </span>
                <span className="text-gray-400 ml-2">
                  by {r.reviewer?.name ?? r.reviewer?.email} on {new Date(r.createdAt).toLocaleDateString()}
                </span>
                {r.note && <p className="text-gray-600 mt-1">{r.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Answer details */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Answers ({session.answers?.length ?? 0})</h2>
        <div className="space-y-3">
          {session.answers?.map((a: any) => (
            <div key={a.id} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                    {a.question?.questionType}
                  </span>
                  <span className="text-gray-400 capitalize">
                    {a.question?.domainTag?.replace(/-/g, " ")}
                  </span>
                </div>
                <div className="text-sm font-medium">
                  {a.finalScore != null ? (
                    <span className={
                      (a.finalScore / (10 * (a.question?.difficultyWeight ?? 1))) >= 0.7 ? "text-green-700" :
                      (a.finalScore / (10 * (a.question?.difficultyWeight ?? 1))) >= 0.5 ? "text-amber-700" :
                      "text-red-700"
                    }>
                      {a.finalScore.toFixed(1)}
                    </span>
                  ) : "—"}
                </div>
              </div>
              <p className="text-sm text-gray-800">{(a.question?.content as any)?.stem?.slice(0, 150)}</p>
              {a.rawAnswer && (
                <div className="mt-2 bg-gray-50 rounded p-2 text-sm text-gray-600">
                  {a.rawAnswer.slice(0, 300)}{a.rawAnswer.length > 300 ? "..." : ""}
                </div>
              )}
              {a.llmFeedback && (
                <p className="mt-2 text-sm text-blue-700">{a.llmFeedback}</p>
              )}
              <div className="mt-2 flex gap-3 text-xs text-gray-400">
                <span>{a.timeSpentSeconds}s</span>
                {a.pastedCharCount > 0 && <span className="text-amber-600">Pasted: {a.pastedCharCount} chars</span>}
                {a.focusLossCount > 0 && <span className="text-amber-600">Focus lost: {a.focusLossCount}x</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
