"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ResultsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (statusFilter) params.set("status", statusFilter);

    fetch(`/api/admin/sessions?${params}`)
      .then((r) => r.json())
      .then((data) => {
        setSessions(data.sessions ?? []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Results</h1>

      <div className="flex gap-3 mb-4">
        {["", "COMPLETED", "IN_PROGRESS", "FLAGGED", "PENDING"].map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              statusFilter === s
                ? "bg-blue-100 text-blue-700 font-medium"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Candidate</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Campaign</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Score</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Integrity</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">
                    {s.candidate?.name ?? s.candidate?.email}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.campaign?.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                      s.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                      s.status === "FLAGGED" ? "bg-red-100 text-red-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {s.overallScore != null ? (
                      <span className={
                        s.overallScore >= 70 ? "text-green-700" :
                        s.overallScore >= 50 ? "text-amber-700" :
                        "text-red-700"
                      }>
                        {s.overallScore.toFixed(0)}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {s.integrityRecommendation && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.integrityRecommendation === "PASS" ? "bg-green-100 text-green-700" :
                        s.integrityRecommendation === "REVIEW" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {s.integrityRecommendation}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/results/${s.id}`} className="text-blue-600 hover:text-blue-800 text-sm">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {Math.ceil(total / 25) > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="text-sm text-gray-600 disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 25)}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / 25)}
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
