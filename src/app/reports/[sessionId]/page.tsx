"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { CandidateReport } from "@/services/report-generator";

function ScoreBadge({ score }: { score: number }) {
  const style =
    score >= 70
      ? { color: "#15803d", backgroundColor: "#dcfce7", borderColor: "#bbf7d0" }
      : score >= 50
      ? { color: "#b45309", backgroundColor: "#fef9c3", borderColor: "#fde68a" }
      : { color: "#b91c1c", backgroundColor: "#fee2e2", borderColor: "#fecaca" };

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border"
      style={{ ...style, WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties}
    >
      {score.toFixed(0)}
    </span>
  );
}

function DomainScoreBar({ name, score }: { name: string; score: number }) {
  const barColor =
    score >= 70 ? "#22c55e" :
    score >= 50 ? "#f59e0b" :
    "#ef4444";

  return (
    <div className="flex items-center gap-3">
      <span className="w-40 text-sm text-gray-600 truncate capitalize">
        {name.replace(/-/g, " ")}
      </span>
      <div className="flex-grow rounded-full h-3" style={{ backgroundColor: "#f3f4f6", WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" } as React.CSSProperties}>
        <div
          className="h-3 rounded-full"
          style={{
            width: `${Math.min(100, score)}%`,
            backgroundColor: barColor,
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          } as React.CSSProperties}
        />
      </div>
      <span className="w-10 text-sm font-medium text-right">{score.toFixed(0)}</span>
    </div>
  );
}

export default function ReportPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [report, setReport] = useState<CandidateReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/reports/${sessionId}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error ?? "Failed to load report");
          return;
        }
        setReport(await res.json());
      } catch {
        setError("Failed to load report");
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400">Loading report...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 text-center">
          <p className="text-red-600">{error ?? "Report not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:shadow-none print:border-0">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Skills Assessment Report
              </h1>
              <p className="text-gray-500 mt-1">{report.candidateName}</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>{new Date(report.assessmentDate).toLocaleDateString()}</p>
              <p className="text-xs">ID: {report.sessionId.slice(-8)}</p>
            </div>
          </div>

          <div className="mt-4 flex gap-4 text-sm text-gray-600">
            <span className="px-2 py-1 bg-gray-100 rounded">
              {report.jobProfileDisplayName}
            </span>
            <span className="px-2 py-1 bg-gray-100 rounded">
              {report.bandLabel}
            </span>
          </div>
        </div>

        {/* Overall Score */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:shadow-none">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Overall Score</h2>
              {report.percentile !== null && (
                <p className="text-sm text-gray-500 mt-1">
                  {report.percentile}th percentile in cohort
                </p>
              )}
            </div>
            <div className="text-4xl font-bold text-gray-900">
              <ScoreBadge score={report.overallScore} />
            </div>
          </div>

          {/* Score breakdown */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Theory</p>
              <p className="text-2xl font-bold mt-1">
                <ScoreBadge score={report.theoryScore} />
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-500">Practice</p>
              <p className="text-2xl font-bold mt-1">
                <ScoreBadge score={report.practiceScore} />
              </p>
            </div>
          </div>
        </div>

        {/* Domain Scores */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:shadow-none">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Domain Breakdown</h2>
          <div className="space-y-3">
            {Object.entries(report.domainScores)
              .sort(([, a], [, b]) => b - a)
              .map(([domain, score]) => (
                <DomainScoreBar key={domain} name={domain} score={score} />
              ))}
          </div>
        </div>

        {/* Qualitative Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:shadow-none">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
          <div className="prose prose-sm text-gray-700 whitespace-pre-wrap">
            {report.qualitativeSummary}
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <div>
              <h3 className="font-medium text-green-700 mb-2">Strengths</h3>
              <ul className="space-y-1">
                {report.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-amber-700 mb-2">Development Areas</h3>
              <ul className="space-y-1">
                {report.developmentAreas.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-amber-500 mt-0.5">-</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Question Feedback */}
        {report.questionFeedback.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print:shadow-none">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Detailed Question Feedback
            </h2>
            <div className="space-y-4">
              {report.questionFeedback.map((qf, i) => (
                <div key={i} className="border-l-4 border-gray-200 pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 capitalize">
                      {qf.domainTag.replace(/-/g, " ")} &middot; {qf.questionType}
                    </span>
                    <ScoreBadge score={(qf.score / qf.maxScore) * 100} />
                  </div>
                  <p className="text-sm text-gray-800 font-medium mb-1">{qf.questionStem}</p>
                  {qf.feedback && (
                    <p className="text-sm text-gray-600">{qf.feedback}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Integrity notice */}
        {report.integrityFlagged && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            This assessment has been flagged for manual review.
          </div>
        )}

        {/* Print button */}
        <div className="text-center print:hidden">
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
