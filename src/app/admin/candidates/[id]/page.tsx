"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface CandidateProfile {
  yearsOfExperience: string | null;
  country: string | null;
  industrySector: string | null;
  ageRange: string | null;
  gender: string | null;
  educationLevel: string | null;
  certifications: string[];
  teamSize: string | null;
  onboardingCompletedAt: string | null;
}

interface Session {
  id: string;
  status: string;
  overallScore: number | null;
  theoryScore: number | null;
  practiceScore: number | null;
  integrityScore: number | null;
  createdAt: string;
  completedAt: string | null;
  durationSeconds: number | null;
  campaign: { id: string; name: string } | null;
  jobProfile: { id: string; displayName: Record<string, string>; track: string; band: number; bandLabel: string } | null;
}

interface CampaignSummary {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  isArchived: boolean;
  jobProfile: { displayName: Record<string, string>; band: number; track: string; bandLabel: string };
}

// Campaigns available to assign (from /api/admin/campaigns list)
type Campaign = CampaignSummary;

interface CampaignInvite {
  id: string;
  invitedAt: string;
  campaign: CampaignSummary;
}

interface Candidate {
  id: string;
  email: string;
  name: string | null;
  jobTitle: string | null;
  company: string | null;
  createdAt: string;
  emailVerified: string | null;
  preferredLanguage: string;
  candidateProfile: CandidateProfile | null;
  sessions: Session[];
  campaignInvites: CampaignInvite[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const DEMO_LABELS: Record<string, string> = {
  yearsOfExperience: "Years of Experience",
  country: "Country",
  industrySector: "Industry / Sector",
  ageRange: "Age Range",
  gender: "Gender",
  educationLevel: "Education Level",
  teamSize: "Team Size Managed",
  certifications: "Certifications",
};

const DEMO_KEYS = Object.keys(DEMO_LABELS) as (keyof CandidateProfile)[];

function scoreColor(score: number | null) {
  if (score === null) return "text-gray-400";
  if (score >= 75) return "text-green-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function formatDuration(secs: number | null) {
  if (!secs) return "—";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

// ─── Page ────────────────────────────────────────────────────────────────────────

export default function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", jobTitle: "", company: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Campaign assignment
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const [cRes, campRes] = await Promise.all([
      fetch(`/api/admin/candidates/${id}`),
      fetch("/api/admin/campaigns"),
    ]);
    if (cRes.status === 404) { setNotFound(true); setLoading(false); return; }
    const [cData, campData] = await Promise.all([cRes.json(), campRes.json()]);
    setCandidate(cData);
    setCampaigns(campData ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const startEdit = () => {
    if (!candidate) return;
    setEditForm({ name: candidate.name ?? "", jobTitle: candidate.jobTitle ?? "", company: candidate.company ?? "" });
    setSaveError("");
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    const res = await fetch(`/api/admin/candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (!res.ok) {
      const d = await res.json();
      setSaveError(d.error ?? "Failed to save.");
    } else {
      setEditing(false);
      load();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!candidate) return;
    if (!confirm(`Remove ${candidate.email} from the platform? This cannot be undone.`)) return;
    await fetch(`/api/admin/candidates/${id}`, { method: "DELETE" });
    router.push("/admin/candidates");
  };

  const handleAssign = async () => {
    if (!selectedCampaign || !candidate) return;
    setAssigning(true);
    setAssignMsg(null);
    const res = await fetch(`/api/admin/campaigns/${selectedCampaign}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: [candidate.email] }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAssignMsg({ type: "err", text: data.error ?? "Failed to assign campaign." });
    } else {
      setAssignMsg({ type: "ok", text: `Invite sent to ${candidate.email} for "${campaigns.find(c => c.id === selectedCampaign)?.name}".` });
      setSelectedCampaign("");
      load();
    }
    setAssigning(false);
  };

  if (loading) return <div className="text-gray-400 py-16 text-center">Loading…</div>;
  if (notFound || !candidate) return (
    <div className="text-center py-16">
      <p className="text-gray-500 mb-4">Candidate not found.</p>
      <Link href="/admin/candidates" className="text-blue-600 hover:underline text-sm">← Back to Candidates</Link>
    </div>
  );

  const completedSessions = candidate.sessions.filter(s => s.status === "COMPLETED");
  const bestScore = completedSessions.length
    ? Math.max(...completedSessions.map(s => s.overallScore ?? 0))
    : null;

  const hasProfile = !!candidate.candidateProfile?.onboardingCompletedAt;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin/candidates" className="hover:text-gray-800">Candidates</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{candidate.name ?? candidate.email}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold flex-shrink-0">
              {(candidate.name ?? candidate.email).charAt(0).toUpperCase()}
            </div>
            <div>
              {editing ? (
                <div className="space-y-2">
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Full name"
                    className="block w-64 px-3 py-1.5 border border-blue-400 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <input
                      value={editForm.jobTitle}
                      onChange={e => setEditForm({ ...editForm, jobTitle: e.target.value })}
                      placeholder="Job title"
                      className="w-48 px-3 py-1.5 border border-blue-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      value={editForm.company}
                      onChange={e => setEditForm({ ...editForm, company: e.target.value })}
                      placeholder="Company"
                      className="w-48 px-3 py-1.5 border border-blue-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {saveError && <p className="text-red-600 text-xs">{saveError}</p>}
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-gray-900">{candidate.name ?? <span className="text-gray-400 italic">No name</span>}</h1>
                  <p className="text-gray-500 text-sm">{candidate.email}</p>
                  {(candidate.jobTitle || candidate.company) && (
                    <p className="text-gray-600 text-sm mt-0.5">
                      {[candidate.jobTitle, candidate.company].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={startEdit}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-5 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{candidate.sessions.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Assessments taken</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{completedSessions.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Completed</p>
          </div>
          <div className="text-center">
            <p className={`text-2xl font-bold ${scoreColor(bestScore)}`}>
              {bestScore !== null ? `${bestScore.toFixed(0)}` : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Best score</p>
          </div>
          <div className="text-center">
            <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${
              hasProfile ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
            }`}>
              {hasProfile ? "Profile complete" : "Profile pending"}
            </span>
            <p className="text-xs text-gray-500 mt-1.5">Demographics</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Demographics */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Demographics</h2>
          {!candidate.candidateProfile || !hasProfile ? (
            <p className="text-gray-400 text-sm italic">
              {candidate.candidateProfile
                ? "Candidate has not completed the demographic questionnaire yet."
                : "No demographic data collected yet."}
            </p>
          ) : (
            <dl className="space-y-3">
              {DEMO_KEYS.map(key => {
                const val = candidate.candidateProfile![key];
                if (!val || (Array.isArray(val) && val.length === 0)) return null;
                return (
                  <div key={key} className="flex gap-3">
                    <dt className="text-sm text-gray-500 w-44 shrink-0">{DEMO_LABELS[key]}</dt>
                    <dd className="text-sm text-gray-900 font-medium">
                      {Array.isArray(val) ? val.join(", ") : String(val)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
        </div>

        {/* Account info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Account</h2>
          <dl className="space-y-3">
            <div className="flex gap-3">
              <dt className="text-sm text-gray-500 w-44 shrink-0">Email</dt>
              <dd className="text-sm text-gray-900 font-medium">{candidate.email}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-sm text-gray-500 w-44 shrink-0">Signed in</dt>
              <dd className="text-sm">
                {candidate.emailVerified
                  ? <span className="text-green-600 font-medium">✓ Verified</span>
                  : <span className="text-gray-400">Not yet</span>}
              </dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-sm text-gray-500 w-44 shrink-0">Language</dt>
              <dd className="text-sm text-gray-900 font-medium uppercase">{candidate.preferredLanguage}</dd>
            </div>
            <div className="flex gap-3">
              <dt className="text-sm text-gray-500 w-44 shrink-0">Added</dt>
              <dd className="text-sm text-gray-900">{new Date(candidate.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Campaign Assignments (existing) */}
      {candidate.campaignInvites.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Campaign Assignments</h2>
            <span className="text-xs text-gray-400">{candidate.campaignInvites.length} campaign{candidate.campaignInvites.length !== 1 ? "s" : ""}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Campaign</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Profile</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Score</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Invited</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {candidate.campaignInvites.map(inv => {
                // Find session for this campaign
                const sess = candidate.sessions.find(s => s.campaign?.id === inv.campaign.id);
                const isActive = !inv.campaign.isArchived && new Date(inv.campaign.startsAt) <= new Date() && new Date(inv.campaign.endsAt) >= new Date();
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Link href={`/admin/campaigns/${inv.campaign.id}`} className="font-medium text-blue-600 hover:text-blue-800">
                        {inv.campaign.name}
                      </Link>
                      {!isActive && (
                        <span className="ml-2 text-xs text-gray-400">{inv.campaign.isArchived ? "archived" : new Date(inv.campaign.endsAt) < new Date() ? "ended" : "not started"}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-600">
                      {(inv.campaign.jobProfile.displayName as any)?.en ?? inv.campaign.jobProfile.track.replace(/_/g, " ")}
                      <span className="ml-1.5 text-xs text-gray-400">L{inv.campaign.jobProfile.band}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sess ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          sess.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                          sess.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{sess.status.replace("_", " ")}</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-50 text-amber-600">Invited</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-center font-bold ${scoreColor(sess?.overallScore ?? null)}`}>
                      {sess?.overallScore != null ? sess.overallScore.toFixed(0) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(inv.invitedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {sess?.status === "COMPLETED" && (
                        <Link href={`/admin/results/${sess.id}`} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                          Report →
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign to new campaign */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Assign Campaign</h2>
        <p className="text-sm text-gray-500 mb-4">Send this candidate an invite to an active campaign.</p>
        <div className="flex gap-3 items-start">
          <select
            value={selectedCampaign}
            onChange={e => { setSelectedCampaign(e.target.value); setAssignMsg(null); }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a campaign…</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} — L{c.jobProfile?.band} {(c.jobProfile?.displayName as any)?.en ?? c.jobProfile?.track}
              </option>
            ))}
          </select>
          <button
            onClick={handleAssign}
            disabled={!selectedCampaign || assigning}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            {assigning ? "Sending…" : "Send Invite"}
          </button>
        </div>
        {assignMsg && (
          <p className={`mt-3 text-sm font-medium ${assignMsg.type === "ok" ? "text-green-700" : "text-red-600"}`}>
            {assignMsg.type === "ok" ? "✓ " : ""}{assignMsg.text}
          </p>
        )}
      </div>

      {/* Assessment history */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Assessment History</h2>
        </div>
        {candidate.sessions.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-400 text-sm">No assessments taken yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Campaign</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Profile</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Overall</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Theory</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Practice</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {candidate.sessions.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <p className="font-medium text-gray-900">{s.campaign?.name ?? "—"}</p>
                  </td>
                  <td className="px-6 py-3">
                    {s.jobProfile ? (
                      <>
                        <p className="text-gray-800">{(s.jobProfile.displayName as any)?.en ?? "—"}</p>
                        <p className="text-xs text-gray-400">L{s.jobProfile.band} · {s.jobProfile.bandLabel}</p>
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                      s.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {s.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-center font-bold ${scoreColor(s.overallScore)}`}>
                    {s.overallScore !== null ? s.overallScore.toFixed(0) : "—"}
                  </td>
                  <td className={`px-4 py-3 text-center text-sm ${scoreColor(s.theoryScore)}`}>
                    {s.theoryScore !== null ? s.theoryScore.toFixed(0) : "—"}
                  </td>
                  <td className={`px-4 py-3 text-center text-sm ${scoreColor(s.practiceScore)}`}>
                    {s.practiceScore !== null ? s.practiceScore.toFixed(0) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500 text-xs">
                    {formatDuration(s.durationSeconds)}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500 text-xs">
                    {s.completedAt
                      ? new Date(s.completedAt).toLocaleDateString()
                      : new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status === "COMPLETED" ? (
                      <Link
                        href={`/admin/results/${s.id}`}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Report →
                      </Link>
                    ) : s.status === "IN_PROGRESS" ? (
                      <span className="text-xs text-gray-400">In progress</span>
                    ) : (
                      <span className="text-xs text-gray-400">Pending</span>
                    )}
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
