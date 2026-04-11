import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

const BAND_LABELS: Record<number, string> = {
  1: "Foundational",
  2: "Practitioner",
  3: "Advanced Practitioner",
  4: "Manager",
  5: "Senior Leader",
};

function makeSlug(track: string, band: number, displayNameEn: string): string {
  const trackPart = track.toLowerCase().replace(/_/g, "-");
  const namePart = displayNameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${trackPart}-b${band}-${namePart}`;
}

const PROFILES = [
  // ─── DIRECT PROCUREMENT (Private) ─────────────────────────────────────────────
  {
    track: "DIRECT_PROCUREMENT" as const,
    band: 1,
    sector: "PRIVATE" as const,
    displayName: { en: "Junior Direct Buyer", fr: "Acheteur Direct Junior" },
    typicalTitles: ["Junior Buyer", "Procurement Assistant", "Sourcing Analyst"],
    typicalYears: "0–2 years",
  },
  {
    track: "DIRECT_PROCUREMENT" as const,
    band: 2,
    sector: "PRIVATE" as const,
    displayName: { en: "Direct Buyer", fr: "Acheteur Direct" },
    typicalTitles: ["Buyer", "Sourcing Specialist", "Procurement Analyst"],
    typicalYears: "2–5 years",
  },
  {
    track: "DIRECT_PROCUREMENT" as const,
    band: 3,
    sector: "PRIVATE" as const,
    displayName: { en: "Senior Direct Buyer", fr: "Acheteur Direct Senior" },
    typicalTitles: ["Senior Buyer", "Lead Buyer", "Strategic Sourcing Specialist"],
    typicalYears: "5–8 years",
  },
  {
    track: "DIRECT_PROCUREMENT" as const,
    band: 3,
    sector: "PRIVATE" as const,
    displayName: { en: "Category Manager (Direct)", fr: "Responsable Catégorie (Direct)" },
    typicalTitles: ["Category Manager", "Commodity Manager", "Strategic Buyer"],
    typicalYears: "5–8 years",
  },
  {
    track: "DIRECT_PROCUREMENT" as const,
    band: 3,
    sector: "PRIVATE" as const,
    displayName: { en: "Site Procurement Manager", fr: "Responsable Achats Site" },
    typicalTitles: ["Site Procurement Manager", "Plant Buyer", "Manufacturing Site Buyer"],
    typicalYears: "5–8 years",
  },
  {
    track: "DIRECT_PROCUREMENT" as const,
    band: 4,
    sector: "PRIVATE" as const,
    displayName: { en: "Direct Procurement Manager", fr: "Responsable Achats Directs" },
    typicalTitles: ["Procurement Manager", "Sourcing Manager", "Head of Direct Categories"],
    typicalYears: "8–12 years",
  },
  {
    track: "DIRECT_PROCUREMENT" as const,
    band: 4,
    sector: "PRIVATE" as const,
    displayName: { en: "Cluster Procurement Manager", fr: "Responsable Achats Cluster" },
    typicalTitles: ["Cluster Procurement Manager", "Regional Sourcing Manager", "Multi-Site Procurement Manager"],
    typicalYears: "8–12 years",
  },
  {
    track: "DIRECT_PROCUREMENT" as const,
    band: 5,
    sector: "PRIVATE" as const,
    displayName: { en: "Head of Direct Procurement", fr: "Directeur des Achats Directs" },
    typicalTitles: ["Head of Procurement", "VP Procurement", "Director of Strategic Sourcing"],
    typicalYears: "12+ years",
  },
  {
    track: "DIRECT_PROCUREMENT" as const,
    band: 5,
    sector: "PRIVATE" as const,
    displayName: { en: "Chief Procurement Officer", fr: "Directeur Général des Achats" },
    typicalTitles: ["CPO", "Group Procurement Director", "VP Global Procurement"],
    typicalYears: "20+ years",
  },

  // ─── INDIRECT PROCUREMENT (Private) ───────────────────────────────────────────
  {
    track: "INDIRECT_PROCUREMENT" as const,
    band: 1,
    sector: "PRIVATE" as const,
    displayName: { en: "Junior Indirect Buyer", fr: "Acheteur Indirect Junior" },
    typicalTitles: ["Junior Buyer – Indirect", "Purchasing Assistant", "Procurement Coordinator"],
    typicalYears: "0–2 years",
  },
  {
    track: "INDIRECT_PROCUREMENT" as const,
    band: 2,
    sector: "PRIVATE" as const,
    displayName: { en: "Indirect Buyer", fr: "Acheteur Indirect" },
    typicalTitles: ["Indirect Buyer", "Buyer – Services & Capex", "Procurement Specialist"],
    typicalYears: "2–5 years",
  },
  {
    track: "INDIRECT_PROCUREMENT" as const,
    band: 3,
    sector: "PRIVATE" as const,
    displayName: { en: "Senior Indirect Buyer", fr: "Acheteur Indirect Senior" },
    typicalTitles: ["Senior Indirect Buyer", "Lead Buyer – Indirect", "Services Specialist"],
    typicalYears: "5–8 years",
  },
  {
    track: "INDIRECT_PROCUREMENT" as const,
    band: 3,
    sector: "PRIVATE" as const,
    displayName: { en: "Category Manager (Indirect)", fr: "Responsable Catégorie (Indirect)" },
    typicalTitles: ["Category Manager", "IT Category Manager", "Facilities Category Manager"],
    typicalYears: "5–8 years",
  },
  {
    track: "INDIRECT_PROCUREMENT" as const,
    band: 3,
    sector: "PRIVATE" as const,
    displayName: { en: "Country Procurement Manager", fr: "Responsable Achats Pays" },
    typicalTitles: ["Country Procurement Manager", "National Purchasing Manager", "Local Procurement Lead"],
    typicalYears: "5–8 years",
  },
  {
    track: "INDIRECT_PROCUREMENT" as const,
    band: 4,
    sector: "PRIVATE" as const,
    displayName: { en: "Indirect Procurement Manager", fr: "Responsable Achats Indirects" },
    typicalTitles: ["Indirect Procurement Manager", "Head of Indirect Categories", "Purchasing Manager"],
    typicalYears: "8–12 years",
  },
  {
    track: "INDIRECT_PROCUREMENT" as const,
    band: 4,
    sector: "PRIVATE" as const,
    displayName: { en: "Regional Procurement Manager", fr: "Responsable Achats Régional" },
    typicalTitles: ["Regional Procurement Manager", "Zone Procurement Manager", "Multi-Country Procurement Lead"],
    typicalYears: "8–12 years",
  },
  {
    track: "INDIRECT_PROCUREMENT" as const,
    band: 5,
    sector: "PRIVATE" as const,
    displayName: { en: "Head of Indirect Procurement", fr: "Directeur des Achats Indirects" },
    typicalTitles: ["Head of Indirect Procurement", "VP Indirect Procurement", "Director of Indirect Spend"],
    typicalYears: "12+ years",
  },
  {
    track: "INDIRECT_PROCUREMENT" as const,
    band: 5,
    sector: "PRIVATE" as const,
    displayName: { en: "Chief Procurement Officer", fr: "Directeur Général des Achats" },
    typicalTitles: ["CPO", "Group Procurement Director", "VP Global Procurement"],
    typicalYears: "20+ years",
  },

  // ─── PUBLIC PROCUREMENT (Public) ──────────────────────────────────────────────
  {
    track: "PUBLIC_PROCUREMENT" as const,
    band: 1,
    sector: "PUBLIC" as const,
    displayName: { en: "Public Procurement Officer I", fr: "Agent des Marchés Publics I" },
    typicalTitles: ["Procurement Officer", "Contracting Officer I", "Public Buyer"],
    typicalYears: "0–2 years",
  },
  {
    track: "PUBLIC_PROCUREMENT" as const,
    band: 2,
    sector: "PUBLIC" as const,
    displayName: { en: "Public Procurement Officer II", fr: "Agent des Marchés Publics II" },
    typicalTitles: ["Senior Procurement Officer", "Contracting Officer II", "Tender Specialist"],
    typicalYears: "2–5 years",
  },
  {
    track: "PUBLIC_PROCUREMENT" as const,
    band: 3,
    sector: "PUBLIC" as const,
    displayName: { en: "Senior Public Procurement Officer", fr: "Agent des Marchés Publics Senior" },
    typicalTitles: ["Senior Contracting Officer", "Lead Procurement Officer", "Public Sourcing Specialist"],
    typicalYears: "5–8 years",
  },
  {
    track: "PUBLIC_PROCUREMENT" as const,
    band: 4,
    sector: "PUBLIC" as const,
    displayName: { en: "Public Procurement Manager", fr: "Responsable des Marchés Publics" },
    typicalTitles: ["Procurement Manager", "Contracting Manager", "Head of Tendering"],
    typicalYears: "8–12 years",
  },
  {
    track: "PUBLIC_PROCUREMENT" as const,
    band: 5,
    sector: "PUBLIC" as const,
    displayName: { en: "Head of Public Procurement", fr: "Directeur des Achats Publics" },
    typicalTitles: ["Head of Procurement", "Director of Public Contracts", "Chief Procurement Officer (Public)"],
    typicalYears: "12+ years",
  },

  // ─── SUPPLY CHAIN (Private) ────────────────────────────────────────────────────
  {
    track: "SUPPLY_CHAIN" as const,
    band: 1,
    sector: "PRIVATE" as const,
    displayName: { en: "Supply Chain Coordinator", fr: "Coordinateur Chaîne d'Approvisionnement" },
    typicalTitles: ["Supply Chain Coordinator", "Logistics Assistant", "Inventory Analyst"],
    typicalYears: "0–2 years",
  },
  {
    track: "SUPPLY_CHAIN" as const,
    band: 2,
    sector: "PRIVATE" as const,
    displayName: { en: "Supply Chain Analyst", fr: "Analyste Chaîne d'Approvisionnement" },
    typicalTitles: ["Supply Chain Analyst", "Planning Analyst", "Logistics Specialist"],
    typicalYears: "2–5 years",
  },
  {
    track: "SUPPLY_CHAIN" as const,
    band: 3,
    sector: "PRIVATE" as const,
    displayName: { en: "Supply Chain Specialist", fr: "Spécialiste Chaîne d'Approvisionnement" },
    typicalTitles: ["Supply Chain Specialist", "Senior Planner", "Demand & Supply Specialist"],
    typicalYears: "5–8 years",
  },
  {
    track: "SUPPLY_CHAIN" as const,
    band: 4,
    sector: "PRIVATE" as const,
    displayName: { en: "Supply Chain Manager", fr: "Responsable Chaîne d'Approvisionnement" },
    typicalTitles: ["Supply Chain Manager", "Operations Manager", "S&OP Manager"],
    typicalYears: "8–12 years",
  },
  {
    track: "SUPPLY_CHAIN" as const,
    band: 5,
    sector: "PRIVATE" as const,
    displayName: { en: "Head of Supply Chain", fr: "Directeur de la Chaîne d'Approvisionnement" },
    typicalTitles: ["Head of Supply Chain", "VP Supply Chain", "Director of Operations"],
    typicalYears: "12+ years",
  },

  // ─── PROCUREMENT EXCELLENCE (Both) — starts at Band 2 ─────────────────────────
  {
    track: "PROCUREMENT_EXCELLENCE" as const,
    band: 2,
    sector: "BOTH" as const,
    displayName: { en: "Procurement Excellence Analyst", fr: "Analyste Excellence Achats" },
    typicalTitles: ["Procurement Excellence Analyst", "Process Improvement Analyst", "Procurement Data Analyst"],
    typicalYears: "2–5 years",
  },
  {
    track: "PROCUREMENT_EXCELLENCE" as const,
    band: 4,
    sector: "BOTH" as const,
    displayName: { en: "Procurement Excellence Manager", fr: "Responsable Excellence Achats" },
    typicalTitles: ["Procurement Excellence Manager", "Head of Category Management", "Strategic Sourcing Manager"],
    typicalYears: "8–12 years",
  },
];

// POST — upsert the standard set of procurement job profiles.
// Safe to call multiple times (idempotent via slug).
export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const results = await Promise.all(
      PROFILES.map((p) => {
        const slug = makeSlug(p.track, p.band, (p.displayName as any).en);
        return prisma.jobProfile.upsert({
          where: { slug },
          update: {
            sector: p.sector,
            displayName: p.displayName,
            bandLabel: BAND_LABELS[p.band],
            typicalTitles: p.typicalTitles,
            typicalYears: p.typicalYears,
          },
          create: {
            slug,
            track: p.track,
            band: p.band,
            sector: p.sector,
            displayName: p.displayName,
            bandLabel: BAND_LABELS[p.band],
            typicalTitles: p.typicalTitles,
            typicalYears: p.typicalYears,
            isActive: true,
          },
        });
      }),
    );

    return NextResponse.json({ seeded: results.length, profiles: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
