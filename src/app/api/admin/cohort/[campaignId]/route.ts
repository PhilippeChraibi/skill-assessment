import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "admin/cohort" });

// GET — cohort analytics for a campaign
export async function GET(
  req: NextRequest,
  { params }: { params: { campaignId: string } },
) {
  try {
    const session = await getSession();
    if (!session?.user || !["ADMIN", "HR"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(req.url);
    const anonymize = url.searchParams.get("anonymize") === "true";

    const campaign = await prisma.campaign.findUnique({
      where: { id: params.campaignId },
      include: { jobProfile: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const sessions = await prisma.assessmentSession.findMany({
      where: { campaignId: params.campaignId, status: "COMPLETED", deletedAt: null },
      include: {
        candidate: { select: { name: true, email: true } },
        jobProfile: { select: { seniorityLevel: true } },
      },
      orderBy: { overallScore: "desc" },
    });

    const totalInvited = await prisma.assessmentSession.count({
      where: { campaignId: params.campaignId, deletedAt: null },
    });

    // Score distribution (buckets of 10)
    const distribution = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}-${(i + 1) * 10}`,
      count: sessions.filter(
        (s) => (s.overallScore ?? 0) >= i * 10 && (s.overallScore ?? 0) < (i + 1) * 10,
      ).length,
    }));

    // Domain heatmap data
    const domainScoresMap = new Map<string, number[]>();
    for (const s of sessions) {
      const domains = (s.domainScores as Record<string, number>) ?? {};
      for (const [domain, score] of Object.entries(domains)) {
        const arr = domainScoresMap.get(domain) ?? [];
        arr.push(score);
        domainScoresMap.set(domain, arr);
      }
    }

    const domainAverages: Record<string, number> = {};
    for (const [domain, scores] of domainScoresMap) {
      domainAverages[domain] =
        Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100;
    }

    // Top 3 weakest domains
    const weakestDomains = Object.entries(domainAverages)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3)
      .map(([domain, avg]) => ({ domain, averageScore: avg }));

    // Seniority breakdown
    const seniorityGroups = new Map<string, number[]>();
    for (const s of sessions) {
      const level = s.jobProfile.seniorityLevel;
      const arr = seniorityGroups.get(level) ?? [];
      arr.push(s.overallScore ?? 0);
      seniorityGroups.set(level, arr);
    }

    const seniorityBreakdown: Record<string, { avg: number; count: number }> = {};
    for (const [level, scores] of seniorityGroups) {
      seniorityBreakdown[level] = {
        avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
        count: scores.length,
      };
    }

    // Integrity summary
    const integrityCount = {
      PASS: sessions.filter((s) => s.integrityRecommendation === "PASS").length,
      REVIEW: sessions.filter((s) => s.integrityRecommendation === "REVIEW").length,
      FLAG: sessions.filter((s) => s.integrityRecommendation === "FLAG").length,
    };

    // Leaderboard
    const leaderboard = sessions.map((s, rank) => ({
      rank: rank + 1,
      candidateName: anonymize ? `Candidate ${rank + 1}` : (s.candidate.name ?? s.candidate.email),
      candidateEmail: anonymize ? undefined : s.candidate.email,
      overallScore: s.overallScore ?? 0,
      theoryScore: s.theoryScore ?? 0,
      practiceScore: s.practiceScore ?? 0,
      integrityRecommendation: s.integrityRecommendation,
      domainScores: s.domainScores as Record<string, number>,
      durationSeconds: s.durationSeconds,
    }));

    // Time distribution
    const durations = sessions
      .map((s) => s.durationSeconds)
      .filter((d): d is number => d !== null);
    const avgDuration = durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    return NextResponse.json({
      campaignName: campaign.name,
      jobProfile: campaign.jobProfile,
      totalInvited,
      completedCount: sessions.length,
      completionRate: totalInvited > 0 ? Math.round((sessions.length / totalInvited) * 100) : 0,
      averageScore: sessions.length > 0
        ? Math.round(
            (sessions.reduce((sum, s) => sum + (s.overallScore ?? 0), 0) / sessions.length) * 100,
          ) / 100
        : 0,
      averageDurationSeconds: avgDuration,
      scoreDistribution: distribution,
      domainAverages,
      weakestDomains,
      seniorityBreakdown,
      integrityCount,
      leaderboard,
    });
  } catch (error: any) {
    log.error({ error: error.message }, "Failed to generate cohort report");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
