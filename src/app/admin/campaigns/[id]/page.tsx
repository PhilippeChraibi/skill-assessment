"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<any>(null);
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    fetch(`/api/admin/campaigns/${id}`)
      .then((r) => r.json())
      .then(setCampaign)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (campaign) {
      const baseUrl = window.location.origin;
      setInviteUrl(`${baseUrl}/invite/${campaign.inviteToken}`);
    }
  }, [campaign]);

  const handleBulkInvite = async () => {
    setInviting(true);
    setInviteResult(null);
    const emailList = emails
      .split(/[,\n]/)
      .map((e: string) => e.trim())
      .filter(Boolean);

    try {
      const res = await fetch(`/api/admin/campaigns/${id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: emailList }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteResult({ ok: false, message: data.error ?? "Failed to send invites." });
      } else {
        const count = data.count ?? emailList.length;
        setInviteResult({ ok: true, message: `${count} account${count !== 1 ? "s" : ""} created and invite email${count !== 1 ? "s" : ""} sent successfully.` });
        setEmails("");
      }
    } catch {
      setInviteResult({ ok: false, message: "Network error. Please try again." });
    }
    setInviting(false);
  };

  const handleArchive = async () => {
    await fetch(`/api/admin/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: !campaign.isArchived }),
    });
    setCampaign({ ...campaign, isArchived: !campaign.isArchived });
  };

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading...</div>;
  if (!campaign) return <div className="text-red-600 py-12 text-center">Campaign not found</div>;

  const completedSessions = campaign.sessions?.filter((s: any) => s.status === "COMPLETED") ?? [];
  const flaggedSessions = campaign.sessions?.filter(
    (s: any) => s.integrityRecommendation === "FLAG" || s.integrityRecommendation === "REVIEW",
  ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {campaign.jobProfile.displayName?.en ?? campaign.jobProfile.track?.replace(/_/g, " ")} — Level {campaign.jobProfile.band}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/cohort/${id}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Cohort Report
          </Link>
          <button
            onClick={handleArchive}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            {campaign.isArchived ? "Unarchive" : "Archive"}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Sessions", value: campaign.sessions?.length ?? 0 },
          { label: "Completed", value: completedSessions.length },
          { label: "Flagged", value: flaggedSessions.length },
          { label: "Max Attempts", value: campaign.maxAttempts },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Invite link */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Invite Link</h2>
        <div className="flex gap-2">
          <input
            readOnly
            value={inviteUrl}
            className="flex-grow px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
          />
          <button
            onClick={() => navigator.clipboard.writeText(inviteUrl)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            Copy
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Bulk Invite (paste emails)</h3>
          <textarea
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="email1@example.com, email2@example.com"
          />
          <button
            onClick={handleBulkInvite}
            disabled={inviting || !emails.trim()}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {inviting ? "Sending..." : "Create Candidate Accounts"}
          </button>
          {inviteResult && (
            <p className={`mt-2 text-sm ${inviteResult.ok ? "text-green-600" : "text-red-600"}`}>
              {inviteResult.ok ? "✓ " : "✗ "}{inviteResult.message}
            </p>
          )}
        </div>
      </div>

      {/* Sessions table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Sessions</h2>
        </div>
        {campaign.sessions?.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No sessions yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Candidate</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Status</th>
                <th className="text-center px-4 py-2 font-medium text-gray-500">Score</th>
                <th className="text-center px-4 py-2 font-medium text-gray-500">Integrity</th>
                <th className="text-left px-4 py-2 font-medium text-gray-500">Date</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaign.sessions?.map((s: any) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-900">
                    {s.candidate?.name ?? s.candidate?.email ?? "Unknown"}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : s.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-700"
                            : s.status === "FLAGGED"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center font-medium">
                    {s.overallScore != null ? s.overallScore.toFixed(0) : "—"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {s.integrityRecommendation && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          s.integrityRecommendation === "PASS"
                            ? "bg-green-100 text-green-700"
                            : s.integrityRecommendation === "REVIEW"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {s.integrityRecommendation}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {s.completedAt
                      ? new Date(s.completedAt).toLocaleDateString()
                      : s.startedAt
                        ? new Date(s.startedAt).toLocaleDateString()
                        : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/results/${s.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
