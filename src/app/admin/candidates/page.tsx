"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Candidate {
  id: string;
  email: string;
  name: string | null;
  jobTitle: string | null;
  company: string | null;
  createdAt: string;
  emailVerified: string | null;
  candidateProfile: {
    onboardingCompletedAt: string | null;
    yearsOfExperience: string | null;
    country: string | null;
    industrySector: string | null;
    certifications: string[];
  } | null;
  sessions: { id: string; status: string; overallScore: number | null; completedAt: string | null }[];
}

const emptyForm = { email: "", name: "", jobTitle: "", company: "" };

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/candidates")
      .then((r) => r.json())
      .then(setCandidates)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    setFormSuccess("");
    const res = await fetch("/api/admin/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setFormError(data.error ?? "Failed to invite candidate.");
    } else {
      setFormSuccess(`Invite sent to ${data.email}.`);
      setForm(emptyForm);
      load();
    }
    setSubmitting(false);
  };

  const handleDelete = async (c: Candidate) => {
    if (!confirm(`Remove ${c.email} from the platform?`)) return;
    await fetch(`/api/admin/candidates/${c.id}`, { method: "DELETE" });
    load();
  };

  const filtered = candidates.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.email.toLowerCase().includes(q) ||
      (c.name ?? "").toLowerCase().includes(q) ||
      (c.jobTitle ?? "").toLowerCase().includes(q) ||
      (c.company ?? "").toLowerCase().includes(q)
    );
  });

  const completedSessions = (c: Candidate) => c.sessions.filter((s) => s.status === "COMPLETED");
  const bestScore = (c: Candidate) => {
    const scores = completedSessions(c).map((s) => s.overallScore).filter((s): s is number => s !== null);
    return scores.length ? Math.max(...scores) : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
          <p className="text-sm text-gray-500 mt-1">{candidates.length} candidate{candidates.length !== 1 ? "s" : ""} in your organisation</p>
        </div>
        <button
          onClick={() => { setShowInvite(true); setFormError(""); setFormSuccess(""); setForm(emptyForm); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + Invite Candidate
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Invite a Candidate</h2>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="candidate@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Senior Buyer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Acme Corp"
                />
              </div>
            </div>
            {formError && <p className="text-red-600 text-sm">{formError}</p>}
            {formSuccess && <p className="text-green-600 text-sm">✓ {formSuccess}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Sending invite…" : "Send Invite"}
              </button>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      {candidates.length > 0 && (
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          placeholder="Search by name, email, job title or company…"
        />
      )}

      {/* List */}
      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          {candidates.length === 0
            ? <p>No candidates yet. Click <strong>+ Invite Candidate</strong> to get started.</p>
            : <p>No candidates match your search.</p>
          }
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Candidate</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Role / Company</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Assessments</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Best Score</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Profile</th>
                <th className="text-center px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Signed in</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <>
                  <tr
                    key={c.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{c.name ?? "—"}</p>
                      <p className="text-gray-500 text-xs">{c.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-gray-800">{c.jobTitle ?? "—"}</p>
                      <p className="text-gray-500 text-xs">{c.company ?? "—"}</p>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="font-medium text-gray-900">{completedSessions(c).length}</span>
                      <span className="text-gray-400">/{c.sessions.length}</span>
                    </td>
                    <td className="px-5 py-3 text-center font-medium text-gray-900">
                      {bestScore(c) !== null ? `${bestScore(c)!.toFixed(0)}` : "—"}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {c.candidateProfile?.onboardingCompletedAt ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Complete</span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Pending</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      {c.emailVerified ? (
                        <span className="text-xs text-green-600">✓ Yes</span>
                      ) : (
                        <span className="text-xs text-gray-400">Not yet</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(c)}
                        className="text-xs text-gray-300 hover:text-red-500"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>

                  {/* Expanded row — demographics + sessions */}
                  {expandedId === c.id && (
                    <tr key={`${c.id}-expanded`} className="bg-blue-50">
                      <td colSpan={7} className="px-5 py-4">
                        <div className="grid grid-cols-2 gap-6">
                          {/* Demographics */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Demographics</p>
                            {c.candidateProfile ? (
                              <dl className="space-y-1 text-sm">
                                {c.candidateProfile.yearsOfExperience && (
                                  <div className="flex gap-2">
                                    <dt className="text-gray-500 w-36 shrink-0">Experience</dt>
                                    <dd className="text-gray-900">{c.candidateProfile.yearsOfExperience} years</dd>
                                  </div>
                                )}
                                {c.candidateProfile.country && (
                                  <div className="flex gap-2">
                                    <dt className="text-gray-500 w-36 shrink-0">Country</dt>
                                    <dd className="text-gray-900">{c.candidateProfile.country}</dd>
                                  </div>
                                )}
                                {c.candidateProfile.industrySector && (
                                  <div className="flex gap-2">
                                    <dt className="text-gray-500 w-36 shrink-0">Industry</dt>
                                    <dd className="text-gray-900">{c.candidateProfile.industrySector}</dd>
                                  </div>
                                )}
                                {c.candidateProfile.certifications?.length > 0 && (
                                  <div className="flex gap-2">
                                    <dt className="text-gray-500 w-36 shrink-0">Certifications</dt>
                                    <dd className="text-gray-900">{c.candidateProfile.certifications.join(", ")}</dd>
                                  </div>
                                )}
                                {!c.candidateProfile.onboardingCompletedAt && (
                                  <p className="text-gray-400 text-xs italic">Candidate has not completed the demographic questionnaire yet.</p>
                                )}
                              </dl>
                            ) : (
                              <p className="text-gray-400 text-xs italic">No profile information yet.</p>
                            )}
                          </div>

                          {/* Sessions */}
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Assessment History</p>
                            {c.sessions.length === 0 ? (
                              <p className="text-gray-400 text-xs italic">No assessments taken yet.</p>
                            ) : (
                              <div className="space-y-1">
                                {c.sessions.map((s) => (
                                  <div key={s.id} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        s.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                                        s.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                                        "bg-gray-100 text-gray-600"
                                      }`}>
                                        {s.status}
                                      </span>
                                      {s.completedAt && (
                                        <span className="text-gray-400 text-xs">{new Date(s.completedAt).toLocaleDateString()}</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {s.overallScore !== null && (
                                        <span className="font-medium text-gray-900">{s.overallScore.toFixed(0)}</span>
                                      )}
                                      <Link
                                        href={`/admin/results/${s.id}`}
                                        className="text-blue-600 hover:text-blue-800 text-xs"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Details →
                                      </Link>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
