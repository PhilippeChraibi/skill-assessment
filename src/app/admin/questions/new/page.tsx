"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewQuestionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    jobProfileId: "",
    language: "en",
    questionType: "MCQ",
    dimension: "THEORY",
    domainTag: "",
    difficultyWeight: 1.0,
    variantGroupId: "",
    stem: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    context: "",
    rubricCriteria: "",
    guidanceMin: 100,
    guidanceMax: 200,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const res = await fetch("/api/admin/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobProfileId: form.jobProfileId,
        language: form.language,
        questionType: form.questionType,
        dimension: form.dimension,
        domainTag: form.domainTag,
        difficultyWeight: form.difficultyWeight,
        content: buildContent(),
        variantGroupId: form.variantGroupId || undefined,
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

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Question</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Profile ID</label>
            <input
              required
              value={form.jobProfileId}
              onChange={(e) => setForm({ ...form, jobProfileId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="Profile CUID"
            />
          </div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
            <input
              type="number"
              min={1} max={3} step={0.1}
              value={form.difficultyWeight}
              onChange={(e) => setForm({ ...form, difficultyWeight: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Variant Group ID (optional)</label>
            <input
              value={form.variantGroupId}
              onChange={(e) => setForm({ ...form, variantGroupId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Share across variants"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Question Stem</label>
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
              className="text-sm text-blue-600"
            >
              + Add option
            </button>
          </div>
        )}

        {showRubric && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rubric Criteria (one per line)
            </label>
            <textarea
              rows={4}
              value={form.rubricCriteria}
              onChange={(e) => setForm({ ...form, rubricCriteria: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Demonstrates understanding of key concepts&#10;Applies appropriate frameworks&#10;Clear and structured response"
            />
          </div>
        )}

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
