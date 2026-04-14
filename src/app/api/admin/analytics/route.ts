import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const orgFilter = session.user.organizationId
      ? { campaign: { organizationId: session.user.organizationId } }
      : {};

    // ── Summary ────────────────────────────────────────────────────────────
    const [totalSessions, completedSessions, scoreAgg, durationAgg, flaggedCount, totalCandidates, totalCampaigns] =
      await Promise.all([
        prisma.assessmentSession.count({ where: { ...orgFilter } }),
        prisma.assessmentSession.count({ where: { ...orgFilter, status: "COMPLETED" } }),
        prisma.assessmentSession.aggregate({
          where: { ...orgFilter, status: "COMPLETED", overallScore: { not: null } },
          _avg: { overallScore: true },
        }),
        prisma.assessmentSession.aggregate({
          where: { ...orgFilter, status: "COMPLETED", durationSeconds: { not: null } },
          _avg: { durationSeconds: true },
        }),
        prisma.assessmentSession.count({
          where: {
            ...orgFilter,
            status: "COMPLETED",
            integrityRecommendation: { in: ["FLAG", "REVIEW"] },
          },
        }),
        prisma.user.count({ where: { role: "CANDIDATE" } }),
        session.user.organizationId
          ? prisma.campaign.count({ where: { organizationId: session.user.organizationId } })
          : prisma.campaign.count(),
      ]);

    const completionRate = totalSessions > 0 ? completedSessions / totalSessions : 0;
    const integrityFlagRate = completedSessions > 0 ? flaggedCount / completedSessions : 0;

    // ── Score Distribution ────────────────────────────────────────────────
    const completedWithScores = await prisma.assessmentSession.findMany({
      where: { ...orgFilter, status: "COMPLETED", overallScore: { not: null } },
      select: { overallScore: true },
    });

    const buckets = [
      "0-10", "10-20", "20-30", "30-40", "40-50",
      "50-60", "60-70", "70-80", "80-90", "90-100",
    ];
    const bucketCounts = new Array(10).fill(0);
    for (const s of completedWithScores) {
      if (s.overallScore !== null) {
        const idx = Math.min(Math.floor(s.overallScore / 10), 9);
        bucketCounts[idx]++;
      }
    }
    const scoreDistribution = buckets.map((bucket, i) => ({ bucket, count: bucketCounts[i] }));

    // ── Scores by Track ────────────────────────────────────────────────────
    const sessionsByTrack = await prisma.assessmentSession.findMany({
      where: { ...orgFilter, status: "COMPLETED", overallScore: { not: null } },
      select: { overallScore: true, jobProfile: { select: { track: true } } },
    });

    const trackMap = new Map<string, { sum: number; count: number }>();
    for (const s of sessionsByTrack) {
      const track = s.jobProfile?.track ?? "UNKNOWN";
      const entry = trackMap.get(track) ?? { sum: 0, count: 0 };
      entry.sum += s.overallScore ?? 0;
      entry.count++;
      trackMap.set(track, entry);
    }
    const scoresByTrack = Array.from(trackMap.entries()).map(([track, { sum, count }]) => ({
      track,
      avgScore: count > 0 ? sum / count : 0,
      count,
    }));

    // ── Scores by Band ─────────────────────────────────────────────────────
    const sessionsByBand = await prisma.assessmentSession.findMany({
      where: { ...orgFilter, status: "COMPLETED", overallScore: { not: null } },
      select: {
        overallScore: true,
        jobProfile: { select: { band: true, bandLabel: true } },
      },
    });

    const bandMap = new Map<number, { sum: number; count: number; label: string }>();
    for (const s of sessionsByBand) {
      const band = s.jobProfile?.band ?? 0;
      const label = s.jobProfile?.bandLabel ?? "";
      const entry = bandMap.get(band) ?? { sum: 0, count: 0, label };
      entry.sum += s.overallScore ?? 0;
      entry.count++;
      bandMap.set(band, entry);
    }
    const scoresByBand = Array.from(bandMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([band, { sum, count, label }]) => ({
        band,
        label,
        avgScore: count > 0 ? sum / count : 0,
        count,
      }));

    // ── Theory vs Practice ─────────────────────────────────────────────────
    const tvp = await prisma.assessmentSession.findMany({
      where: {
        ...orgFilter,
        status: "COMPLETED",
        theoryScore: { not: null },
        practiceScore: { not: null },
      },
      select: {
        id: true,
        theoryScore: true,
        practiceScore: true,
        jobProfile: { select: { track: true } },
      },
      take: 200,
      orderBy: { completedAt: "desc" },
    });
    const theoryVsPractice = tvp.map((s) => ({
      sessionId: s.id,
      theory: s.theoryScore ?? 0,
      practice: s.practiceScore ?? 0,
      track: s.jobProfile?.track ?? "UNKNOWN",
    }));

    // ── Sessions Over Time (last 12 weeks) ─────────────────────────────────
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    const recentSessions = await prisma.assessmentSession.findMany({
      where: { ...orgFilter, createdAt: { gte: twelveWeeksAgo } },
      select: { createdAt: true, status: true },
    });

    const weekMap = new Map<string, { started: number; completed: number }>();
    for (const s of recentSessions) {
      const d = new Date(s.createdAt);
      // ISO week: get Monday of the week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const weekKey = monday.toISOString().split("T")[0];
      const entry = weekMap.get(weekKey) ?? { started: 0, completed: 0 };
      entry.started++;
      if (s.status === "COMPLETED") entry.completed++;
      weekMap.set(weekKey, entry);
    }
    const sessionsOverTime = Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, { started, completed }]) => ({ week, started, completed }));

    // ── Integrity Breakdown ────────────────────────────────────────────────
    const integrityRows = await prisma.assessmentSession.groupBy({
      by: ["integrityRecommendation"],
      where: { ...orgFilter, status: "COMPLETED", integrityRecommendation: { not: null } },
      _count: { id: true },
    });
    const integrityBreakdown = integrityRows.map((r) => ({
      recommendation: r.integrityRecommendation ?? "UNKNOWN",
      count: r._count.id,
    }));

    // ── Campaign Performance ───────────────────────────────────────────────
    const campaigns = await (session.user.organizationId
      ? prisma.campaign.findMany({ where: { organizationId: session.user.organizationId } })
      : prisma.campaign.findMany());

    const campaignPerformance = await Promise.all(
      campaigns.map(async (c) => {
        const [totalInvited, sessionRows] = await Promise.all([
          prisma.campaignInvite.count({ where: { campaignId: c.id } }),
          prisma.assessmentSession.findMany({
            where: { campaignId: c.id },
            select: { status: true, overallScore: true },
          }),
        ]);
        const totalStarted = sessionRows.length;
        const completed = sessionRows.filter((s) => s.status === "COMPLETED");
        const totalCompleted = completed.length;
        const scores = completed.map((s) => s.overallScore).filter((v): v is number => v !== null);
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        const completionRate = totalInvited > 0 ? totalCompleted / totalInvited : 0;
        return {
          id: c.id,
          name: c.name,
          avgScore,
          completionRate,
          totalInvited,
          totalStarted,
          totalCompleted,
        };
      })
    );

    // ── Demographics ───────────────────────────────────────────────────────
    const candidateProfiles = await prisma.candidateProfile.findMany({
      select: {
        yearsOfExperience: true,
        country: true,
        industrySector: true,
        educationLevel: true,
      },
    });

    function groupBy(arr: (string | null | undefined)[]): Array<{ label: string; count: number }> {
      const m = new Map<string, number>();
      for (const v of arr) {
        if (v) {
          m.set(v, (m.get(v) ?? 0) + 1);
        }
      }
      return Array.from(m.entries())
        .sort(([, a], [, b]) => b - a)
        .map(([label, count]) => ({ label, count }));
    }

    const experienceAll = groupBy(candidateProfiles.map((p) => p.yearsOfExperience));
    const countryAll = groupBy(candidateProfiles.map((p) => p.country));
    const sectorAll = groupBy(candidateProfiles.map((p) => p.industrySector));
    const educationAll = groupBy(candidateProfiles.map((p) => p.educationLevel));

    return NextResponse.json({
      summary: {
        totalSessions,
        completedSessions,
        avgScore: scoreAgg._avg.overallScore,
        avgDuration: durationAgg._avg.durationSeconds,
        completionRate,
        integrityFlagRate,
        totalCandidates,
        totalCampaigns,
      },
      scoreDistribution,
      scoresByTrack,
      scoresByBand,
      theoryVsPractice,
      sessionsOverTime,
      integrityBreakdown,
      campaignPerformance,
      demographics: {
        experience: experienceAll,
        country: countryAll.slice(0, 10),
        sector: sectorAll,
        education: educationAll,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
