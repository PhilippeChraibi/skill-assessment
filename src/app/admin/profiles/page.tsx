"use client";

import { useEffect, useState } from "react";

const JOB_FAMILIES = [
  { value: "SOURCING", label: "Sourcing" },
  { value: "PROCUREMENT", label: "Procurement" },
  { value: "LOGISTICS", label: "Logistics" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "SUPPLY_CHAIN", label: "Supply Chain" },
  { value: "CONTRACT_MGMT", label: "Contract Management" },
  { value: "CATEGORY_MGMT", label: "Category Management" },
  { value: "SUSTAINABILITY", label: "Sustainability" },
  { value: "STRATEGY", label: "Strategy" },
];

const SENIORITY_LEVELS = [
  { value: "L1_JUNIOR", label: "L1 – Junior" },
  { value: "L2_MID", label: "L2 – Mid" },
  { value: "L3_SENIOR", label: "L3 – Senior" },
  { value: "L4_LEAD", label: "L4 – Lead" },
  { value: "L5_MANAGER", label: "L5 – Manager" },
  { value: "L6_EXECUTIVE", label: "L6 – Executive" },
];

interface Profile {
  id: string;
  jobFamily: string;
  seniorityLevel: string;
  displayName: { en: string; fr?: string };
  isActive: boolean;
  _count: { campaigns: number; questions: number };
}

const emptyForm = { jobFamily: "", seniorityLevel: "", displayNameEn: "", displayNameFr: "" };

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ displayNameEn: "", displayNameFr: "" });
  const [actionError, setActionError] = useState<Record<string, string>>({});

  const load = () => {
    setLoading(true);
    fetch("/api/admin/profiles")
      .then((r) => r.json())
      .then(setProfiles)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    const res = await fetch("/api/admin/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setFormError(data.error ?? "Failed to create profile.");
    } else {
      setShowCreate(false);
      setForm(emptyForm);
      load();
    }
    setSubmitting(false);
  };

  const handleToggleActive = async (p: Profile) => {
    setActionError((prev) => ({ ...prev, [p.id]: "" }));
    const res = await fetch(`/api/admin/profiles/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    if (!res.ok) {
      const data = await res.json();
      setActionError((prev) => ({ ...prev, [p.id]: data.error }));
    } else {
      load();
    }
  };

  const startEdit = (p: Profile) => {
    setEditingId(p.id);
    setEditForm({ displayNameEn: p.displayName.en, displayNameFr: p.displayName.fr ?? "" });
    setActionError((prev) => ({ ...prev, [p.id]: "" }));
  };

  const handleSaveEdit = async (id: string) => {
    const res = await fetch(`/api/admin/profiles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (!res.ok) {
      const data = await res.json();
      setActionError((prev) => ({ ...prev, [id]: data.error }));
    } else {
      setEditingId(null);
      load();
    }
  };

  const handleDelete = async (p: Profile) => {
    if (!confirm(`Delete "${p.displayName.en}"? This cannot be undone.`)) return;
    setActionError((prev) => ({ ...prev, [p.id]: "" }));
    const res = await fetch(`/api/admin/profiles/${p.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      setActionError((prev) => ({ ...prev, [p.id]: data.error }));
    } else {
      load();
    }
  };

  const grouped = JOB_FAMILIES.map((f) => ({
    family: f,
    profiles: profiles.filter((p) => p.jobFamily === f.value),
  })).filter((g) => g.profiles.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Profiles</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define the roles candidates are assessed against. Each profile links to questions and campaigns.
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setFormError(""); setForm(emptyForm); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + New Profile
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">New Job Profile</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Family</label>
                <select
                  required
                  value={form.jobFamily}
                  onChange={(e) => setForm({ ...form, jobFamily: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select…</option>
                  {JOB_FAMILIES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seniority Level</label>
                <select
                  required
                  value={form.seniorityLevel}
                  onChange={(e) => setForm({ ...form, seniorityLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select…</option>
                  {SENIORITY_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name (English) <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.displayNameEn}
                  onChange={(e) => setForm({ ...form, displayNameEn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Senior Buyer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name (French)</label>
                <input
                  value={form.displayNameFr}
                  onChange={(e) => setForm({ ...form, displayNameFr: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Acheteur Senior"
                />
              </div>
            </div>
            {formError && <p className="text-red-600 text-sm">{formError}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create Profile"}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading…</div>
      ) : profiles.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <p className="text-lg font-medium text-gray-500 mb-2">No job profiles yet</p>
          <p className="text-sm">Click <strong>+ New Profile</strong> to create one, or go to <strong>Organization → Initialize</strong> to load the standard set.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ family, profiles: fps }) => (
            <div key={family.value} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">{family.label}</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Level</th>
                    <th className="text-left px-5 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Display Name (EN)</th>
                    <th className="text-left px-5 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Display Name (FR)</th>
                    <th className="text-center px-5 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Campaigns</th>
                    <th className="text-center px-5 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Questions</th>
                    <th className="text-center px-5 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-5 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {fps.map((p) => (
                    <>
                      <tr key={p.id} className={`hover:bg-gray-50 ${!p.isActive ? "opacity-50" : ""}`}>
                        <td className="px-5 py-3 font-mono text-xs text-gray-500">
                          {SENIORITY_LEVELS.find((l) => l.value === p.seniorityLevel)?.label ?? p.seniorityLevel}
                        </td>
                        <td className="px-5 py-3 text-gray-900">
                          {editingId === p.id ? (
                            <input
                              value={editForm.displayNameEn}
                              onChange={(e) => setEditForm({ ...editForm, displayNameEn: e.target.value })}
                              className="w-full px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                          ) : p.displayName.en}
                        </td>
                        <td className="px-5 py-3 text-gray-600">
                          {editingId === p.id ? (
                            <input
                              value={editForm.displayNameFr}
                              onChange={(e) => setEditForm({ ...editForm, displayNameFr: e.target.value })}
                              className="w-full px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (p.displayName.fr ?? "—")}
                        </td>
                        <td className="px-5 py-3 text-center text-gray-500">{p._count.campaigns}</td>
                        <td className="px-5 py-3 text-center text-gray-500">{p._count.questions}</td>
                        <td className="px-5 py-3 text-center">
                          <button
                            onClick={() => handleToggleActive(p)}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                              p.isActive
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                            }`}
                          >
                            {p.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            {editingId === p.id ? (
                              <>
                                <button
                                  onClick={() => handleSaveEdit(p.id)}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="text-gray-400 hover:text-gray-600 text-xs"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(p)}
                                  className="text-gray-400 hover:text-blue-600 text-xs font-medium"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(p)}
                                  className="text-gray-300 hover:text-red-500 text-xs"
                                  title={p._count.campaigns > 0 || p._count.questions > 0 ? "Cannot delete — in use" : "Delete"}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {actionError[p.id] && (
                        <tr key={`${p.id}-err`}>
                          <td colSpan={7} className="px-5 pb-3">
                            <p className="text-red-600 text-xs">{actionError[p.id]}</p>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
