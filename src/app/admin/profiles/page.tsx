"use client";

import { useEffect, useState } from "react";

const TRACKS = [
  { value: "DIRECT_PROCUREMENT", label: "Direct Procurement", sector: "PRIVATE" },
  { value: "INDIRECT_PROCUREMENT", label: "Indirect Procurement", sector: "PRIVATE" },
  { value: "PUBLIC_PROCUREMENT", label: "Public Procurement", sector: "PUBLIC" },
  { value: "SUPPLY_CHAIN", label: "Supply Chain", sector: "PRIVATE" },
  { value: "PROCUREMENT_EXCELLENCE", label: "Procurement Excellence", sector: "BOTH" },
];

const SECTORS = [
  { value: "PRIVATE", label: "Private" },
  { value: "PUBLIC", label: "Public" },
  { value: "BOTH", label: "Both" },
];

const BAND_LABELS: Record<number, string> = {
  1: "Foundational",
  2: "Practitioner",
  3: "Advanced Practitioner",
  4: "Manager",
  5: "Senior Leader",
};

const SECTOR_COLORS: Record<string, string> = {
  PRIVATE: "bg-blue-100 text-blue-700",
  PUBLIC: "bg-purple-100 text-purple-700",
  BOTH: "bg-amber-100 text-amber-700",
};

interface Profile {
  id: string;
  track: string;
  band: number;
  sector: string;
  displayName: { en: string; fr?: string };
  bandLabel: string;
  typicalTitles: string[];
  typicalYears: string;
  isActive: boolean;
  _count: { campaigns: number; questions: number };
}

