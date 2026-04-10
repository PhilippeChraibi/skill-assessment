"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CohortContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const campaignId = params.campaignId as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [anonymize, setAnonymize] = useState(searchParams.get("anonymize") === "true");

  useEffect(() => {
    fetch(`/api/admin/cohort/${campaignId}?anonymize=${anonymize}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [campaignId, anonymize]);

  const exportCsv = () => {
    if (!data?.leaderboard) return;
    const headers = ["Rank", "Name", "Overall", "Theory", "Practice", "Integrity"];
    const rows = data.leaderboard.map((r: any) =>
      [r.rank, r.candidateName, r.overallScore, r.theoryScore, r.practiceScore, r.integrityRecommendation].join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cohort-${campaignId}.csv`;
    a.click();
  };

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading...</div>;
  if (!data) return <div className="text-red-600 py-12 text-center">Failed to load</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cohort Report</h1>
          <p className="text-gray-500 text-sm mt-1">{data.campaignName}</p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={anonymize}
              onChange={(e) => setAnonymize(e.target.checked)}
              className="rounded border-gray-300"
            />
            Anonymize
          </label>
          <button
            onClick={exportCsv}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Completion Rate", value: `${data.completionRate}%` },
          { label: "Avg Score", value: data.averageScore.toFixed(0) },
          { label: "Completed", value: data.completedCount },
          { label: "Invited", value: data.totalInvited },
          { label: "Avg Duration", value: `${Math.round(data.averageDurationSeconds / 60)}m` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Score distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Score Distribution</h2>
        <div className="flex items-end gap-1 h-40">
          {data.scoreDistribution?.map((bucket: any) => {
            const maxCount = Math.max(...data.scoreDistribution.map((b: any) => b.count), 1);
            const height = (bucket.count / maxCount) * 100;
            return (
              <div key={bucket.range} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500">{bucket.count}</span>
                <div
                  className="w-full bg-blue-400 rounded-t"
                  style={{ height: `${height}%`, minHeight: bucket.count > 0 ? "4px" : "0" }}
                />
                <span className="text-xs text-gray-400">{bucket.range}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Domain averages */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Domain Averages</h2>
          <div className="space-y-3">
            {Object.entries(data.domainAverages ?? {})
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([domain, avg]) => (
                <div key={domain} className="flex items-center gap-3">
                  <span className="w-36 text-sm text-gray-600 truncate capitalize">
                    {domain.replace(/-/g, " ")}
                  </span>
                  <div className="flex-grow bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        (avg as number) >= 70 ? "bg-green-500" :
                        (avg as number) >= 50 ? "bg-amber-500" : "bg-red-500"
                      }`}
                      style={{ width: `${Math.min(100, avg as number)}%` }}
                    />
                  </div>
                  <span className="w-10 text-sm font-medium text-right">{(avg as number).toFixed(0)}</span>
                </div>
              ))}
          </div>

          {data.weakestDomains?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-red-600 mb-2">Weakest Areas</p>
              {data.weakestDomains.map((d: any) => (
                <p key={d.domain} className="text-sm text-gray-600 capitalize">
                  {d.domain.replace(/-/g, " ")}: {d.averageScore.toFixed(0)}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Integrity summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Integrity Summary</h2>
          <div className="space-y-3">
            {[
              { label: "Pass", value: data.integrityCount?.PASS ?? 0, color: "bg-green-100 text-green-700" },
              { label: "Review", value: data.integrityCount?.REVIEW ?? 0, color: "bg-amber-100 text-amber-700" },
              { label: "Flag", value: data.integrityCount?.FLAG ?? 0, color: "bg-red-100 text-red-700" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${item.color}`}>
                  {item.label}
                </span>
                <span className="text-lg font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>

          {Object.keys(data.seniorityBreakdown ?? {}).length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-2">By Seniority</h3>
              {Object.entries(data.seniorityBreakdown).map(([level, info]: [string, any]) => (
                <div key={level} className="flex justify-between text-sm py-1">
                  <span className="text-gray-600">{level.replace(/_/g, " ")}</span>
                  <span className="text-gray-900 font-medium">
                    {info.avg.toFixed(0)} avg ({info.count})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Leaderboard</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-500">#</th>
              <th className="text-left px-4 py-2 font-medium text-gray-500">Candidate</th>
              <th className="text-center px-4 py-2 font-medium text-gray-500">Overall</th>
              <th className="text-center px-4 py-2 font-medium text-gray-500">Theory</th>
              <th className="text-center px-4 py-2 font-medium text-gray-500">Practice</th>
              <th className="text-center px-4 py-2 font-medium text-gray-500">Integrity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.leaderboard?.map((r: any) => (
              <tr key={r.rank} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-500">{r.rank}</td>
                <td className="px-4 py-2 text-gray-900 font-medium">{r.candidateName}</td>
                <td className="px-4 py-2 text-center font-bold">{r.overallScore.toFixed(0)}</td>
                <td className="px-4 py-2 text-center text-gray-600">{r.theoryScore.toFixed(0)}</td>
                <td className="px-4 py-2 text-center text-gray-600">{r.practiceScore.toFixed(0)}</td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    r.integrityRecommendation === "PASS" ? "bg-green-100 text-green-700" :
                    r.integrityRecommendation === "REVIEW" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {r.integrityRecommendation}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CohortPage() {
  return (
    <Suspense fallback={<div className="text-gray-400 py-12 text-center">Loading...</div>}>
      <CohortContent />
    </Suspense>
  );
}
