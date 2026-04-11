"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface JobProfile {
  id: string;
  track: string;
  band: number;
  bandLabel: string;
  displayName: Record<string, string>;
}

export default function NewCampaignPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<JobProfile[]>([]);
  const [form, setForm] = useState({
    name: "",
    jobProfileId: "",
    startsAt: "",
    endsAt: "",
    maxAttempts: 1,
    shuffleQuestions: true,
    showFeedbackImmediately: false,
    allowedLanguages: ["en"],
    timeLimitPerQuestion: "",
    totalQuestions: 15,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/profiles")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setProfiles(data); })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          jobProfileId: form.jobProfileId,
          startsAt: form.startsAt,
          endsAt: form.endsAt,
          maxAttempts: form.maxAttempts,
          settings: {
            shuffleQuestions: form.shuffleQuestions,
            showFeedbackImmediately: form.showFeedbackImmediately,
            allowedLanguages: form.allowedLanguages,
            timeLimitPerQuestion: form.timeLimitPerQuestion ? parseInt(form.timeLimitPerQuestion) : undefined,
            totalQuestions: form.totalQuestions,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push(`/admin/campaigns/${data.id}`);
    } catch {
      setError("Failed to create campaign");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Campaign</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. Q2 2026 Procurement Assessment"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Profile</label>
          <select
            required
            value={form.jobProfileId}
            onChange={(e) => setForm({ ...form, jobProfileId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a profile...</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName?.en ?? p.track.replace(/_/g, " ")} — Band {p.band} ({p.bandLabel})
              </option>
            ))}
          </select>
          {profiles.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">No profiles found. Create questions with job profiles first.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="datetime-local"
              required
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="datetime-local"
              required
              value={form.endsAt}
              onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Attempts</label>
            <input
              type="number"
              min={1}
              max={5}
              value={form.maxAttempts}
              onChange={(e) => setForm({ ...form, maxAttempts: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time per Question (seconds, optional)
            </label>
            <input
              type="number"
              min={30}
              value={form.timeLimitPerQuestion}
              onChange={(e) => setForm({ ...form, timeLimitPerQuestion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="No limit"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Questions</label>
          <input
            type="number"
            min={5}
            max={50}
            value={form.totalQuestions}
            onChange={(e) => setForm({ ...form, totalQuestions: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.shuffleQuestions}
              onChange={(e) => setForm({ ...form, shuffleQuestions: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Shuffle question order</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.showFeedbackImmediately}
              onChange={(e) => setForm({ ...form, showFeedbackImmediately: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Show feedback immediately after completion</span>
          </label>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium
                       hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating..." : "Create Campaign"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