const emptyForm = {
  track: "",
  band: "",
  sector: "",
  displayNameEn: "",
  displayNameFr: "",
  bandLabel: "",
  typicalYears: "",
};

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    displayNameEn: "",
    displayNameFr: "",
    bandLabel: "",
    typicalYears: "",
  });
  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/admin/profiles")
      .then((r) => r.json())
      .then(setProfiles)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Auto-fill bandLabel when band changes
  const handleBandChange = (band: string) => {
    const label = BAND_LABELS[Number(band)] ?? "";
    setForm((f) => ({ ...f, band, bandLabel: label }));
  };

  // Auto-fill sector when track changes
  const handleTrackChange = (track: string) => {
    const t = TRACKS.find((x) => x.value === track);
    setForm((f) => ({ ...f, track, sector: t?.sector ?? "" }));
  };

  const handleSeed = async () => {
    if (!confirm("This will upsert all 24 standard procurement profiles. Existing profiles will be updated. Continue?")) return;
    setSeeding(true);
    setSeedMsg("");
    const res = await fetch("/api/admin/profiles/seed", { method: "POST" });
    const data = await res.json();
    if (!res.ok) setSeedMsg(`Error: ${data.error}`);
    else setSeedMsg(`${data.seeded} profiles seeded successfully.`);
    setSeeding(false);
    load();
  };

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
    setEditForm({
      displayNameEn: p.displayName.en,
      displayNameFr: p.displayName.fr ?? "",
      bandLabel: p.bandLabel,
      typicalYears: p.typicalYears,
    });
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

  // Group profiles by track, sorted by band within each track
  const grouped = TRACKS.map((t) => ({
    track: t,
    profiles: profiles
      .filter((p) => p.track === t.value)
      .sort((a, b) => a.band - b.band),
  })).filter((g) => g.profiles.length > 0);

  // Profiles that don't match any known track (custom)
  const knownTracks = new Set(TRACKS.map((t) => t.value));
  const customProfiles = profiles.filter((p) => !knownTracks.has(p.track));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Profiles</h1>
          <p className="text-sm text-gray-500 mt-1">
            5 tracks × up to 5 bands. Each profile links to questions and campaigns.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
          >
            {seeding ? "Seeding…" : "Seed Standard Profiles"}
          </button>
          <button
            onClick={() => { setShowCreate(true); setFormError(""); setForm(emptyForm); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            + Custom Profile
          </button>
        </div>
      </div>

      {seedMsg && (
        <div className={`px-4 py-3 rounded-lg text-sm ${seedMsg.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {seedMsg}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">New Job Profile</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Track <span className="text-red-500">*</span></label>
                <select
                  required
                  value={form.track}
                  onChange={(e) => handleTrackChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select…</option>
                  {TRACKS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Band <span className="text-red-500">*</span></label>
                <select
                  required
                  value={form.band}
                  onChange={(e) => handleBandChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select…</option>
                  {[1, 2, 3, 4, 5].map((b) => (
                    <option key={b} value={b}>Band {b} – {BAND_LABELS[b]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sector <span className="text-red-500">*</span></label>
                <select
                  required
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select…</option>
                  {SECTORS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
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
                  placeholder="e.g. Senior Direct Buyer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name (French)</label>
                <input
                  value={form.displayNameFr}
                  onChange={(e) => setForm({ ...form, displayNameFr: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Acheteur Direct Senior"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Band Label <span className="text-red-500">*</span></label>
                <input
                  required
                  value={form.bandLabel}
                  onChange={(e) => setForm({ ...form, bandLabel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Advanced Practitioner"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Typical Experience</label>
                <input
                  value={form.typicalYears}
                  onChange={(e) => setForm({ ...form, typicalYears: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 5–8 years"
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
          <p className="text-sm">Click <strong>Seed Standard Profiles</strong> to load the full 24-profile framework.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ track, profiles: fps }) => (
            <div key={track.value} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Track header */}
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide flex-1">
                  {track.label}
                </h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SECTOR_COLORS[track.sector]}`}>
                  {track.sector === "BOTH" ? "Public + Private" : track.sector === "PUBLIC" ? "Public sector" : "Private sector"}
                </span>
                <span className="text-xs text-gray-400">{fps.length} profile{fps.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Band rows */}
              <div className="divide-y divide-gray-50">
                {fps.map((p) => (
                  <div key={p.id}>
                    <div className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${!p.isActive ? "opacity-50" : ""}`}>
                      {/* Band badge */}
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                        B{p.band}
                      </div>

                      {/* Names */}
                      <div className="flex-1 min-w-0">
                        {editingId === p.id ? (
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              value={editForm.displayNameEn}
                              onChange={(e) => setEditForm({ ...editForm, displayNameEn: e.target.value })}
                              className="px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Name (EN)"
                              autoFocus
                            />
                            <input
                              value={editForm.displayNameFr}
                              onChange={(e) => setEditForm({ ...editForm, displayNameFr: e.target.value })}
                              className="px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Name (FR)"
                            />
                          </div>
                        ) : (
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 text-sm">{p.displayName.en}</span>
                            {p.displayName.fr && p.displayName.fr !== p.displayName.en && (
                              <span className="text-gray-400 text-xs">/ {p.displayName.fr}</span>
                            )}
                          </div>
                        )}
                        {editingId !== p.id && (
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-gray-400">{p.bandLabel}</span>
                            {p.typicalYears && (
                              <span className="text-xs text-gray-400">· {p.typicalYears}</span>
                            )}
                          </div>
                        )}
                        {editingId === p.id && (
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            <input
                              value={editForm.bandLabel}
                              onChange={(e) => setEditForm({ ...editForm, bandLabel: e.target.value })}
                              className="px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Band label"
                            />
                            <input
                              value={editForm.typicalYears}
                              onChange={(e) => setEditForm({ ...editForm, typicalYears: e.target.value })}
                              className="px-2 py-1 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Typical years"
                            />
                          </div>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-gray-400 flex-shrink-0">
                        <span title="Campaigns">{p._count.campaigns} campaign{p._count.campaigns !== 1 ? "s" : ""}</span>
                        <span title="Questions">{p._count.questions} question{p._count.questions !== 1 ? "s" : ""}</span>
                      </div>

                      {/* Typical titles toggle */}
                      {p.typicalTitles?.length > 0 && editingId !== p.id && (
                        <button
                          onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                          className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
                          title="View typical titles"
                        >
                          {expandedId === p.id ? "▲" : "▼"}
                        </button>
                      )}

                      {/* Status toggle */}
                      <button
                        onClick={() => handleToggleActive(p)}
                        className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                          p.isActive
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </button>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
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
                              title={p._count.campaigns > 0 ? "Cannot delete — used in campaigns" : "Delete"}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded typical titles */}
                    {expandedId === p.id && p.typicalTitles?.length > 0 && (
                      <div className="px-16 pb-3">
                        <p className="text-xs text-gray-400 mb-1">Typical titles:</p>
                        <div className="flex flex-wrap gap-1">
                          {p.typicalTitles.map((t, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {actionError[p.id] && (
                      <div className="px-5 pb-3">
                        <p className="text-red-600 text-xs">{actionError[p.id]}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Custom profiles */}
          {customProfiles.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Custom Profiles</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {customProfiles.map((p) => (
                  <div key={p.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 ${!p.isActive ? "opacity-50" : ""}`}>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center">
                      B{p.band}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 text-sm">{p.displayName.en}</span>
                      <div className="text-xs text-gray-400 mt-0.5">{p.track} · {p.bandLabel}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SECTOR_COLORS[p.sector] ?? "bg-gray-100 text-gray-600"}`}>
                      {p.sector}
                    </span>
                    <button
                      onClick={() => handleToggleActive(p)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                        p.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {p.isActive ? "Active" : "Inactive"}
                    </button>
                    <button onClick={() => handleDelete(p)} className="text-gray-300 hover:text-red-500 text-xs">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
