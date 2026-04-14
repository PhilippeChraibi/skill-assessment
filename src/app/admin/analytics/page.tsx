"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ReferenceLine,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────

interface AnalyticsData {
  summary: {
    totalSessions: number;
    completedSessions: number;
    avgScore: number | null;
    avgDuration: number | null;
    completionRate: number;
    integrityFlagRate: number;
    totalCandidates: number;
    totalCampaigns: number;
  };
  scoreDistribution: Array<{ bucket: string; count: number }>;
  scoresByTrack: Array<{ track: string; avgScore: number; count: number }>;
  scoresByBand: Array<{ band: number; label: string; avgScore: number; count: number }>;
  theoryVsPractice: Array<{ sessionId: string; theory: number; practice: number; track: string }>;
  sessionsOverTime: Array<{ week: string; started: number; completed: number }>;
  integrityBreakdown: Array<{ recommendation: string; count: number }>;
  campaignPerformance: Array<{
    id: string;
    name: string;
    avgScore: number | null;
    completionRate: number;
    totalInvited: number;
    totalStarted: number;
    totalCompleted: number;
  }>;
  demographics: {
    experience: Array<{ label: string; count: number }>;
    country: Array<{ label: string; count: number }>;
    sector: Array<{ label: string; count: number }>;
    education: Array<{ label: string; count: number }>;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTrack(track: string): string {
  const map: Record<string, string> = {
    DIRECT_PROCUREMENT: "Direct",
    INDIRECT_PROCUREMENT: "Indirect",
    PUBLIC_PROCUREMENT: "Public",
    SUPPLY_CHAIN: "Supply Chain",
    PROCUREMENT_EXCELLENCE: "Excellence",
  };
  return map[track] ?? track;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

const TRACK_COLORS: Record<string, string> = {
  DIRECT_PROCUREMENT: "#6366f1",
  INDIRECT_PROCUREMENT: "#3b82f6",
  PUBLIC_PROCUREMENT: "#10b981",
  SUPPLY_CHAIN: "#f59e0b",
  PROCUREMENT_EXCELLENCE: "#ec4899",
  UNKNOWN: "#9ca3af",
};

const INTEGRITY_COLORS: Record<string, string> = {
  PASS: "#10b981",
  REVIEW: "#f59e0b",
  FLAG: "#ef4444",
};

// ── Skeleton ───────────────────────────────────────────────────────────────

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-6 animate-pulse ${className}`}>
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
      <div className="h-3 bg-gray-100 rounded w-1/2 mb-6" />
      <div className="h-64 bg-gray-100 rounded" />
    </div>
  );
}

// ── Chart Card ─────────────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm p-6 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

// ── Export Functions ───────────────────────────────────────────────────────

async function exportPDF(data: AnalyticsData) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Procurement Skills Assessment — Analytics Report", 14, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth - 14, 18, { align: "right" });

  let y = 36;

  // Summary KPIs
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Total Sessions", data.summary.totalSessions.toString()],
      ["Completed Sessions", data.summary.completedSessions.toString()],
      ["Completion Rate", `${(data.summary.completionRate * 100).toFixed(1)}%`],
      ["Average Score", data.summary.avgScore !== null ? `${data.summary.avgScore.toFixed(1)}` : "—"],
      ["Average Duration", formatDuration(data.summary.avgDuration)],
      ["Integrity Flag Rate", `${(data.summary.integrityFlagRate * 100).toFixed(1)}%`],
      ["Total Candidates", data.summary.totalCandidates.toString()],
      ["Total Campaigns", data.summary.totalCampaigns.toString()],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Campaign Performance
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Campaign Performance", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Campaign", "Invited", "Started", "Completed", "Avg Score", "Completion %"]],
    body: data.campaignPerformance.map((c) => [
      c.name,
      c.totalInvited.toString(),
      c.totalStarted.toString(),
      c.totalCompleted.toString(),
      c.avgScore !== null ? c.avgScore.toFixed(1) : "—",
      `${(c.completionRate * 100).toFixed(1)}%`,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Scores by Track
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Scores by Track", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Track", "Avg Score", "Sessions"]],
    body: data.scoresByTrack.map((r) => [
      formatTrack(r.track),
      r.avgScore.toFixed(1),
      r.count.toString(),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Scores by Band
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Scores by Level", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Band", "Label", "Avg Score", "Sessions"]],
    body: data.scoresByBand.map((r) => [
      `L${r.band}`,
      r.label,
      r.avgScore.toFixed(1),
      r.count.toString(),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Demographics
  if (y > 200) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Demographics — Experience", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Years of Experience", "Count"]],
    body: data.demographics.experience.map((r) => [r.label, r.count.toString()]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [16, 185, 129] },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  if (y > 200) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Demographics — Industry Sector", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Sector", "Count"]],
    body: data.demographics.sector.map((r) => [r.label, r.count.toString()]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [16, 185, 129] },
  });

  doc.save("analytics-report.pdf");
}

async function exportXLSX(data: AnalyticsData) {
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ["Metric", "Value"],
    ["Total Sessions", data.summary.totalSessions],
    ["Completed Sessions", data.summary.completedSessions],
    ["Completion Rate", `${(data.summary.completionRate * 100).toFixed(1)}%`],
    ["Average Score", data.summary.avgScore !== null ? data.summary.avgScore.toFixed(1) : "—"],
    ["Average Duration", formatDuration(data.summary.avgDuration)],
    ["Integrity Flag Rate", `${(data.summary.integrityFlagRate * 100).toFixed(1)}%`],
    ["Total Candidates", data.summary.totalCandidates],
    ["Total Campaigns", data.summary.totalCampaigns],
  ]);
  XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

  // Score Distribution
  const distSheet = XLSX.utils.aoa_to_sheet([
    ["Score Range", "Count"],
    ...data.scoreDistribution.map((r) => [r.bucket, r.count]),
  ]);
  XLSX.utils.book_append_sheet(wb, distSheet, "Score Distribution");

  // By Track
  const trackSheet = XLSX.utils.aoa_to_sheet([
    ["Track", "Avg Score", "Sessions"],
    ...data.scoresByTrack.map((r) => [formatTrack(r.track), r.avgScore.toFixed(1), r.count]),
  ]);
  XLSX.utils.book_append_sheet(wb, trackSheet, "By Track");

  // By Level
  const bandSheet = XLSX.utils.aoa_to_sheet([
    ["Band", "Label", "Avg Score", "Sessions"],
    ...data.scoresByBand.map((r) => [`L${r.band}`, r.label, r.avgScore.toFixed(1), r.count]),
  ]);
  XLSX.utils.book_append_sheet(wb, bandSheet, "By Level");

  // By Campaign
  const campSheet = XLSX.utils.aoa_to_sheet([
    ["Campaign", "Invited", "Started", "Completed", "Avg Score", "Completion %"],
    ...data.campaignPerformance.map((c) => [
      c.name,
      c.totalInvited,
      c.totalStarted,
      c.totalCompleted,
      c.avgScore !== null ? c.avgScore.toFixed(1) : "—",
      `${(c.completionRate * 100).toFixed(1)}%`,
    ]),
  ]);
  XLSX.utils.book_append_sheet(wb, campSheet, "By Campaign");

  // Sessions over time
  const sessSheet = XLSX.utils.aoa_to_sheet([
    ["Week", "Started", "Completed"],
    ...data.sessionsOverTime.map((r) => [r.week, r.started, r.completed]),
  ]);
  XLSX.utils.book_append_sheet(wb, sessSheet, "Sessions");

  // Demographics
  const demoSheet = XLSX.utils.aoa_to_sheet([
    ["Category", "Label", "Count"],
    ...data.demographics.experience.map((r) => ["Experience", r.label, r.count]),
    ...data.demographics.sector.map((r) => ["Sector", r.label, r.count]),
    ...data.demographics.education.map((r) => ["Education", r.label, r.count]),
    ...data.demographics.country.map((r) => ["Country", r.label, r.count]),
  ]);
  XLSX.utils.book_append_sheet(wb, demoSheet, "Demographics");

  XLSX.writeFile(wb, "analytics-export.xlsx");
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 bg-gray-200 rounded w-40 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-64 mt-1 animate-pulse" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
        {/* Summary skeletons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-7 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard className="lg:col-span-2" />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard className="lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 font-medium">Failed to load analytics</p>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const { summary } = data;

  const kpis = [
    { label: "Total Sessions", value: summary.totalSessions.toLocaleString() },
    { label: "Completed", value: summary.completedSessions.toLocaleString() },
    { label: "Completion Rate", value: `${(summary.completionRate * 100).toFixed(1)}%` },
    {
      label: "Avg Score",
      value: summary.avgScore !== null ? summary.avgScore.toFixed(1) : "—",
    },
    { label: "Avg Duration", value: formatDuration(summary.avgDuration) },
    {
      label: "Integrity Flag Rate",
      value: `${(summary.integrityFlagRate * 100).toFixed(1)}%`,
    },
    { label: "Candidates", value: summary.totalCandidates.toLocaleString() },
    { label: "Campaigns", value: summary.totalCampaigns.toLocaleString() },
  ];

  // Band gradient colors
  const bandColors = ["#c7d2fe", "#818cf8", "#6366f1", "#4338ca", "#312e81"];

  // Track colors for scatter
  const uniqueTracks = Array.from(new Set(data.theoryVsPractice.map((d) => d.track)));

  return (
    <div className="space-y-6">
      {/* Page header + export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Assessment performance, trends, and demographics
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={() => exportPDF(data)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </button>
          <button
            onClick={() => exportXLSX(data)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
          >
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export XLSX
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium">{kpi.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Score Distribution — full width */}
        <ChartCard
          title="Score Distribution"
          subtitle="Overall score buckets for all completed sessions"
          className="lg:col-span-2"
        >
          {data.scoreDistribution.every((d) => d.count === 0) ? (
            <p className="text-sm text-gray-400 text-center py-16">No completed sessions yet</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.scoreDistribution} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                    formatter={(v) => [v as number, "Sessions"]}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Scores by Track */}
        <ChartCard title="Scores by Track" subtitle="Average overall score per procurement track">
          {data.scoresByTrack.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No data</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={data.scoresByTrack.map((d) => ({ ...d, name: formatTrack(d.track) }))}
                  margin={{ top: 0, right: 40, bottom: 0, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={72} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                    formatter={(v, _name, props) => [
                      `${(v as number).toFixed(1)} (n=${(props.payload as { count?: number })?.count ?? 0})`,
                      "Avg Score",
                    ]}
                  />
                  <Bar dataKey="avgScore" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Scores by Band */}
        <ChartCard title="Scores by Level" subtitle="Average score per seniority band (L1–L5)">
          {data.scoresByBand.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No data</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.scoresByBand.map((d) => ({ ...d, name: `L${d.band}` }))}
                  margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                    formatter={(v, _name, props) => {
                      const p = props.payload as { label?: string; count?: number } | undefined;
                      return [`${(v as number).toFixed(1)} — ${p?.label ?? ""} (n=${p?.count ?? 0})`, "Avg Score"];
                    }}
                  />
                  <Bar dataKey="avgScore" radius={[4, 4, 0, 0]}>
                    {data.scoresByBand.map((entry) => (
                      <Cell
                        key={`band-${entry.band}`}
                        fill={bandColors[Math.min(entry.band - 1, 4)]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Theory vs Practice */}
        <ChartCard
          title="Theory vs Practice"
          subtitle="Score correlation per candidate — dots above the line = stronger practice score"
        >
          {data.theoryVsPractice.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No completed sessions yet</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="theory" name="Theory" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: "Theory", position: "insideBottom", offset: -2, fontSize: 10 }} />
                  <YAxis dataKey="practice" name="Practice" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: "Practice", angle: -90, position: "insideLeft", fontSize: 10 }} />
                  <ReferenceLine
                    segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]}
                    stroke="#d1d5db"
                    strokeDasharray="4 4"
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                    content={(props) => {
                      if (!props.active || !props.payload?.length) return null;
                      const d = props.payload[0].payload as { theory: number; practice: number; track: string };
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg p-2 shadow text-xs">
                          <p className="font-medium">{formatTrack(d.track)}</p>
                          <p>Theory: {d.theory.toFixed(1)}</p>
                          <p>Practice: {d.practice.toFixed(1)}</p>
                        </div>
                      );
                    }}
                  />
                  {uniqueTracks.map((track) => (
                    <Scatter
                      key={track}
                      name={formatTrack(track)}
                      data={data.theoryVsPractice.filter((d) => d.track === track)}
                      fill={TRACK_COLORS[track] ?? "#9ca3af"}
                      opacity={0.7}
                    />
                  ))}
                  <Legend
                    formatter={(value) => formatTrack(value)}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Integrity Breakdown */}
        <ChartCard title="Integrity Breakdown" subtitle="Distribution of integrity recommendations for completed sessions">
          {data.integrityBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No integrity data</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.integrityBreakdown}
                    dataKey="count"
                    nameKey="recommendation"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    label={(props) => {
                      const recommendation = (props as unknown as { recommendation: string }).recommendation;
                      const percent = props.percent ?? 0;
                      return `${recommendation} ${(percent * 100).toFixed(0)}%`;
                    }}
                    labelLine={false}
                  >
                    {data.integrityBreakdown.map((entry) => (
                      <Cell
                        key={entry.recommendation}
                        fill={INTEGRITY_COLORS[entry.recommendation] ?? "#9ca3af"}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                    formatter={(v, name) => [v as number, name as string]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Sessions Over Time — full width */}
        <ChartCard
          title="Sessions Over Time"
          subtitle="Started and completed sessions per week (last 12 weeks)"
          className="lg:col-span-2"
        >
          {data.sessionsOverTime.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No session data in the last 12 weeks</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.sessionsOverTime} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="started" name="Started" fill="#3b82f6" opacity={0.7} radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    name="Completed"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#10b981" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        {/* Campaign Performance — full width table */}
        <ChartCard
          title="Campaign Performance"
          subtitle="Invitation, participation, and scoring by campaign"
          className="lg:col-span-2"
        >
          {data.campaignPerformance.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No campaigns found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 pb-2 pr-4">Campaign</th>
                    <th className="text-right text-xs font-semibold text-gray-500 pb-2 px-3">Invited</th>
                    <th className="text-right text-xs font-semibold text-gray-500 pb-2 px-3">Started</th>
                    <th className="text-right text-xs font-semibold text-gray-500 pb-2 px-3">Completed</th>
                    <th className="text-right text-xs font-semibold text-gray-500 pb-2 px-3">Avg Score</th>
                    <th className="text-right text-xs font-semibold text-gray-500 pb-2 pl-3">Completion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.campaignPerformance.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-gray-900 max-w-xs truncate">{c.name}</td>
                      <td className="py-2.5 px-3 text-right text-gray-600">{c.totalInvited}</td>
                      <td className="py-2.5 px-3 text-right text-gray-600">{c.totalStarted}</td>
                      <td className="py-2.5 px-3 text-right text-gray-600">{c.totalCompleted}</td>
                      <td className="py-2.5 px-3 text-right text-gray-600">
                        {c.avgScore !== null ? c.avgScore.toFixed(1) : "—"}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                            c.completionRate >= 0.7
                              ? "bg-green-50 text-green-700"
                              : c.completionRate >= 0.4
                              ? "bg-amber-50 text-amber-700"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {(c.completionRate * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>

        {/* Demographics */}
        <ChartCard title="Experience Distribution" subtitle="Candidates by years of experience">
          {data.demographics.experience.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No demographic data</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.demographics.experience}
                  margin={{ top: 4, right: 8, bottom: 20, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                    formatter={(v) => [v as number, "Candidates"]}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Industry Sector" subtitle="Candidates by industry sector">
          {data.demographics.sector.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">No demographic data</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={data.demographics.sector.slice(0, 8)}
                  margin={{ top: 0, right: 20, bottom: 0, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
                    formatter={(v) => [v as number, "Candidates"]}
                  />
                  <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

      </div>
    </div>
  );
}
