"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const YEARS_OPTIONS = ["0-2", "3-5", "6-10", "11-15", "16+"];
const AGE_OPTIONS = [
  { value: "<25", label: "Under 25" },
  { value: "25-34", label: "25–34" },
  { value: "35-44", label: "35–44" },
  { value: "45-54", label: "45–54" },
  { value: "55+", label: "55 or older" },
  { value: "prefer_not", label: "Prefer not to say" },
];
const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not", label: "Prefer not to say" },
];
const EDUCATION_OPTIONS = [
  { value: "high_school", label: "High school / Baccalauréat" },
  { value: "bachelor", label: "Bachelor's degree" },
  { value: "master", label: "Master's degree" },
  { value: "phd", label: "PhD / Doctorate" },
  { value: "professional", label: "Professional qualification (non-degree)" },
];
const INDUSTRY_OPTIONS = [
  "Manufacturing", "Retail & Consumer Goods", "Healthcare & Pharmaceuticals",
  "Financial Services", "Public Sector & Government", "Technology & Software",
  "Energy & Utilities", "Automotive", "Aerospace & Defence",
  "Food & Beverage", "Construction & Real Estate", "Logistics & Transportation",
  "Consulting", "Other",
];
const CERTIFICATION_OPTIONS = [
  { value: "CIPS", label: "CIPS (Chartered Institute of Procurement & Supply)" },
  { value: "ISM", label: "ISM / CPSM (Institute for Supply Management)" },
  { value: "APICS", label: "APICS / ASCM (CSCP, CPIM)" },
  { value: "CPP", label: "CPP (Certified Purchasing Professional)" },
  { value: "CPCM", label: "CPCM (Certified Professional Contracts Manager)" },
  { value: "other", label: "Other procurement/SC certification" },
];
const TEAM_OPTIONS = [
  { value: "just_me", label: "Just me (individual contributor)" },
  { value: "2-5", label: "2–5 people" },
  { value: "6-15", label: "6–15 people" },
  { value: "16-50", label: "16–50 people" },
  { value: "50+", label: "More than 50 people" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    yearsOfExperience: "",
    country: "",
    industrySector: "",
    ageRange: "",
    gender: "",
    educationLevel: "",
    certifications: [] as string[],
    teamSize: "",
  });

  const toggleCert = (val: string) => {
    setForm((f) => ({
      ...f,
      certifications: f.certifications.includes(val)
        ? f.certifications.filter((c) => c !== val)
        : [...f.certifications, val],
    }));
  };

  const save = async (completed: boolean) => {
    setSaving(true);
    await fetch("/api/candidate/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, completed }),
    });
    setSaving(false);
    router.replace("/assessment");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Welcome — a few quick questions</h1>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            These optional questions help us provide benchmarked results and insights.
            Your answers are confidential and used only for aggregate reporting.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">

          {/* Years of experience */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Years of experience in procurement / supply chain
            </label>
            <div className="flex flex-wrap gap-2">
              {YEARS_OPTIONS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setForm({ ...form, yearsOfExperience: y })}
                  className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                    form.yearsOfExperience === y
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {y} years
                </button>
              ))}
            </div>
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Industry sector</label>
            <select
              value={form.industrySector}
              onChange={(e) => setForm({ ...form, industrySector: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select your industry…</option>
              {INDUSTRY_OPTIONS.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Country</label>
            <input
              type="text"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. France, Germany, United States…"
            />
          </div>

          {/* Education */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Highest level of education</label>
            <div className="space-y-2">
              {EDUCATION_OPTIONS.map((e) => (
                <label key={e.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="education"
                    value={e.value}
                    checked={form.educationLevel === e.value}
                    onChange={() => setForm({ ...form, educationLevel: e.value })}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{e.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              Professional certifications <span className="font-normal text-gray-500">(select all that apply)</span>
            </label>
            <div className="space-y-2">
              {CERTIFICATION_OPTIONS.map((c) => (
                <label key={c.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.certifications.includes(c.value)}
                    onChange={() => toggleCert(c.value)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{c.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Team size */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Team size you manage or work in</label>
            <div className="flex flex-col gap-2">
              {TEAM_OPTIONS.map((t) => (
                <label key={t.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="teamSize"
                    value={t.value}
                    checked={form.teamSize === t.value}
                    onChange={() => setForm({ ...form, teamSize: t.value })}
                    className="accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{t.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Age range */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Age range</label>
            <div className="flex flex-wrap gap-2">
              {AGE_OPTIONS.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setForm({ ...form, ageRange: a.value })}
                  className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                    form.ageRange === a.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Gender</label>
            <div className="flex flex-wrap gap-2">
              {GENDER_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setForm({ ...form, gender: g.value })}
                  className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                    form.gender === g.value
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300 hover:border-blue-400"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pb-8">
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            Skip for now
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Continue to my assessment →"}
          </button>
        </div>
      </div>
    </div>
  );
}
