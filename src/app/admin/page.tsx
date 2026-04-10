"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardStats {
  activeCampaigns: number;
  totalSessions: number;
  completedSessions: number;
  flaggedSessions: number;
  totalQuestions: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    async function load() {
      const [campaigns, sessions, questions] = await Promise.all([
        fetch("/api/admin/campaigns").then((r) => r.json()),
        fetch("/api/admin/sessions?limit=1").then((r) => r.json()),
        fetch("/api/admin/questions?limit=1").then((r) => r.json()),
      ]);

      setStats({
        activeCampaigns: Array.isArray(campaigns) ? campaigns.length : 0,
        totalSessions: sessions.total ?? 0,
        completedSessions: 0,
        flaggedSessions: 0,
        totalQuestions: questions.total ?? 0,
      });
    }
    load().catch(() => {});
  }, []);

  const cards = [
    { label: "Active Campaigns", value: stats?.activeCampaigns ?? "—", href: "/admin/campaigns", color: "bg-blue-50 text-blue-700" },
    { label: "Total Sessions", value: stats?.totalSessions ?? "—", href: "/admin/results", color: "bg-green-50 text-green-700" },
    { label: "Question Bank", value: stats?.totalQuestions ?? "—", href: "/admin/questions", color: "bg-purple-50 text-purple-700" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className={`text-3xl font-bold mt-2 ${card.color.split(" ")[1]}`}>
              {card.value}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              href="/admin/campaigns/new"
              className="block w-full text-left px-4 py-3 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors text-sm font-medium"
            >
              + Create New Campaign
            </Link>
            <Link
              href="/admin/questions/new"
              className="block w-full text-left px-4 py-3 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors text-sm font-medium"
            >
              + Add New Question
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Database</span>
              <span className="text-green-600 font-medium">Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">LLM Scoring</span>
              <span className="text-green-600 font-medium">Available</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Report Generation</span>
              <span className="text-green-600 font-medium">Active</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
