import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// POST — upsert the standard set of procurement job profiles.
// Safe to call multiple times (idempotent upsert).
export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const profiles = [
      {
        jobFamily: "SOURCING" as const,
        seniorityLevel: "L1_JUNIOR" as const,
        displayName: { en: "Junior Sourcing Analyst", fr: "Analyste Sourcing Junior" },
      },
      {
        jobFamily: "SOURCING" as const,
        seniorityLevel: "L2_MID" as const,
        displayName: { en: "Mid-Level Sourcing Specialist", fr: "Spécialiste Sourcing Niveau Intermédiaire" },
      },
      {
        jobFamily: "SOURCING" as const,
        seniorityLevel: "L3_SENIOR" as const,
        displayName: { en: "Senior Sourcing Manager", fr: "Responsable Sourcing Senior" },
      },
      {
        jobFamily: "PROCUREMENT" as const,
        seniorityLevel: "L2_MID" as const,
        displayName: { en: "Procurement Specialist", fr: "Spécialiste Achats" },
      },
      {
        jobFamily: "PROCUREMENT" as const,
        seniorityLevel: "L3_SENIOR" as const,
        displayName: { en: "Senior Buyer", fr: "Acheteur Senior" },
      },
      {
        jobFamily: "PROCUREMENT" as const,
        seniorityLevel: "L4_LEAD" as const,
        displayName: { en: "Lead Procurement Manager", fr: "Responsable Achats Senior" },
      },
      {
        jobFamily: "SUPPLY_CHAIN" as const,
        seniorityLevel: "L3_SENIOR" as const,
        displayName: { en: "Supply Chain Analyst", fr: "Analyste Chaîne Logistique" },
      },
      {
        jobFamily: "SUPPLY_CHAIN" as const,
        seniorityLevel: "L5_MANAGER" as const,
        displayName: { en: "Supply Chain Manager", fr: "Responsable Chaîne Logistique" },
      },
      {
        jobFamily: "SUPPLY_CHAIN" as const,
        seniorityLevel: "L6_EXECUTIVE" as const,
        displayName: { en: "VP Supply Chain", fr: "VP Chaîne d'Approvisionnement" },
      },
      {
        jobFamily: "CATEGORY_MGMT" as const,
        seniorityLevel: "L3_SENIOR" as const,
        displayName: { en: "Category Manager", fr: "Responsable Catégorie" },
      },
      {
        jobFamily: "LOGISTICS" as const,
        seniorityLevel: "L2_MID" as const,
        displayName: { en: "Logistics Coordinator", fr: "Coordinateur Logistique" },
      },
      {
        jobFamily: "CONTRACT_MGMT" as const,
        seniorityLevel: "L3_SENIOR" as const,
        displayName: { en: "Contract Manager", fr: "Gestionnaire de Contrats" },
      },
    ];

    const results = await Promise.all(
      profiles.map((p) =>
        prisma.jobProfile.upsert({
          where: { jobFamily_seniorityLevel: { jobFamily: p.jobFamily, seniorityLevel: p.seniorityLevel } },
          update: {},
          create: p,
        })
      )
    );

    return NextResponse.json({ created: results.length, profiles: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
