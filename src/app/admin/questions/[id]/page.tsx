"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const TRACK_LABELS: Record<string, string> = {
  DIRECT_PROCUREMENT: "Direct Procurement",
  INDIRECT_PROCUREMENT: "Indirect Procurement",
  PUBLIC_PROCUREMENT: "Public Procurement",
  SUPPLY_CHAIN: "Supply Chain",
  PROCUREMENT_EXCELLENCE: "Procurement Excellence",
};

interface ProfileAssignment {
  profileId: string;
  difficultyWeight: number;
  proficiencyTarget: string;
  profile: {
    id: string;
    track: string;
    band: number;
    displayName: { en: string };
    bandLabel: string;
  };
}

interface AllProfile {
  id: string;
  track: string;
  band: number;
  displayName: { en: string };
  bandLabel: string;
}

export default function EditQuestionPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [question, setQuestion] = useState<any>(null);
  const [allProfiles, setAllProfiles] = useState<AllProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingProfile, setAddingProfile] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState("");

  const reload = () => {
    fetch(`/api/admin/questions/${id}`)
      .then((r) => r.json())
      .then(setQuestion)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    fetch("/api/admin/profiles")
      .then((r) => r.json())
      .then((data) => setAllProfiles(Array.isArray(data) ? data : []));
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/admin/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: question.content,
        domainTag: question.domainTag,
        difficultyWeight: question.difficultyWeight,
        isActive: question.isActive,
        dimension: question.dimension,
      }),
    });
    setSaving(false);
    router.push("/admin/questions");
  };

  const handleDeactivate = async () => {
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    router.push("/admin/questions");
  };

  const handleRemoveProfile = async (profileId: string) => {
    await fetch(`/api/admin/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeProfile: profileId }),
    });
    reload();
  };

  const handleAddProfile = async () => {
    if (!selectedToAdd) return;
    await fetch(`/api/admin/questions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addProfile: { profileId: selectedToAdd, difficultyWeight: question.difficultyWeight },
      }),
    });
    setAddingProfile(false);
    setSelectedToAdd("");
    reload();
  };

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading...</div>;
  if (!question) return <div className="text-red-600 py-12 text-center">Question not found</div>;

  const assignedIds = new Set((question.profiles ?? []).map((a: ProfileAssignment) => a.profileId));
  const availableToAdd = allProfiles.filter((p) => !assignedIds.has(p.id));

  // Group available profiles by track for the dropdown
  const groupedAvailable = Object.entries(
    availableToAdd.reduce<Record<string, AllProfile[]>>((acc, p) => {
      if (!acc[p.track]) acc[p.track] = [];
      acc[p.track].push(p);
      return acc;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Edit Question</h1>

      {/* Core fields */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="flex gap-3 text-sm flex-wrap">
          <span className="px-2 py-1 bg-gray-100 rounded">{question.questionType}</span>
          <span className="px-2 py-1 bg-gray-100 rounded">{question.dimension}</span>
          <span className="px-2 py-1 bg-gray-100 rounded">{question.language?.toUpperCase()}</span>
          <span className={`px-2 py-1 rounded ${question.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {question.isActive ? "Active" : "Inactive"}
          </span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Domain Tag</label>
          <input
            value={question.domainTag}
            onChange={(e) => setQuestion({ ...question, domainTag: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Weight (base)</label>
          <input
            type="number"
            min={1} max={3} step={0.1}
            value={question.difficultyWeight}
            onChange={(e) => setQuestion({ ...question, difficultyWeight: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Question Stem</label>
          <textarea
            rows={4}
            value={question.content?.stem ?? ""}
            onChange={(e) => setQuestion({
              ...question,
              content: { ...question.content, stem: e.target.value },
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Content (JSON)</label>
          <textarea
            rows={8}
            value={JSON.stringify(question.content, null, 2)}
            onChange={(e) => {
              try {
                setQuestion({ ...question, content: JSON.parse(e.target.value) });
              } catch {}
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
          />
        </div>

        {question.variants?.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Variants ({question.variants.length})
            </h3>
            <div className="space-y-2">
              {question.variants.map((v: any) => (
                <div key={v.id} className="bg-gray-50 p-3 rounded-lg text-sm">
                  <span className="text-gray-500">[{v.language}]</span>{" "}
                  {v.content?.stem?.slice(0, 100)}...
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-base font-medium text-gray-900">{question.content?.stem}</p>
            {question.content?.options && (
              <ul className="mt-3 space-y-2">
                {question.content.options.map((opt: string, i: number) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                    {opt}
                    {question.content.correctAnswer === i && (
                      <span className="text-green-600 text-xs">(correct)</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-between">
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => router.back()}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
          <button
            onClick={handleDeactivate}
            className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
          >
            Deactivate
          </button>
        </div>
      </div>

      {/* Profile assignments */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-gray-900">Profile Assignments</h2>
            <p className="text-xs text-gray-500 mt-0.5">Which job profiles use this question</p>
          </div>
          {availableToAdd.length > 0 && (
            <button
              onClick={() => setAddingProfile(!addingProfile)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              + Add Profile
            </button>
          )}
        </div>

        {addingProfile && (
          <div className="flex gap-2 mb-4">
            <select
              value={selectedToAdd}
              onChange={(e) => setSelectedToAdd(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select a profile…</option>
              {groupedAvailable.map(([track, fps]) => (
                <optgroup key={track} label={TRACK_LABELS[track] ?? track}>
                  {fps.sort((a, b) => a.band - b.band).map((p) => (
                    <option key={p.id} value={p.id}>
                      Band {p.band} – {(p.displayName as any).en}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              onClick={handleAddProfile}
              disabled={!selectedToAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
            <button
              onClick={() => { setAddingProfile(false); setSelectedToAdd(""); }}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        )}

        {question.profiles?.length === 0 ? (
          <p className="text-sm text-amber-600 py-2">
            Not assigned to any profile — this question will not appear in assessments.
          </p>
        ) : (
          <div className="space-y-2">
            {(question.profiles as ProfileAssignment[]).map((a) => (
              <div key={a.profileId} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                  B{a.profile.band}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{(a.profile.displayName as any).en}</p>
                  <p className="text-xs text-gray-400">
                    {TRACK_LABELS[a.profile.track] ?? a.profile.track} · {a.profile.bandLabel}
                    {" · "}weight {a.difficultyWeight.toFixed(1)}
                    {" · "}target {a.proficiencyTarget}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveProfile(a.profileId)}
                  className="text-gray-300 hover:text-red-500 text-xs flex-shrink-0"
                  title="Remove from this profile"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
