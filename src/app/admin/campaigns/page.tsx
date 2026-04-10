"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Campaign {
  id: string;
  name: string;
  inviteToken: string;
  startsAt: string;
  endsAt: string;
  isArchived: boolean;
  maxAttempts: number;
  jobProfile: { jobFamily: string; seniorityLevel: string; displayName: Record<string, string> };
  createdBy: { name: string | null; email: string };
  _count: { sessions: number };
  completedCount: number;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/campaigns")
      .then((r) => r.json())
      .then((data) => setCampaigns(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        <Link
          href="/admin/campaigns/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium
                     hover:bg-blue-700 transition-colors"
        >
          + New Campaign
        </Link>
      </div>

      {loading ? (
        <div className="text-gray-400 py-12 text-center">Loading...</div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No campaigns yet.</p>
          <Link href="/admin/campaigns/new" className="text-blue-600 text-sm mt-2 inline-block">
            Create your first campaign
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Campaign</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Profile</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Dates</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Progress</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((c) => {
                const now = new Date();
                const isActive = new Date(c.startsAt) <= now && new Date(c.endsAt) >= now;
                const isUpcoming = new Date(c.startsAt) > now;

                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-400">by {c.createdBy.name ?? c.createdBy.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.jobProfile.jobFamily} / {c.jobProfile.seniorityLevel.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{new Date(c.startsAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-400">to {new Date(c.endsAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium">{c.completedCount}</span>
                      <span className="text-gray-400"> / {c._count.sessions}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          c.isArchived
                            ? "bg-gray-100 text-gray-600"
                            : isActive
                              ? "bg-green-100 text-green-700"
                              : isUpcoming
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {c.isArchived ? "Archived" : isActive ? "Active" : isUpcoming ? "Upcoming" : "Ended"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/campaigns/${c.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
