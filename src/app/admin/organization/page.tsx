"use client";

import { useEffect, useState } from "react";

export default function OrganizationPage() {
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("HR");
  const [inviting, setInviting] = useState(false);
  const [noOrg, setNoOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<string | null>(null);
  const [seedingProfiles, setSeedingProfiles] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/organization")
      .then(async (r) => {
        if (r.status === 404) { setNoOrg(true); return null; }
        return r.json();
      })
      .then((data) => { if (data) setOrg(data); })
      .finally(() => setLoading(false));
  }, []);

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) return;
    setCreating(true);
    setCreateError("");
    const res = await fetch("/api/admin/organization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newOrgName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setCreateError(data.error ?? "Failed to create organization.");
      setCreating(false);
      return;
    }
    // Reload the page so the session picks up the new organizationId
    window.location.reload();
  };

  const handleClaimData = async () => {
    setClaiming(true);
    setClaimResult(null);
    const res = await fetch("/api/admin/organization/claim", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setClaimResult(`Error: ${data.error}`);
    } else {
      const c = data.claimed;
      setClaimResult(`Recovered ${c.campaigns} campaign(s). Refresh the Campaigns page to see them.`);
    }
    setClaiming(false);
  };

  const handleSeedProfiles = async () => {
    setSeedingProfiles(true);
    setSeedResult(null);
    const res = await fetch("/api/admin/profiles/seed", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setSeedResult(`Error: ${data.error}`);
    } else {
      setSeedResult(`${data.seeded} job profile(s) initialized successfully.`);
    }
    setSeedingProfiles(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await fetch("/api/admin/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: org.name,
        logoUrl: org.logoUrl,
        branding: org.branding,
        retentionDays: org.retentionDays,
      }),
    });
    setSaving(false);
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    setInviteEmail("");
    setInviting(false);
    // Reload org
    const res = await fetch("/api/admin/organization");
    setOrg(await res.json());
  };

  if (loading) return <div className="text-gray-400 py-12 text-center">Loading...</div>;

  if (noOrg || !org) {
    return (
      <div className="max-w-md mx-auto mt-16">
        <div className="bg-white rounded-xl border border-gray-200 p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Set up your organization</h1>
            <p className="text-gray-500 text-sm mt-2">
              Your account isn&apos;t linked to an organization yet. Create one to get started.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
            <input
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g. Acme Corp"
            />
          </div>
          {createError && <p className="text-red-600 text-sm">{createError}</p>}
          <button
            onClick={handleCreateOrg}
            disabled={creating || !newOrgName.trim()}
            className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Organization"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Organization</h1>

      {/* Data recovery banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-amber-900 text-sm">Recover existing data</p>
            <p className="text-amber-700 text-sm mt-1">
              If you had campaigns, job profiles, or questions before setting up this organization,
              click <strong>Recover Data</strong> to reassign them to this organization.
            </p>
            {claimResult && (
              <p className={`mt-2 text-sm font-medium ${claimResult.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>
                {claimResult}
              </p>
            )}
          </div>
          <button
            onClick={handleClaimData}
            disabled={claiming}
            className="shrink-0 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50"
          >
            {claiming ? "Recovering..." : "Recover Data"}
          </button>
        </div>
      </div>

      {/* Job profiles initializer */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-blue-900 text-sm">Job Profiles</p>
            <p className="text-blue-700 text-sm mt-1">
              Job profiles define the roles candidates are assessed against (e.g. Mid-Level Sourcing Specialist).
              Click <strong>Initialize</strong> to populate the standard procurement &amp; supply chain profiles.
              Safe to run multiple times.
            </p>
            {seedResult && (
              <p className={`mt-2 text-sm font-medium ${seedResult.startsWith("Error") ? "text-red-600" : "text-green-700"}`}>
                {seedResult}
              </p>
            )}
          </div>
          <button
            onClick={handleSeedProfiles}
            disabled={seedingProfiles}
            className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {seedingProfiles ? "Initializing..." : "Initialize"}
          </button>
        </div>
      </div>

      {/* Org settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Settings</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
          <input
            value={org.name ?? ""}
            onChange={(e) => setOrg({ ...org, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
          <input
            value={org.logoUrl ?? ""}
            onChange={(e) => setOrg({ ...org, logoUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Data Retention (days)
          </label>
          <input
            type="number"
            min={30}
            value={org.retentionDays ?? 730}
            onChange={(e) => setOrg({ ...org, retentionDays: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {/* Team management */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Team Members</h2>

        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-grow px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="email@example.com"
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="HR">HR</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {inviting ? "..." : "Invite"}
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {org.users?.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{u.name ?? u.email}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                u.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
              }`}>
                {u.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
