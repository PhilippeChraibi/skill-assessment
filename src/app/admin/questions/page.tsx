"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface QuestionRow {
  id: string;
  language: string;
  questionType: string;
  dimension: string;
  domainTag: string;
  difficultyWeight: number;
  isActive: boolean;
  variantGroupId: string | null;
  variantCount: number;
  needsMoreVariants: boolean;
  content: { stem?: string };
  profiles: { profileId: string; profile: { track: string; band: number } }[];
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ language: "", dimension: "", questionType: "", domainTag: "" });
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");

  const fetchQuestions = async (p: number) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p), limit: "25" });
    if (filters.language) params.set("language", filters.language);
    if (filters.dimension) params.set("dimension", filters.dimension);
    if (filters.questionType) params.set("questionType", filters.questionType);
    if (filters.domainTag) params.set("domainTag", filters.domainTag);

    const res = await fetch(`/api/admin/questions?${params}`);
    const data = await res.json();
    setQuestions(data.questions ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchQuestions(page);
  }, [page, filters]);

  const totalPages = Math.ceil(total / 25);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-sm text-gray-500 mt-1">{total} questions</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!confirm("This will create the standard question bank for all active profiles. Existing questions are not affected. Continue?")) return;
              setSeeding(true);
              setSeedMsg("");
              const res = await fetch("/api/admin/questions/seed", { method: "POST" });
              const data = await res.json();
              if (!res.ok) setSeedMsg(`Error: ${data.error}`);
              else setSeedMsg(`${data.questionsCreated} questions created with ${data.assignmentsCreated} profile assignments.`);
              setSeeding(false);
              fetchQuestions(1);
              setPage(1);
            }}
            disabled={seeding}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
          >
            {seeding ? "Seeding\u2026" : "Seed Question Bank"}
          </button>
          <Link
            href="/admin/questions/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + New Question
          </Link>
        </div>
      </div>

      {seedMsg && (
        <div className={`px-4 py-3 rounded-lg text-sm mb-4 ${seedMsg.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {seedMsg}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        {[
          { key: "language", options: ["en", "fr", "es", "de", "ar", "zh"], label: "Language" },
          { key: "dimension", options: ["THEORY", "PRACTICE"], label: "Dimension" },
          { key: "questionType", options: ["MCQ", "RANKED_CHOICE", "SCENARIO", "OPEN_TEXT"], label: "Type" },
        ].map((f) => (
          <select
            key={f.key}
            value={(filters as any)[f.key]}
            onChange={(e) => { setFilters({ ...filters, [f.key]: e.target.value }); setPage(1); }}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">All {f.label}s</option>
            {f.options.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Question</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Domain</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Lang</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Diff</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Variants</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {questions.map((q) => (
                <tr key={q.id} className={`hover:bg-gray-50 ${!q.isActive ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 max-w-xs truncate text-gray-900">
                    {(q.content?.stem ?? "").slice(0, 80)}...
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      q.dimension === "THEORY" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"
                    }`}>
                      {q.questionType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{q.domainTag.replace(/-/g, " ")}</td>
                  <td className="px-4 py-3 text-center text-gray-500 uppercase">{q.language}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{q.difficultyWeight.toFixed(1)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      q.needsMoreVariants ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                    }`}>
                      {q.variantCount}{q.needsMoreVariants ? " (needs more)" : ""}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/questions/${q.id}`} className="text-blue-600 hover:text-blue-800 text-sm">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="text-sm text-gray-600 disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="text-sm text-gray-600 disabled:opacity-30"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
