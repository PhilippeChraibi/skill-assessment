import * as fs from "fs";
import * as path from "path";

// Load .env manually since tsx doesn't auto-load it
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^"|"$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ── Organization ──
  const org = await prisma.organization.upsert({
    where: { domain: "demo.assessment.com" },
    update: {},
    create: {
      name: "Demo Corp",
      domain: "demo.assessment.com",
      logoUrl: null,
      branding: { primaryColor: "#2563eb", secondaryColor: "#1e40af" },
    },
  });

  // ── Admin user ──
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.assessment.com" },
    update: {},
    create: {
      email: "admin@demo.assessment.com",
      name: "Admin User",
      role: "ADMIN",
      organizationId: org.id,
      preferredLanguage: "en",
    },
  });

  const hr = await prisma.user.upsert({
    where: { email: "hr@demo.assessment.com" },
    update: {},
    create: {
      email: "hr@demo.assessment.com",
      name: "HR Manager",
      role: "HR",
      organizationId: org.id,
      preferredLanguage: "en",
    },
  });

  // ── Job Profiles (new track/band/slug schema) ──
  const profileSourcing = await prisma.jobProfile.upsert({
    where: { slug: "direct-procurement-b2-direct-buyer" },
    update: {},
    create: {
      slug: "direct-procurement-b2-direct-buyer",
      track: "DIRECT_PROCUREMENT",
      band: 2,
      sector: "PRIVATE",
      displayName: { en: "Direct Buyer", fr: "Acheteur Direct" },
      bandLabel: "Practitioner",
      typicalTitles: ["Buyer", "Sourcing Specialist", "Procurement Analyst"],
      typicalYears: "2–5 years",
      isActive: true,
    },
  });

  const profileProcurement = await prisma.jobProfile.upsert({
    where: { slug: "indirect-procurement-b3-senior-indirect-buyer" },
    update: {},
    create: {
      slug: "indirect-procurement-b3-senior-indirect-buyer",
      track: "INDIRECT_PROCUREMENT",
      band: 3,
      sector: "PRIVATE",
      displayName: { en: "Senior Indirect Buyer", fr: "Acheteur Indirect Senior" },
      bandLabel: "Advanced Practitioner",
      typicalTitles: ["Senior Indirect Buyer", "Services Category Specialist"],
      typicalYears: "5–8 years",
      isActive: true,
    },
  });

  const profileSupplyChain = await prisma.jobProfile.upsert({
    where: { slug: "supply-chain-b4-supply-chain-manager" },
    update: {},
    create: {
      slug: "supply-chain-b4-supply-chain-manager",
      track: "SUPPLY_CHAIN",
      band: 4,
      sector: "PRIVATE",
      displayName: { en: "Supply Chain Manager", fr: "Responsable Chaîne d'Approvisionnement" },
      bandLabel: "Manager",
      typicalTitles: ["Supply Chain Manager", "S&OP Manager"],
      typicalYears: "8–12 years",
      isActive: true,
    },
  });

  // ── Questions for SOURCING / L2_MID ──
  const sourcingQuestions = [
    // MCQ THEORY (4) with 3 variants each
    ...createMcqVariants("src-t1", profileSourcing.id, "THEORY", "incoterms", 1.0, {
      en: [
        { stem: "Under Incoterms 2020, which rule places the most obligation on the seller?", options: ["EXW", "FCA", "CIF", "DDP"], correctAnswer: 3 },
        { stem: "Which Incoterms 2020 rule requires the seller to deliver goods to the buyer's premises?", options: ["FOB", "DDP", "EXW", "CPT"], correctAnswer: 1 },
        { stem: "In Incoterms 2020, the DDP rule means the seller bears:", options: ["No risk", "Risk until port of shipment", "Risk until destination port", "All risk including import duties"], correctAnswer: 3 },
      ],
      fr: [
        { stem: "Selon les Incoterms 2020, quelle règle impose le plus d'obligations au vendeur ?", options: ["EXW", "FCA", "CIF", "DDP"], correctAnswer: 3 },
        { stem: "Quelle règle Incoterms 2020 exige que le vendeur livre les marchandises chez l'acheteur ?", options: ["FOB", "DDP", "EXW", "CPT"], correctAnswer: 1 },
        { stem: "Selon les Incoterms 2020, la règle DDP signifie que le vendeur supporte :", options: ["Aucun risque", "Risque jusqu'au port d'embarquement", "Risque jusqu'au port de destination", "Tous les risques y compris les droits d'importation"], correctAnswer: 3 },
      ],
    }),
    ...createMcqVariants("src-t2", profileSourcing.id, "THEORY", "supplier-evaluation", 1.5, {
      en: [
        { stem: "The Kraljic Matrix classifies items on which two dimensions?", options: ["Cost and Quality", "Supply Risk and Profit Impact", "Volume and Complexity", "Lead Time and Reliability"], correctAnswer: 1 },
        { stem: "In the Kraljic Matrix, 'strategic items' are characterized by:", options: ["Low risk, low impact", "High risk, high impact", "Low risk, high impact", "High risk, low impact"], correctAnswer: 1 },
        { stem: "Which quadrant of the Kraljic Matrix requires the most active supplier relationship management?", options: ["Routine", "Leverage", "Bottleneck", "Strategic"], correctAnswer: 3 },
      ],
      fr: [
        { stem: "La Matrice de Kraljic classe les articles selon quelles deux dimensions ?", options: ["Coût et Qualité", "Risque d'approvisionnement et Impact sur le profit", "Volume et Complexité", "Délai et Fiabilité"], correctAnswer: 1 },
        { stem: "Dans la Matrice de Kraljic, les 'articles stratégiques' sont caractérisés par :", options: ["Faible risque, faible impact", "Risque élevé, impact élevé", "Faible risque, impact élevé", "Risque élevé, faible impact"], correctAnswer: 1 },
        { stem: "Quel quadrant de la Matrice de Kraljic nécessite la gestion la plus active des relations fournisseurs ?", options: ["Routine", "Levier", "Goulot", "Stratégique"], correctAnswer: 3 },
      ],
    }),
    ...createMcqVariants("src-t3", profileSourcing.id, "THEORY", "total-cost-ownership", 1.5, {
      en: [
        { stem: "Total Cost of Ownership (TCO) includes which of the following?", options: ["Purchase price only", "Purchase price + shipping", "All direct and indirect costs over the asset's lifetime", "Annual maintenance costs"], correctAnswer: 2 },
        { stem: "Which cost is typically overlooked in TCO analysis but represents a significant hidden expense?", options: ["Unit price", "Quality failure costs", "Shipping costs", "Import duties"], correctAnswer: 1 },
        { stem: "TCO methodology is most valuable when:", options: ["Buying commodities", "Comparing suppliers with different service models", "Purchasing office supplies", "Making spot purchases"], correctAnswer: 1 },
      ],
      fr: [
        { stem: "Le Coût Total de Possession (TCO) inclut lequel des éléments suivants ?", options: ["Prix d'achat uniquement", "Prix d'achat + expédition", "Tous les coûts directs et indirects sur la durée de vie", "Coûts de maintenance annuels"], correctAnswer: 2 },
        { stem: "Quel coût est typiquement négligé dans l'analyse TCO mais représente une dépense cachée significative ?", options: ["Prix unitaire", "Coûts de non-qualité", "Frais d'expédition", "Droits d'importation"], correctAnswer: 1 },
        { stem: "La méthodologie TCO est la plus utile quand :", options: ["Achat de commodités", "Comparaison de fournisseurs avec différents modèles de service", "Achat de fournitures de bureau", "Achats ponctuels"], correctAnswer: 1 },
      ],
    }),
    ...createMcqVariants("src-t4", profileSourcing.id, "THEORY", "ethics", 1.0, {
      en: [
        { stem: "According to CIPS ethical standards, a procurement professional should:", options: ["Accept gifts under $50 from suppliers", "Never disclose conflicts of interest", "Maintain transparency and fair competition", "Favor incumbent suppliers for efficiency"], correctAnswer: 2 },
        { stem: "Which principle is central to CIPS ethical procurement?", options: ["Profit maximization", "Integrity and transparency", "Speed of transaction", "Supplier consolidation"], correctAnswer: 1 },
        { stem: "A CIPS-compliant buyer discovers a conflict of interest. They should:", options: ["Ignore it if the amount is small", "Handle it privately", "Disclose it immediately to management", "Wait until the contract is signed"], correctAnswer: 2 },
      ],
      fr: [
        { stem: "Selon les normes éthiques du CIPS, un professionnel des achats doit :", options: ["Accepter les cadeaux de moins de 50$", "Ne jamais divulguer les conflits d'intérêts", "Maintenir la transparence et la concurrence loyale", "Favoriser les fournisseurs existants pour l'efficacité"], correctAnswer: 2 },
        { stem: "Quel principe est central dans l'approvisionnement éthique selon le CIPS ?", options: ["Maximisation du profit", "Intégrité et transparence", "Rapidité de transaction", "Consolidation des fournisseurs"], correctAnswer: 1 },
        { stem: "Un acheteur conforme au CIPS découvre un conflit d'intérêts. Il doit :", options: ["L'ignorer si le montant est faible", "Le gérer en privé", "Le signaler immédiatement à la direction", "Attendre la signature du contrat"], correctAnswer: 2 },
      ],
    }),
    // MCQ PRACTICE (4) with 3 variants each
    ...createMcqVariants("src-p1", profileSourcing.id, "PRACTICE", "supplier-negotiation", 1.5, {
      en: [
        { stem: "During a sourcing negotiation, the supplier raises prices by 15% citing raw material costs. The best first response is:", options: ["Immediately accept to maintain the relationship", "Threaten to switch suppliers", "Request a cost breakdown and validate with market indices", "Counter with a 10% increase"], correctAnswer: 2 },
        { stem: "A key supplier provides a 'take-it-or-leave-it' price. Your best approach is:", options: ["Accept immediately", "Walk away permanently", "Explore alternative value levers (payment terms, volume commitments)", "File a complaint"], correctAnswer: 2 },
        { stem: "When negotiating with a sole-source supplier, the most effective strategy is:", options: ["Aggressive price pressure", "Building long-term partnership with shared risk/reward", "Threatening market entry of competitors", "Silent treatment"], correctAnswer: 1 },
      ],
      fr: [
        { stem: "Lors d'une négociation, le fournisseur augmente les prix de 15% en invoquant les coûts matières. La meilleure première réponse est :", options: ["Accepter immédiatement", "Menacer de changer de fournisseur", "Demander une décomposition des coûts et valider avec les indices du marché", "Contre-proposer une augmentation de 10%"], correctAnswer: 2 },
        { stem: "Un fournisseur clé propose un prix 'à prendre ou à laisser'. Votre meilleure approche est :", options: ["Accepter immédiatement", "Partir définitivement", "Explorer des leviers de valeur alternatifs (conditions de paiement, engagements de volume)", "Déposer une plainte"], correctAnswer: 2 },
        { stem: "Lors d'une négociation avec un fournisseur unique, la stratégie la plus efficace est :", options: ["Pression agressive sur les prix", "Construire un partenariat long terme avec partage risques/gains", "Menacer d'entrée de concurrents", "Silence radio"], correctAnswer: 1 },
      ],
    }),
    ...createMcqVariants("src-p2", profileSourcing.id, "PRACTICE", "supplier-risk", 2.0, {
      en: [
        { stem: "Your top supplier's financial health score drops significantly. The priority action is:", options: ["Immediately terminate the contract", "Begin qualifying alternative suppliers while engaging the supplier on a recovery plan", "Ignore it — financial scores fluctuate", "Double the order to stock up"], correctAnswer: 1 },
        { stem: "A critical supplier is located in a region facing political instability. The best risk mitigation is:", options: ["Increase safety stock only", "Develop dual-sourcing capability", "Do nothing until disruption occurs", "Renegotiate pricing"], correctAnswer: 1 },
        { stem: "Supply risk assessment should be reviewed:", options: ["Only when a disruption occurs", "Annually as part of category strategy", "Quarterly with key metrics monitoring", "Only during contract renewal"], correctAnswer: 2 },
      ],
      fr: [
        { stem: "Le score de santé financière de votre fournisseur principal chute significativement. L'action prioritaire est :", options: ["Résilier immédiatement le contrat", "Commencer à qualifier des fournisseurs alternatifs tout en engageant un plan de redressement", "L'ignorer — les scores financiers fluctuent", "Doubler les commandes pour constituer du stock"], correctAnswer: 1 },
        { stem: "Un fournisseur critique est situé dans une région confrontée à une instabilité politique. La meilleure atténuation est :", options: ["Augmenter uniquement le stock de sécurité", "Développer une capacité de double approvisionnement", "Ne rien faire jusqu'à la perturbation", "Renégocier les prix"], correctAnswer: 1 },
        { stem: "L'évaluation des risques d'approvisionnement devrait être revue :", options: ["Uniquement lors d'une perturbation", "Annuellement dans la stratégie catégorie", "Trimestriellement avec suivi d'indicateurs clés", "Uniquement lors du renouvellement de contrat"], correctAnswer: 2 },
      ],
    }),
    ...createMcqVariants("src-p3", profileSourcing.id, "PRACTICE", "make-or-buy", 1.5, {
      en: [
        { stem: "In a make-or-buy analysis, which factor most strongly favors 'buy'?", options: ["Core competency alignment", "Supplier has superior scale economies", "Need for IP protection", "Regulatory requirements for in-house production"], correctAnswer: 1 },
        { stem: "The most important risk to evaluate in an outsourcing decision is:", options: ["Short-term cost savings", "Loss of control over quality and delivery", "Currency fluctuation", "Communication overhead"], correctAnswer: 1 },
        { stem: "When should a company reconsider a 'buy' decision and bring production in-house?", options: ["When supplier costs increase", "When the activity becomes a core competency differentiator", "When internal capacity is available", "When the CFO requests it"], correctAnswer: 1 },
      ],
      fr: [
        { stem: "Dans une analyse make-or-buy, quel facteur favorise le plus l'option 'acheter' ?", options: ["Alignement avec les compétences clés", "Le fournisseur a des économies d'échelle supérieures", "Besoin de protection de la PI", "Exigences réglementaires de production interne"], correctAnswer: 1 },
        { stem: "Le risque le plus important à évaluer dans une décision d'externalisation est :", options: ["Économies à court terme", "Perte de contrôle sur la qualité et la livraison", "Fluctuation des devises", "Surcharge de communication"], correctAnswer: 1 },
        { stem: "Quand une entreprise devrait-elle reconsidérer l'option 'acheter' et internaliser ?", options: ["Quand les coûts fournisseur augmentent", "Quand l'activité devient un différenciateur clé", "Quand la capacité interne est disponible", "Quand le CFO le demande"], correctAnswer: 1 },
      ],
    }),
    ...createMcqVariants("src-p4", profileSourcing.id, "PRACTICE", "demand-forecasting", 1.5, {
      en: [
        { stem: "Which forecasting method is best suited for a new product with no historical data?", options: ["Moving average", "Exponential smoothing", "Delphi method (expert judgment)", "Linear regression"], correctAnswer: 2 },
        { stem: "A significant bullwhip effect in the supply chain is primarily caused by:", options: ["Accurate demand signals", "Order batching and demand signal distortion", "Just-in-time delivery", "VMI programs"], correctAnswer: 1 },
        { stem: "Collaborative Planning, Forecasting, and Replenishment (CPFR) primarily aims to:", options: ["Reduce headcount", "Improve forecast accuracy through buyer-supplier data sharing", "Eliminate safety stock entirely", "Centralize all procurement decisions"], correctAnswer: 1 },
      ],
      fr: [
        { stem: "Quelle méthode de prévision est la plus adaptée pour un nouveau produit sans données historiques ?", options: ["Moyenne mobile", "Lissage exponentiel", "Méthode Delphi (jugement d'experts)", "Régression linéaire"], correctAnswer: 2 },
        { stem: "Un effet coup de fouet significatif dans la chaîne est principalement causé par :", options: ["Des signaux de demande précis", "Le regroupement des commandes et la distorsion des signaux", "La livraison juste-à-temps", "Les programmes VMI"], correctAnswer: 1 },
        { stem: "Le CPFR (Planification Collaborative) vise principalement à :", options: ["Réduire les effectifs", "Améliorer la précision des prévisions par le partage de données", "Éliminer entièrement le stock de sécurité", "Centraliser toutes les décisions d'achat"], correctAnswer: 1 },
      ],
    }),
    // SCENARIO (4)
    ...["en", "fr"].flatMap((lang) => [
      {
        language: lang,
        questionType: "SCENARIO" as const,
        dimension: "PRACTICE" as const,
        domainTag: "supplier-negotiation",
        difficultyWeight: 2.0,
        content: lang === "en" ? {
          stem: "How would you approach this negotiation? Outline your strategy and key arguments.",
          context: "You are a sourcing specialist at a mid-size manufacturer. Your main packaging supplier (60% of your spend) has announced a 12% price increase effective next quarter, citing energy cost inflation. Your contract expires in 3 months. You have identified two alternative suppliers but neither has been qualified yet. Internal stakeholders are resistant to change. Your annual spend with this supplier is $2.4M.",
          rubric: { criteria: ["Demonstrates cost analysis approach", "Proposes realistic negotiation strategy", "Considers relationship and risk factors", "Shows awareness of BATNA development"], maxScore: 10 },
        } : {
          stem: "Comment aborderiez-vous cette négociation ? Décrivez votre stratégie et vos arguments clés.",
          context: "Vous êtes spécialiste sourcing chez un fabricant de taille moyenne. Votre principal fournisseur d'emballages (60% de vos dépenses) a annoncé une augmentation de 12% au prochain trimestre, invoquant l'inflation des coûts énergétiques. Votre contrat expire dans 3 mois. Vous avez identifié deux fournisseurs alternatifs mais aucun n'a encore été qualifié. Les parties prenantes internes résistent au changement. Votre dépense annuelle avec ce fournisseur est de 2,4M$.",
          rubric: { criteria: ["Démontre une approche d'analyse des coûts", "Propose une stratégie de négociation réaliste", "Considère les facteurs relationnels et de risque", "Montre une conscience du développement de BATNA"], maxScore: 10 },
        },
      },
      {
        language: lang,
        questionType: "SCENARIO" as const,
        dimension: "PRACTICE" as const,
        domainTag: "supplier-risk",
        difficultyWeight: 2.0,
        content: lang === "en" ? {
          stem: "Develop a risk mitigation plan for this situation. What immediate and long-term actions would you take?",
          context: "A critical electronic component supplier in Southeast Asia has been hit by severe flooding. They supply 40% of a key component used in your top-selling product line. Current inventory will last 6 weeks. The supplier estimates 3-4 months to full recovery. Two qualified alternative suppliers exist but have limited spare capacity.",
          rubric: { criteria: ["Addresses immediate supply continuity", "Proposes short and long-term mitigation", "Considers stakeholder communication", "Evaluates cost vs risk trade-offs"], maxScore: 10 },
        } : {
          stem: "Développez un plan d'atténuation des risques. Quelles actions immédiates et à long terme prendriez-vous ?",
          context: "Un fournisseur critique de composants électroniques en Asie du Sud-Est a été touché par de graves inondations. Il fournit 40% d'un composant clé utilisé dans votre gamme de produits phare. Le stock actuel durera 6 semaines. Le fournisseur estime 3-4 mois pour une reprise complète. Deux fournisseurs alternatifs qualifiés existent mais ont une capacité limitée.",
          rubric: { criteria: ["Aborde la continuité immédiate de l'approvisionnement", "Propose des mesures à court et long terme", "Considère la communication avec les parties prenantes", "Évalue les compromis coût vs risque"], maxScore: 10 },
        },
      },
      {
        language: lang,
        questionType: "SCENARIO" as const,
        dimension: "PRACTICE" as const,
        domainTag: "sustainability",
        difficultyWeight: 1.5,
        content: lang === "en" ? {
          stem: "Design a set of sustainability KPIs you would include in the new supplier scorecard.",
          context: "Your company has committed to reducing Scope 3 emissions by 30% by 2030. As part of a category review, you need to develop sustainability criteria for evaluating packaging suppliers. The current scorecard only measures quality, delivery, and price.",
          rubric: { criteria: ["Proposes relevant environmental KPIs", "Includes social responsibility metrics", "Considers measurability and data availability", "Aligns KPIs with corporate sustainability goals"], maxScore: 10 },
        } : {
          stem: "Concevez un ensemble de KPI de durabilité que vous incluriez dans la nouvelle fiche d'évaluation fournisseur.",
          context: "Votre entreprise s'est engagée à réduire les émissions Scope 3 de 30% d'ici 2030. Dans le cadre d'une revue catégorielle, vous devez développer des critères de durabilité pour évaluer les fournisseurs d'emballages. La fiche actuelle ne mesure que la qualité, la livraison et le prix.",
          rubric: { criteria: ["Propose des KPI environnementaux pertinents", "Inclut des métriques de responsabilité sociale", "Considère la mesurabilité et la disponibilité des données", "Aligne les KPI avec les objectifs de durabilité de l'entreprise"], maxScore: 10 },
        },
      },
      {
        language: lang,
        questionType: "SCENARIO" as const,
        dimension: "PRACTICE" as const,
        domainTag: "make-or-buy",
        difficultyWeight: 2.0,
        content: lang === "en" ? {
          stem: "Present your recommendation with a structured analysis framework. Should the company make or buy?",
          context: "Your company currently outsources the assembly of a sub-component to a supplier at $45/unit (100,000 units/year). Internal engineering estimates that bringing it in-house would cost $38/unit but requires $1.2M in equipment investment and 6 new FTEs. The component is used across 3 product lines and represents a potential differentiator. The current supplier's quality score is 94%.",
          rubric: { criteria: ["Uses structured decision framework", "Quantifies financial analysis correctly", "Considers strategic and qualitative factors", "Addresses implementation risks"], maxScore: 10 },
        } : {
          stem: "Présentez votre recommandation avec un cadre d'analyse structuré. L'entreprise devrait-elle fabriquer ou acheter ?",
          context: "Votre entreprise sous-traite actuellement l'assemblage d'un sous-composant à un fournisseur à 45$/unité (100 000 unités/an). L'ingénierie interne estime que l'internalisation coûterait 38$/unité mais nécessite 1,2M$ d'investissement et 6 nouveaux ETP. Le composant est utilisé dans 3 gammes de produits et représente un différenciateur potentiel. Le score qualité du fournisseur actuel est de 94%.",
          rubric: { criteria: ["Utilise un cadre de décision structuré", "Quantifie correctement l'analyse financière", "Considère les facteurs stratégiques et qualitatifs", "Aborde les risques de mise en œuvre"], maxScore: 10 },
        },
      },
    ]),
    // OPEN_TEXT (3)
    ...["en", "fr"].flatMap((lang) => [
      {
        language: lang,
        questionType: "OPEN_TEXT" as const,
        dimension: "THEORY" as const,
        domainTag: "supplier-evaluation",
        difficultyWeight: 1.5,
        content: lang === "en" ? {
          stem: "Explain Porter's Five Forces model and how it applies to sourcing strategy. Provide specific examples from a procurement context.",
          rubric: { criteria: ["Accurately describes all five forces", "Applies to sourcing/procurement context", "Provides relevant examples", "Demonstrates strategic thinking"], maxScore: 10 },
          guidanceWordCount: { min: 150, max: 300 },
        } : {
          stem: "Expliquez le modèle des Cinq Forces de Porter et comment il s'applique à la stratégie sourcing. Fournissez des exemples spécifiques du contexte achats.",
          rubric: { criteria: ["Décrit correctement les cinq forces", "Applique au contexte sourcing/achats", "Fournit des exemples pertinents", "Démontre une pensée stratégique"], maxScore: 10 },
          guidanceWordCount: { min: 150, max: 300 },
        },
      },
      {
        language: lang,
        questionType: "OPEN_TEXT" as const,
        dimension: "PRACTICE" as const,
        domainTag: "supplier-negotiation",
        difficultyWeight: 2.0,
        content: lang === "en" ? {
          stem: "Describe your approach to preparing for a high-stakes supplier negotiation. What information would you gather, and how would you structure your negotiation plan?",
          rubric: { criteria: ["Identifies key preparation steps", "Describes information gathering methodology", "Outlines negotiation structure/tactics", "Considers win-win outcomes"], maxScore: 10 },
          guidanceWordCount: { min: 150, max: 250 },
        } : {
          stem: "Décrivez votre approche pour préparer une négociation fournisseur à enjeux élevés. Quelles informations rassembleriez-vous et comment structureriez-vous votre plan de négociation ?",
          rubric: { criteria: ["Identifie les étapes clés de préparation", "Décrit la méthodologie de collecte d'informations", "Présente la structure/tactiques de négociation", "Considère les résultats gagnant-gagnant"], maxScore: 10 },
          guidanceWordCount: { min: 150, max: 250 },
        },
      },
      {
        language: lang,
        questionType: "OPEN_TEXT" as const,
        dimension: "THEORY" as const,
        domainTag: "total-cost-ownership",
        difficultyWeight: 1.0,
        content: lang === "en" ? {
          stem: "What is Total Cost of Ownership (TCO) and why is it important in sourcing decisions? List at least 5 cost elements that should be included beyond the purchase price.",
          rubric: { criteria: ["Defines TCO accurately", "Explains importance in sourcing", "Lists at least 5 relevant cost elements", "Provides practical context"], maxScore: 10 },
          guidanceWordCount: { min: 100, max: 200 },
        } : {
          stem: "Qu'est-ce que le Coût Total de Possession (TCO) et pourquoi est-il important dans les décisions sourcing ? Listez au moins 5 éléments de coût à inclure au-delà du prix d'achat.",
          rubric: { criteria: ["Définit le TCO avec précision", "Explique l'importance en sourcing", "Liste au moins 5 éléments de coût pertinents", "Fournit un contexte pratique"], maxScore: 10 },
          guidanceWordCount: { min: 100, max: 200 },
        },
      },
    ]),
  ];

  // Create all sourcing questions and link to profile
  for (const q of sourcingQuestions) {
    const created = await prisma.question.create({ data: q as any });
    // Link questions that don't already have profiles (flatMap SCENARIO/OPEN_TEXT)
    const hasProfiles = (q as any).profiles;
    if (!hasProfiles) {
      await prisma.profileQuestion.upsert({
        where: { profileId_questionId: { profileId: profileSourcing.id, questionId: created.id } },
        create: { profileId: profileSourcing.id, questionId: created.id, difficultyWeight: created.difficultyWeight },
        update: {},
      });
    }
  }

  console.log(`Created ${sourcingQuestions.length} questions for Direct Procurement / Practitioner`);

  // For PROCUREMENT and SUPPLY_CHAIN profiles, create smaller representative sets
  // (abbreviated for seed — same pattern as above)
  const procurementQuestions = createProfileQuestions(profileProcurement.id, "procurement");
  for (const q of procurementQuestions) {
    await prisma.question.create({ data: q as any });
  }
  console.log(`Created ${procurementQuestions.length} questions for PROCUREMENT / L4_LEAD`);

  const scQuestions = createProfileQuestions(profileSupplyChain.id, "supply-chain");
  for (const q of scQuestions) {
    await prisma.question.create({ data: q as any });
  }
  console.log(`Created ${scQuestions.length} questions for SUPPLY_CHAIN / L6_EXECUTIVE`);

  // ── Demo Campaign ──
  const campaign = await prisma.campaign.upsert({
    where: { inviteToken: "demo-campaign-2026" },
    update: {},
    create: {
      name: "Q2 2026 Sourcing Assessment",
      organizationId: org.id,
      createdByAdminId: admin.id,
      jobProfileId: profileSourcing.id,
      startsAt: new Date("2026-01-01"),
      endsAt: new Date("2026-12-31"),
      inviteToken: "demo-campaign-2026",
      maxAttempts: 2,
      settings: {
        shuffleQuestions: true,
        showFeedbackImmediately: true,
        allowedLanguages: ["en", "fr"],
        totalQuestions: 15,
      },
    },
  });

  // ── Demo Candidates ──
  const candidates = [];
  for (let i = 1; i <= 5; i++) {
    const candidate = await prisma.user.upsert({
      where: { email: `candidate${i}@demo.assessment.com` },
      update: {},
      create: {
        email: `candidate${i}@demo.assessment.com`,
        name: `Demo Candidate ${i}`,
        role: "CANDIDATE",
        preferredLanguage: i <= 3 ? "en" : "fr",
      },
    });
    candidates.push(candidate);
  }

  // ── Demo Sessions with realistic scores ──
  const scoreProfiles = [
    { theory: 78, practice: 85, overall: 82.2 },
    { theory: 62, practice: 58, overall: 59.6 },
    { theory: 91, practice: 88, overall: 89.2 },
    { theory: 45, practice: 52, overall: 49.2 },
    { theory: 72, practice: 76, overall: 74.4 },
  ];

  for (let i = 0; i < 5; i++) {
    const scores = scoreProfiles[i];
    await prisma.assessmentSession.create({
      data: {
        candidateId: candidates[i].id,
        jobProfileId: profileSourcing.id,
        campaignId: campaign.id,
        status: "COMPLETED",
        startedAt: new Date(Date.now() - 3600000 * (5 - i)),
        completedAt: new Date(Date.now() - 3600000 * (4 - i)),
        durationSeconds: 1800 + Math.floor(Math.random() * 900),
        theoryScore: scores.theory,
        practiceScore: scores.practice,
        overallScore: scores.overall,
        domainScores: {
          "incoterms": 60 + Math.floor(Math.random() * 30),
          "supplier-evaluation": 55 + Math.floor(Math.random() * 35),
          "supplier-negotiation": 50 + Math.floor(Math.random() * 40),
          "supplier-risk": 60 + Math.floor(Math.random() * 30),
          "total-cost-ownership": 65 + Math.floor(Math.random() * 25),
        },
        integrityScore: i === 3 ? 0.65 : i === 1 ? 0.35 : 0.05,
        integrityRecommendation: i === 3 ? "FLAG" : i === 1 ? "REVIEW" : "PASS",
        integrityFlags: i === 3 ? [
          { type: "PASTE_DETECTED", questionId: "demo", pastedChars: 420 },
          { type: "FAST_ANSWER", detail: "180 words in 25s" },
        ] : i === 1 ? [
          { type: "FOCUS_LOSS", detail: "12 focus-loss events, 180s total" },
        ] : [],
        questionSequence: [],
      },
    });
  }

  console.log("Created demo campaign with 5 candidate sessions");
  console.log("Seeding complete!");
}

