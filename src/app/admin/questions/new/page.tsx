"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const TRACK_LABELS: Record<string, string> = {
  DIRECT_PROCUREMENT: "Direct Procurement",
  INDIRECT_PROCUREMENT: "Indirect Procurement",
  PUBLIC_PROCUREMENT: "Public Procurement",
  SUPPLY_CHAIN: "Supply Chain",
  PROCUREMENT_EXCELLENCE: "Procurement Excellence",
};


interface Profile {
  id: string;
  track: string;
  band: number;
  displayName: { en: string };
  bandLabel: string;
}

export default function NewQuestionPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [form, setForm] = useState({
    language: "en",
    questionType: "MCQ",
    dimension: "THEORY",
    domainTag: "",
    difficultyWeight: 1.5,
    variantGroupId: "",
    stem: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    context: "",
    rubricCriteria: "",
    guidanceMin: 100,
    guidanceMax: 200,
  });
  const [selectedProfiles, setSelectedProfiles] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/profiles")
      .then((r) => r.json())
      .then((data) => setProfiles(Array.isArray(data) ? data : []));
  }, []);

  const toggleProfile = (id: string) => {
    setSelectedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildContent = () => {
    switch (form.questionType) {
      case "MCQ":
        return {
          stem: form.stem,
          options: form.options.filter(Boolean),
          correctAnswer: form.correctAnswer,
        };
      case "RANKED_CHOICE":
        return {
          stem: form.stem,
          options: form.options.filter(Boolean),
          correctOrder: form.options.filter(Boolean).map((_, i) => i),
        };
      case "SCENARIO":
        return {
          stem: form.stem,
          context: form.context,
          rubric: {
            criteria: form.rubricCriteria.split("\n").filter(Boolean),
            maxScore: 10,
          },
        };
      case "OPEN_TEXT":
        return {
          stem: form.stem,
          rubric: {
            criteria: form.rubricCriteria.split("\n").filter(Boolean),
            maxScore: 10,
          },
          guidanceWordCount: { min: form.guidanceMin, max: form.guidanceMax },
        };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const profileAssignments = [...selectedProfiles].map((profileId) => ({
      profileId,
      difficultyWeight: form.difficultyWeight,
    }));

    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: form.language,
        questionType: form.questionType,
        dimension: form.dimension,
        domainTag: form.domainTag,
        difficultyWeight: form.difficultyWeight,
        content: buildContent(),
        variantGroupId: form.variantGroupId || undefined,
        profileAssignments: profileAssignments.length > 0 ? profileAssignments : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setSubmitting(false);
      return;
    }

    router.push("/admin/questions");
  };

  const showOptions = ["MCQ", "RANKED_CHOICE"].includes(form.questionType);
  const showRubric = ["SCENARIO", "OPEN_TEXT"].includes(form.questionType);
  const showContext = form.questionType === "SCENARIO";

  // Group profiles by track
  const grouped = Object.entries(
    profiles.reduce<Record<string, Profile[]>>((acc, p) => {
      if (!acc[p.track]) acc[p.track] = [];
      acc[p.track].push(p);
      return acc;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Question</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <select
                value={form.language}
                onChange={(e) => setForm({ ...form, language: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {["en", "fr", "es", "de", "ar", "zh"].map((l) => (
                  <option key={l} value={l}>{l.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Weight (1–3)</label>
              <input
                type="number"
                min={1} max={3} step={0.1}
                value={form.difficultyWeight}
                onChange={(e) => setForm({ ...form, difficultyWeight: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={form.questionType}
                onChange={(e) => setForm({ ...form, questionType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="MCQ">MCQ</option>
                <option value="RANKED_CHOICE">Ranked Choice</option>
                <option value="SCENARIO">Scenario</option>
                <option value="OPEN_TEXT">Open Text</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dimension</label>
              <select
                value={form.dimension}
                onChange={(e) => setForm({ ...form, dimension: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="THEORY">Theory</option>
                <option value="PRACTICE">Practice</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain Tag</label>
              <input
                required
                value={form.domainTag}
                onChange={(e) => setForm({ ...form, domainTag: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="e.g. supplier-negotiation"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Variant Group ID <span className="text-gray-400 font-normal">(optional — shared across language variants)</span></label>
            <input
              value={form.variantGroupId}
              onChange={(e) => setForm({ ...form, variantGroupId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g. vg-supplier-negotiation-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Question Stem <span className="text-red-500">*</span></label>
            <textarea
              required
              rows={3}
              value={form.stem}
              onChange={(e) => setForm({ ...form, stem: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {showContext && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scenario Context</label>
              <textarea
                rows={4}
                value={form.context}
                onChange={(e) => setForm({ ...form, context: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}

          {showOptions && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Options</label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  {form.questionType === "MCQ" && (
                    <input
                      type="radio"
                      name="correct"
                      checked={form.correctAnswer === i}
                      onChange={() => setForm({ ...form, correctAnswer: i })}
                    />
                  )}
                  <input
                    value={opt}
                    onChange={(e) => {
                      const opts = [...form.options];
                      opts[i] = e.target.value;
                      setForm({ ...form, options: opts });
                    }}
                    className="flex-grow px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder={`Option ${i + 1}`}
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setForm({ ...form, options: [...form.options, ""] })}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add option
              </button>
            </div>
          )}

          {showRubric && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rubric Criteria <span className="text-gray-400 font-normal">(one per line)</span>
              </label>
              <textarea
                rows={4}
                value={form.rubricCriteria}
                onChange={(e) => setForm({ ...form, rubricCriteria: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder={"Demonstrates understanding of key concepts\nApplies appropriate frameworks\nClear and structured response"}
              />
            </div>
          )}
        </div>

        {/* Profile assignments */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Profile Assignments</h2>
          <p className="text-sm text-gray-500 mb-4">
            Select which job profiles this question is relevant to. Questions not assigned to any profile will not appear in assessments.
          </p>
          {profiles.length === 0 ? (
            <p className="text-sm text-amber-600">No profiles found — seed profiles first from the Job Profiles page.</p>
          ) : (
            <div className="space-y-3">
              {grouped.map(([track, fps]) => (
                <div key={track}>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    {TRACK_LABELS[track] ?? track}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {fps.sort((a, b) => a.band - b.band).map((p) => {
                      const selected = selectedProfiles.has(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleProfile(p.id)}
                          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                            selected
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                          }`}
                        >
                          L{p.band} – {(p.displayName as any).en}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          {selectedProfiles.size > 0 && (
            <p className="text-xs text-gray-500 mt-3">
              {selectedProfiles.size} profile{selectedProfiles.size !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Question"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
