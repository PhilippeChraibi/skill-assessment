"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Invite {
  id: string;
  email: string;
  invitedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    emailVerified: string | null;
  } | null;
}

interface Session {
  id: string;
  status: string;
  overallScore: number | null;
  integrityRecommendation: string | null;
  startedAt: string | null;
  completedAt: string | null;
  candidate: { id: string; name: string | null; email: string };
}

interface Campaign {
  id: string;
  name: string;
  isArchived: boolean;
  maxAttempts: number;
  inviteToken: string;
  startsAt: string;
  endsAt: string;
  jobProfile: {
    id: string;
    displayName: Record<string, string>;
    track: string;
    band: number;
    bandLabel: string;
  };
  createdBy: { name: string | null; email: string };
  sessions: Session[];
  invites: Invite[];
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/campaigns/${id}`)
      .then((r) => r.json())
      .then(setCampaign)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

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
        setInviteResult({ ok: true, message: `${count} account${count !== 1 ? "s" : ""} created and invite email${count !== 1 ? "s" : ""} sent.` });
        setEmails("");
        load();
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
      body: JSON.stringify({ isArchived: !campaign!.isArchived }),
    });
    setCampaign((c) => c ? { ...c, isArchived: !c.isArchived } : c);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading...</div>;
  if (!campaign) return <div className="text-red-600 py-12 text-center">Campaign not found</div>;

  const allSessions = campaign.sessions ?? [];
  const allInvites = campaign.invites ?? [];

  const invited = allInvites.length;
  const started = allSessions.filter((s) => ["IN_PROGRESS", "COMPLETED", "FLAGGED"].includes(s.status)).length;
  const completed = allSessions.filter((s) => s.status === "COMPLETED").length;
  const flagged = allSessions.filter(
    (s) => s.integrityRecommendation === "FLAG" || s.integrityRecommendation === "REVIEW",
  ).length;

  // Build a map from candidateId → latest session for quick lookup in the invites table
  const sessionByCandidate = new Map<string, Session>();
  for (const s of allSessions) {
    if (!sessionByCandidate.has(s.candidate.id)) {
      sessionByCandidate.set(s.candidate.id, s);
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: "bg-gray-100 text-gray-600",
      IN_PROGRESS: "bg-blue-100 text-blue-700",
      COMPLETED: "bg-green-100 text-green-700",
      FLAGGED: "bg-red-100 text-red-700",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
        {status.replace("_", " ")}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Enrollment funnel stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Invited", value: invited, color: "text-gray-900" },
          { label: "Started", value: started, color: "text-blue-700" },
          { label: "Completed", value: completed, color: "text-green-700" },
          { label: "Flagged", value: flagged, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Invite section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Invite Candidates</h2>

        {/* Shareable link */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">Shareable link</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="flex-grow px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
            />
            <button
              onClick={copyLink}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 min-w-[80px]"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Bulk email */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
            Bulk invite by email
          </label>
          <textarea
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            placeholder="email1@example.com, email2@example.com"
          />
          <button
            onClick={handleBulkInvite}
            disabled={inviting || !emails.trim()}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {inviting ? "Sending…" : "Send Invites"}
          </button>
          {inviteResult && (
            <p className={`mt-2 text-sm ${inviteResult.ok ? "text-green-600" : "text-red-600"}`}>
              {inviteResult.ok ? "✓ " : "✗ "}{inviteResult.message}
            </p>
          )}
        </div>
      </div>

      {/* Invited candidates table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Candidates ({invited})</h2>
          {invited > 0 && (
            <span className="text-xs text-gray-400">{started} started · {completed} completed</span>
          )}
        </div>

        {allInvites.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No candidates invited yet. Use the invite link or bulk email above.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Candidate</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Signed in</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Assessment</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Score</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Invited</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allInvites.map((inv) => {
                const sess = inv.user ? sessionByCandidate.get(inv.user.id) : undefined;
                return (
                  <tr
                    key={inv.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => inv.user && router.push(`/admin/candidates/${inv.user.id}`)}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{inv.user?.name ?? "—"}</p>
                      <p className="text-gray-500 text-xs">{inv.email}</p>
                    </td>
                    <td className="px-5 py-3 text-center">
                      {inv.user?.emailVerified ? (
                        <span className="text-xs text-green-600">✓ Yes</span>
                      ) : (
                        <span className="text-xs text-gray-400">Not yet</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {sess ? statusBadge(sess.status) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-600">Pending</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center font-medium text-gray-900">
                      {sess?.overallScore != null ? sess.overallScore.toFixed(0) : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {new Date(inv.invitedAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {sess && (
                        <Link
                          href={`/admin/results/${sess.id}`}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          Report
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Sessions without invites (e.g. self-registered via shared link) */}
      {(() => {
        const invitedUserIds = new Set(allInvites.map((i) => i.user?.id).filter(Boolean));
        const orphanSessions = allSessions.filter((s) => !invitedUserIds.has(s.candidate.id));
        if (orphanSessions.length === 0) return null;
        return (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Self-registered via link ({orphanSessions.length})</h2>
              <p className="text-xs text-gray-400 mt-0.5">Candidates who accessed the shared link without a direct invite</p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Candidate</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Score</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orphanSessions.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/admin/candidates/${s.candidate.id}`)}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{s.candidate.name ?? "—"}</p>
                      <p className="text-gray-500 text-xs">{s.candidate.email}</p>
                    </td>
                    <td className="px-5 py-3 text-center">{statusBadge(s.status)}</td>
                    <td className="px-5 py-3 text-center font-medium text-gray-900">
                      {s.overallScore != null ? s.overallScore.toFixed(0) : "—"}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {s.completedAt
                        ? new Date(s.completedAt).toLocaleDateString()
                        : s.startedAt
                          ? new Date(s.startedAt).toLocaleDateString()
                          : "—"}
                    </td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/admin/results/${s.id}`} className="text-blue-600 hover:text-blue-800 text-xs">
                        Report
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}
    </div>
  );
}