// ── Helper: create MCQ variants ──
function createMcqVariants(
  groupId: string,
  profileId: string,
  dimension: "THEORY" | "PRACTICE",
  domainTag: string,
  difficulty: number,
  variants: {
    en: Array<{ stem: string; options: string[]; correctAnswer: number }>;
    fr: Array<{ stem: string; options: string[]; correctAnswer: number }>;
  },
) {
  const questions: any[] = [];
  for (const lang of ["en", "fr"] as const) {
    for (let i = 0; i < variants[lang].length; i++) {
      questions.push({
        language: lang,
        questionType: "MCQ",
        dimension,
        domainTag,
        difficultyWeight: difficulty,
        variantGroupId: `${groupId}-${lang}`,
        content: variants[lang][i],
        profiles: { create: [{ profileId, difficultyWeight: difficulty }] },
      });
    }
  }
  return questions;
}

// ── Helper: create representative question set for a profile ──
function createProfileQuestions(profileId: string, prefix: string) {
  const questions: any[] = [];
  const domains = prefix === "procurement"
    ? ["contract-management", "strategic-sourcing", "spend-analysis", "compliance"]
    : ["logistics-optimization", "inventory-management", "S&OP", "digital-transformation"];

  for (const lang of ["en", "fr"]) {
    for (let i = 0; i < 4; i++) {
      const domain = domains[i];
      // MCQ Theory
      questions.push({
        language: lang,
        questionType: "MCQ",
        dimension: "THEORY",
        domainTag: domain,
        difficultyWeight: 1.0 + i * 0.5,
        variantGroupId: `${prefix}-t${i}-${lang}`,
        content: {
          stem: lang === "en"
            ? `Which of the following best describes the key principle of ${domain.replace(/-/g, " ")}?`
            : `Lequel des éléments suivants décrit le mieux le principe clé de ${domain.replace(/-/g, " ")} ?`,
          options: lang === "en"
            ? ["Cost reduction only", "Strategic value creation through systematic approach", "Supplier consolidation", "Compliance enforcement"]
            : ["Réduction des coûts uniquement", "Création de valeur stratégique par une approche systématique", "Consolidation des fournisseurs", "Application de la conformité"],
          correctAnswer: 1,
        },
        profiles: { create: [{ profileId, difficultyWeight: 1.0 + i * 0.5 }] },
      });
      // MCQ Practice
      questions.push({
        language: lang,
        questionType: "MCQ",
        dimension: "PRACTICE",
        domainTag: domain,
        difficultyWeight: 1.5 + i * 0.3,
        variantGroupId: `${prefix}-p${i}-${lang}`,
        content: {
          stem: lang === "en"
            ? `In a real-world ${domain.replace(/-/g, " ")} scenario, the most effective first step is:`
            : `Dans un scénario réel de ${domain.replace(/-/g, " ")}, la première étape la plus efficace est :`,
          options: lang === "en"
            ? ["Immediate action without analysis", "Data gathering and stakeholder alignment", "Outsource the decision", "Wait for management direction"]
            : ["Action immédiate sans analyse", "Collecte de données et alignement des parties prenantes", "Externaliser la décision", "Attendre la direction du management"],
          correctAnswer: 1,
        },
        profiles: { create: [{ profileId, difficultyWeight: 1.5 + i * 0.3 }] },
      });
    }
    // Scenario
    questions.push({
      language: lang,
      questionType: "SCENARIO",
      dimension: "PRACTICE",
      domainTag: domains[0],
      difficultyWeight: 2.0,
      content: lang === "en" ? {
        stem: "How would you handle this situation? Provide a structured response.",
        context: `You are leading a ${prefix} transformation initiative. Budget has been cut by 20%, but executive expectations remain unchanged. Two key team members have resigned.`,
        rubric: { criteria: ["Strategic prioritization", "Stakeholder management", "Resource optimization", "Risk mitigation"], maxScore: 10 },
      } : {
        stem: "Comment géreriez-vous cette situation ? Fournissez une réponse structurée.",
        context: `Vous dirigez une initiative de transformation ${prefix}. Le budget a été réduit de 20%, mais les attentes de la direction restent inchangées. Deux membres clés de l'équipe ont démissionné.`,
        rubric: { criteria: ["Priorisation stratégique", "Gestion des parties prenantes", "Optimisation des ressources", "Atténuation des risques"], maxScore: 10 },
      },
      profiles: { create: [{ profileId, difficultyWeight: 2.0 }] },
    });
    // Open Text
    questions.push({
      language: lang,
      questionType: "OPEN_TEXT",
      dimension: "THEORY",
      domainTag: domains[1],
      difficultyWeight: 1.5,
      content: lang === "en" ? {
        stem: `Explain the key frameworks and best practices for ${domains[1].replace(/-/g, " ")} at a senior level.`,
        rubric: { criteria: ["Framework knowledge", "Practical application", "Industry awareness", "Strategic perspective"], maxScore: 10 },
        guidanceWordCount: { min: 150, max: 300 },
      } : {
        stem: `Expliquez les cadres clés et les meilleures pratiques pour ${domains[1].replace(/-/g, " ")} au niveau senior.`,
        rubric: { criteria: ["Connaissance des cadres", "Application pratique", "Conscience de l'industrie", "Perspective stratégique"], maxScore: 10 },
        guidanceWordCount: { min: 150, max: 300 },
      },
      profiles: { create: [{ profileId, difficultyWeight: 1.5 }] },
    });
  }
  return questions;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
