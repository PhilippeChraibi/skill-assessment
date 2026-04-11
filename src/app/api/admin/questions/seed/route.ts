import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────────────────

type QType = "MCQ" | "SCENARIO" | "OPEN_TEXT" | "RANKED_CHOICE";
type Dim = "THEORY" | "PRACTICE";

interface QDef {
  questionType: QType;
  dimension: Dim;
  domainTag: string;
  content: Record<string, unknown>;
  variantGroupId?: string;
  /** Which tracks this question applies to */
  tracks: string[];
  /** Which bands within those tracks get this question */
  bands: number[];
}

// Difficulty weight per band level
const WEIGHT: Record<number, number> = { 1: 1.0, 2: 1.5, 3: 2.0, 4: 2.5, 5: 3.0 };
// Proficiency target per band level
const TARGET: Record<number, string> = { 1: "L", 2: "P", 3: "P", 4: "A", 5: "E" };

// ═══════════════════════════════════════════════════════════════════════════════
// QUESTION BANK
// ═══════════════════════════════════════════════════════════════════════════════

// ─── DIRECT PROCUREMENT ─────────────────────────────────────────────────────────

const DIRECT: QDef[] = [
  // --- MCQ Theory ---
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "trade-terms",
    tracks: ["DIRECT_PROCUREMENT"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "Which Incoterm transfers the risk from seller to buyer at the point when goods are loaded onto the vessel at the port of shipment?",
      options: ["EXW – Ex Works", "FOB – Free On Board", "CIF – Cost, Insurance & Freight", "DDP – Delivered Duty Paid"],
      correctAnswer: 1,
      explanation: "FOB (Free On Board) transfers the risk when goods pass the ship's rail at the named port of shipment. The seller bears all costs and risks until that point.",
    },
  },
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "supplier-management",
    tracks: ["DIRECT_PROCUREMENT"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "In a weighted supplier scorecard for direct materials, which criterion should typically carry the highest weight?",
      options: ["Price competitiveness", "Quality performance and defect rate", "Delivery reliability (OTIF)", "Financial stability of the supplier"],
      correctAnswer: 1,
      explanation: "For direct materials that go into the final product, quality is paramount. Defective components cascade into production issues, recalls and customer dissatisfaction, making quality the top-weighted criterion.",
    },
  },
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "cost-analysis",
    tracks: ["DIRECT_PROCUREMENT"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "Which of the following is NOT typically included in a Total Cost of Ownership (TCO) analysis for a purchased component?",
      options: ["Inbound logistics and freight costs", "The supplier's internal profit margin", "Quality inspection and testing costs", "Inventory carrying and warehousing costs"],
      correctAnswer: 1,
      explanation: "TCO captures costs borne by the buyer: acquisition, logistics, quality, inventory, disposal. The supplier's internal profit margin is part of the unit price, not a separately analysed TCO element.",
    },
  },
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "sourcing-strategy",
    tracks: ["DIRECT_PROCUREMENT"], bands: [2, 3, 4, 5],
    content: {
      stem: "In the Kraljic portfolio matrix, which quadrant represents items with HIGH supply risk and HIGH profit impact?",
      options: ["Leverage items", "Bottleneck items", "Strategic items", "Non-critical (routine) items"],
      correctAnswer: 2,
      explanation: "Strategic items sit in the high-risk / high-impact quadrant. They require close supplier partnerships, risk mitigation plans, and long-term contracts.",
    },
  },
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "contract-management",
    tracks: ["DIRECT_PROCUREMENT"], bands: [2, 3, 4, 5],
    content: {
      stem: "A 'liquidated damages' clause in a supply contract primarily serves to:",
      options: [
        "Penalise the buyer for late payment",
        "Pre-agree the compensation for specific supplier breaches such as late delivery",
        "Limit the supplier's total liability to the contract value",
        "Allow either party to terminate without notice",
      ],
      correctAnswer: 1,
      explanation: "Liquidated damages pre-determine the financial penalty for defined breaches (typically late delivery or quality failures), avoiding the need to prove actual damages in court.",
    },
  },
  // --- MCQ Practice ---
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "negotiation",
    tracks: ["DIRECT_PROCUREMENT"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "During a negotiation, a sole-source supplier quotes a 12% price increase citing raw material costs. Your most effective first response is to:",
      options: [
        "Accept the increase to maintain the relationship",
        "Request a detailed cost breakdown and verify raw material index movements independently",
        "Immediately threaten to switch suppliers",
        "Counter-offer with a flat 6% compromise",
      ],
      correctAnswer: 1,
      explanation: "Before accepting or countering, validate the claim with a should-cost model and commodity indices. Data-driven negotiation is more effective than positional bargaining.",
    },
  },
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "risk-management",
    tracks: ["DIRECT_PROCUREMENT"], bands: [2, 3, 4, 5],
    content: {
      stem: "Your Tier-1 supplier for a critical component has a single sub-supplier in a region prone to natural disasters. The best risk mitigation strategy is to:",
      options: [
        "Increase safety stock to cover 6 months of demand",
        "Require the Tier-1 supplier to qualify an alternative sub-supplier and maintain dual sourcing",
        "Accept the risk as it is the supplier's responsibility",
        "Switch to a different Tier-1 supplier immediately",
      ],
      correctAnswer: 1,
      explanation: "Dual sourcing at the sub-tier level directly addresses the single-point-of-failure. Safety stock is costly and only delays the impact; ignoring the risk is negligent; switching Tier-1 may not solve the sub-tier concentration.",
    },
  },
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "quality-management",
    tracks: ["DIRECT_PROCUREMENT"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "A batch of incoming raw materials fails incoming quality inspection. The production line needs the material within 48 hours. What is the correct course of action?",
      options: [
        "Use the material as-is to avoid production delays",
        "Initiate a formal deviation/concession process while requesting an expedited replacement shipment",
        "Return the entire shipment and halt production",
        "Negotiate a discount on the defective material and use it anyway",
      ],
      correctAnswer: 1,
      explanation: "A deviation/concession process involves engineering and quality sign-off on whether the material can be used with acceptable risk, while simultaneously securing replacement stock. This balances quality standards with operational urgency.",
    },
  },
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "sustainability",
    tracks: ["DIRECT_PROCUREMENT"], bands: [2, 3, 4, 5],
    content: {
      stem: "Your company commits to Scope 3 emissions reduction. As a direct procurement professional, the most impactful action is to:",
      options: [
        "Switch to green office supplies",
        "Integrate carbon footprint criteria into supplier scorecards and sourcing decisions",
        "Ask suppliers to sign a sustainability pledge",
        "Offset emissions by purchasing carbon credits",
      ],
      correctAnswer: 1,
      explanation: "For direct procurement, Scope 3 emissions come predominantly from purchased goods. Embedding carbon metrics in supplier evaluation and sourcing criteria drives measurable reduction at scale.",
    },
  },
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "category-management",
    tracks: ["DIRECT_PROCUREMENT"], bands: [3, 4, 5],
    content: {
      stem: "When developing a category strategy for a commodity with volatile pricing, which approach best protects the company?",
      options: [
        "Always negotiate fixed-price annual contracts",
        "Use a blended approach: partial fixed pricing plus index-linked formulas tied to commodity benchmarks",
        "Buy only on the spot market to capture dips",
        "Stockpile 12 months of inventory when prices are low",
      ],
      correctAnswer: 1,
      explanation: "A blended approach hedges against volatility — the fixed portion provides budget certainty while the indexed portion ensures fair pricing when markets move. Pure fixed or pure spot strategies carry asymmetric risk.",
    },
  },
  // --- OPEN TEXT ---
  {
    questionType: "OPEN_TEXT", dimension: "THEORY", domainTag: "sourcing-strategy",
    tracks: ["DIRECT_PROCUREMENT"], bands: [2, 3, 4, 5],
    content: {
      stem: "Explain the seven-step strategic sourcing methodology and describe how each step contributes to achieving sustainable cost reduction while managing supply risk.",
      rubric: {
        criteria: [
          "Identifies all seven steps accurately (profile needs, market analysis, strategy development, RFx, negotiation, implementation, performance management)",
          "Explains how each step builds on the previous one",
          "Connects cost reduction to value creation beyond price",
          "Addresses risk management throughout the process",
          "Demonstrates understanding of cross-functional collaboration",
        ],
        maxScore: 10,
      },
      guidanceWordCount: { min: 200, max: 500 },
    },
  },
  {
    questionType: "OPEN_TEXT", dimension: "PRACTICE", domainTag: "supplier-management",
    tracks: ["DIRECT_PROCUREMENT"], bands: [3, 4, 5],
    content: {
      stem: "A strategic supplier delivers 85% of a critical sub-assembly for your main product line. Describe how you would structure a Supplier Relationship Management (SRM) programme for this supplier, including governance, joint value creation initiatives, and risk monitoring.",
      rubric: {
        criteria: [
          "Proposes a clear governance structure (executive sponsorship, quarterly business reviews, operational meetings)",
          "Identifies joint value creation opportunities (co-innovation, VA/VE, demand visibility sharing)",
          "Describes risk monitoring mechanisms (financial health, capacity, sub-tier mapping)",
          "Addresses performance measurement and continuous improvement",
          "Considers contingency and exit planning despite the strategic nature",
        ],
        maxScore: 10,
      },
      guidanceWordCount: { min: 250, max: 500 },
    },
  },
  // --- SCENARIOS ---
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "sourcing-strategy",
    tracks: ["DIRECT_PROCUREMENT"], bands: [1, 2],
    content: {
      stem: "How would you handle this sourcing request? Outline the steps you would take and the key factors you would consider.",
      context: "You are a buyer at a mid-sized electronics manufacturer. The engineering team has qualified a new connector component for the next product generation. The current supplier quoted $2.40/unit for an estimated annual volume of 500,000 pieces. Engineering has provided two alternative suppliers whose samples passed initial testing. Your manager asks you to run the sourcing process for this component before the product launch in 4 months.",
      rubric: {
        criteria: [
          "Structures a clear sourcing process (specification review, RFQ to alternatives, evaluation, negotiation)",
          "Considers total cost beyond unit price (tooling, MOQ, logistics, quality)",
          "Addresses timeline constraints and qualification requirements",
          "Shows awareness of the need to involve stakeholders (engineering, quality, planning)",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "category-management",
    tracks: ["DIRECT_PROCUREMENT"], bands: [3],
    content: {
      stem: "Develop a category strategy for this packaging commodity. Describe your analysis, recommended strategy, and implementation roadmap.",
      context: "You are the category manager for packaging materials at a consumer goods company with 8 manufacturing plants across Europe. Annual spend is EUR 45M across corrugated boxes, labels, shrink film, and pallets. The supply base consists of 23 suppliers, with the top 3 representing 60% of spend. Raw material costs (paper pulp, resins) have increased 18% in the past year. Two plants are running different specifications for similar packaging. Sustainability pressure is mounting — the company has pledged 100% recyclable packaging by 2028.",
      rubric: {
        criteria: [
          "Conducts thorough spend and supply market analysis",
          "Identifies specification harmonisation as a lever for consolidation and savings",
          "Proposes a clear sourcing strategy (e.g., preferred supplier panel, competitive tension, index-linked pricing)",
          "Addresses sustainability requirements as integral to the strategy, not an afterthought",
          "Includes a phased implementation roadmap with quick wins and structural changes",
          "Considers stakeholder alignment across 8 plants",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "supplier-management",
    tracks: ["DIRECT_PROCUREMENT"], bands: [3],
    variantGroupId: "direct-l3-site-scenario",
    content: {
      stem: "As site procurement manager, how would you address this situation? Outline your immediate actions and medium-term plan.",
      context: "You are the site procurement manager at a food processing plant. Your main packaging film supplier has just informed you that their production line will be down for 3 weeks due to an equipment failure. You have 10 days of safety stock. This film is a custom specification with food-contact certification. The plant runs 24/7 and produces 200 tonnes/day of finished goods. An alternative supplier exists but has never been qualified for your specification. A line stoppage costs EUR 150,000 per day in lost margin.",
      rubric: {
        criteria: [
          "Takes immediate action to extend stock (reduce waste, optimise changeovers, check other sites for surplus)",
          "Initiates emergency qualification of the alternative supplier with expedited testing",
          "Escalates appropriately to plant management and group procurement",
          "Develops a medium-term dual sourcing plan to prevent recurrence",
          "Quantifies the risk and communicates a clear timeline to operations",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "sourcing-strategy",
    tracks: ["DIRECT_PROCUREMENT"], bands: [4],
    content: {
      stem: "As procurement manager, design a transformation plan for this situation. Describe your diagnostic, strategy, and change management approach.",
      context: "You have just been appointed Direct Procurement Manager for a group with EUR 300M direct spend across 12 plants in 5 countries. An initial diagnostic reveals: no standard sourcing process — each plant buys independently; supplier base of 1,200+ suppliers with significant overlap; no group contracts for major commodities; procurement reports to plant managers with no central governance; savings tracking is inconsistent and unreliable. The CEO expects EUR 15M in run-rate savings within 18 months and asks for your plan.",
      rubric: {
        criteria: [
          "Structures a clear diagnostic and prioritisation (spend analysis, category segmentation, quick wins vs. structural)",
          "Proposes governance model balancing central coordination with local execution",
          "Identifies top saving levers (consolidation, specification harmonisation, competitive tension, contract renegotiation)",
          "Addresses change management — bringing plant procurement teams on board",
          "Sets realistic milestones and KPIs for the 18-month timeline",
          "Considers capability building and tools/systems requirements",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "sourcing-strategy",
    tracks: ["DIRECT_PROCUREMENT"], bands: [4],
    variantGroupId: "direct-l4-cluster-scenario",
    content: {
      stem: "As cluster procurement manager, how would you harmonise procurement across these sites? Describe your approach and expected outcomes.",
      context: "You manage procurement for a cluster of 4 automotive parts plants in Central Europe (Czech Republic, Slovakia, Hungary, Poland). Each plant has its own buyer team (2-3 people each). Combined direct spend is EUR 120M, primarily metals (steel, aluminium), plastics, and electronic components. You discover that the 4 plants buy the same grade of steel from 3 different suppliers at prices varying by up to 15%. Tooling costs are not tracked centrally. Each plant has different ERP systems. The group is asking you to deliver 8% savings and improve supplier quality KPIs within 12 months.",
      rubric: {
        criteria: [
          "Proposes a structured spend analysis across all 4 sites to identify consolidation opportunities",
          "Designs a cluster contracting approach for common materials (steel, plastics) while respecting local needs",
          "Addresses the ERP/data harmonisation challenge pragmatically",
          "Plans supplier quality improvement initiatives (audits, development, scorecards)",
          "Considers team development and knowledge sharing across sites",
          "Provides a realistic savings waterfall and timeline",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "leadership",
    tracks: ["DIRECT_PROCUREMENT"], bands: [5],
    content: {
      stem: "As CPO, how would you develop and present your procurement strategy to the board? Describe your strategic vision, key initiatives, and how you would measure success.",
      context: "You are appointed CPO of a global industrial group (EUR 5B revenue, EUR 2.5B total procurement spend, 40 plants, 15,000 employees). The company has grown through acquisitions — procurement is fragmented with no group-wide strategy. The board expects you to present a 3-year procurement strategy at the next board meeting in 6 weeks. Key challenges: 5 different ERP systems, no central procurement organisation, talent gaps (most buyers are transactional), ESG pressure from investors demanding supply chain transparency, and the previous CPO left after 18 months. The CFO is sceptical about procurement's ability to deliver strategic value.",
      rubric: {
        criteria: [
          "Presents a compelling strategic vision linking procurement to enterprise value creation",
          "Proposes a phased transformation roadmap (foundation → acceleration → excellence)",
          "Addresses organisation design (COE, category leads, site buyers) with a clear operating model",
          "Includes digital/data strategy (spend analytics, e-sourcing, supplier portal)",
          "Develops talent strategy addressing capability gaps",
          "Integrates ESG/supply chain transparency as a strategic pillar",
          "Defines clear KPIs and governance for board-level reporting",
          "Addresses the CFO's scepticism with a credible value case",
        ],
        maxScore: 10,
      },
    },
  },
];

// ─── INDIRECT PROCUREMENT ───────────────────────────────────────────────────────

const INDIRECT: QDef[] = [
  // --- MCQ Theory ---
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "sourcing-strategy",
    tracks: ["INDIRECT_PROCUREMENT"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "Which statement best distinguishes indirect procurement from direct procurement?",
      options: [
        "Indirect procurement has lower total spend in most organisations",
        "Indirect spend supports operations but does not become part of the finished product",
        "Indirect procurement does not require competitive bidding",
        "Indirect categories are always services, never goods",
      ],
      correctAnswer: 1,
      explanation: "Indirect procurement covers goods and services that support the business (facilities, IT, travel, professional services) but are not incorporated into the product sold to customers.",
    },
  },
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "contract-management",
    tracks: ["INDIRECT_PROCUREMENT"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "When managing a services contract, a Service Level Agreement (SLA) should primarily define:",
      options: [
        "The hourly rate for each resource provided",
        "Measurable performance standards, reporting frequency, and remedies for non-compliance",
        "The supplier's organisational chart",
        "The buyer's internal approval workflow",
      ],
      correctAnswer: 1,
      explanation: "SLAs translate business requirements into measurable KPIs (availability, response time, quality). They must include how performance is measured, reported, and what happens when targets are missed (credits, escalation, termination rights).",
    },
  },
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "tail-spend",
    tracks: ["INDIRECT_PROCUREMENT"], bands: [2, 3, 4, 5],
    content: {
      stem: "Tail spend (the large number of low-value transactions) is best addressed by:",
      options: [
        "Ignoring it because the individual amounts are small",
        "Implementing catalogues, purchase cards, or marketplace solutions to channel spend through compliant routes",
        "Requiring competitive bids for every purchase regardless of value",
        "Centralising all purchasing decisions with the procurement team",
      ],
      correctAnswer: 1,
      explanation: "Tail spend is managed through enabling tools (e-catalogues, P-cards, marketplaces) that make compliant buying easy while providing visibility. Heavy process controls on low-value items destroy value through administrative cost.",
    },
  },
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "stakeholder-management",
    tracks: ["INDIRECT_PROCUREMENT"], bands: [2, 3, 4, 5],
    content: {
      stem: "In indirect procurement, maverick (off-contract) spending is primarily caused by:",
      options: [
        "Suppliers offering kickbacks to individual employees",
        "Lack of user-friendly buying channels and perceived slow procurement processes",
        "Insufficient budget allocation",
        "Regulatory requirements forcing local purchasing",
      ],
      correctAnswer: 1,
      explanation: "Maverick spend is most often driven by end-users finding procurement too slow or complicated. The solution is to make compliant buying as easy as non-compliant buying through self-service tools and streamlined processes.",
    },
  },
  // --- MCQ Practice ---
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "negotiation",
    tracks: ["INDIRECT_PROCUREMENT"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "You are renewing a facilities management (FM) contract. The incumbent proposes a 5% annual increase. Benchmarking shows the market average increase is 2%. Your best approach is to:",
      options: [
        "Accept the 5% to avoid the disruption of changing FM providers",
        "Present the benchmark data, request an open-book cost review, and run a parallel market test with alternative providers",
        "Simply demand a 0% increase as your opening position",
        "Switch to the cheapest alternative provider immediately",
      ],
      correctAnswer: 1,
      explanation: "Combining benchmark data with open-book transparency and credible alternatives creates negotiation leverage while maintaining a professional relationship. The market test validates fair pricing.",
    },
  },
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "demand-management",
    tracks: ["INDIRECT_PROCUREMENT"], bands: [2, 3, 4, 5],
    content: {
      stem: "The most effective way to reduce consulting spend is to:",
      options: [
        "Negotiate lower daily rates across all projects",
        "Implement demand management — challenge the need, scope, and duration of each engagement before it starts",
        "Ban all use of external consultants",
        "Switch to a single preferred consulting firm for volume discounts",
      ],
      correctAnswer: 1,
      explanation: "Rate negotiation typically yields 5-10% savings. Demand management — questioning whether the work is needed, can be done internally, or can be scoped more tightly — can reduce spend by 20-30% without compromising quality.",
    },
  },
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "category-management",
    tracks: ["INDIRECT_PROCUREMENT"], bands: [3, 4, 5],
    content: {
      stem: "You are developing an IT category strategy. The company uses 47 different SaaS tools across departments. Your priority action should be to:",
      options: [
        "Negotiate enterprise agreements with each of the 47 vendors",
        "Rationalise the portfolio — identify overlapping tools, consolidate to preferred solutions, then negotiate enterprise licenses",
        "Ask IT to block all non-approved SaaS subscriptions",
        "Let each department manage their own SaaS subscriptions",
      ],
      correctAnswer: 1,
      explanation: "Portfolio rationalisation before negotiation is critical. Consolidating 47 tools to a curated set eliminates redundancy, reduces integration complexity, improves data governance, and creates negotiation leverage through volume.",
    },
  },
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "sustainability",
    tracks: ["INDIRECT_PROCUREMENT"], bands: [2, 3, 4, 5],
    content: {
      stem: "To reduce the environmental impact of business travel, the most effective procurement-led initiative is to:",
      options: [
        "Negotiate carbon offsets with the travel agency",
        "Implement a travel policy with virtual-first mandate, class-of-service limits, and preferred airline agreements based on emissions data",
        "Ban all air travel",
        "Switch to a greener travel management company",
      ],
      correctAnswer: 1,
      explanation: "Policy-driven demand reduction (virtual-first) has the largest impact. Complementing it with data-driven carrier selection (emissions per route) and class-of-service limits creates a comprehensive, sustainable travel programme.",
    },
  },
  // --- OPEN TEXT ---
  {
    questionType: "OPEN_TEXT", dimension: "THEORY", domainTag: "sourcing-strategy",
    tracks: ["INDIRECT_PROCUREMENT"], bands: [2, 3, 4, 5],
    content: {
      stem: "Compare and contrast the sourcing approaches for two indirect categories: IT services (e.g., application development) and facilities management. Discuss how differences in market structure, switching costs, and service criticality should influence the sourcing strategy for each.",
      rubric: {
        criteria: [
          "Accurately characterises both markets (IT: fragmented, skills-driven; FM: more commoditised, site-dependent)",
          "Addresses switching costs (IT: high due to knowledge lock-in; FM: moderate, standardised scope)",
          "Proposes appropriate sourcing models for each (IT: multi-vendor panel, statement of work; FM: bundled contract, performance-based)",
          "Discusses total cost considerations beyond price (productivity, quality, innovation, risk)",
          "Shows practical awareness of stakeholder dynamics in each category",
        ],
        maxScore: 10,
      },
      guidanceWordCount: { min: 200, max: 500 },
    },
  },
  {
    questionType: "OPEN_TEXT", dimension: "PRACTICE", domainTag: "stakeholder-management",
    tracks: ["INDIRECT_PROCUREMENT"], bands: [3, 4, 5],
    content: {
      stem: "You need to gain buy-in from a resistant marketing department to consolidate their agency roster from 12 agencies to 4 preferred partners. Describe your influencing strategy, the data you would gather, and how you would structure the transition to minimise disruption while delivering value.",
      rubric: {
        criteria: [
          "Shows empathy for marketing's concerns (creativity, relationships, campaign continuity)",
          "Proposes a data-driven approach (spend analysis, agency performance, overlap mapping)",
          "Describes a collaborative process (joint evaluation criteria, marketing-led selection panels)",
          "Plans a phased transition that protects ongoing campaigns",
          "Articulates the value proposition beyond cost savings (quality, governance, brand consistency)",
        ],
        maxScore: 10,
      },
      guidanceWordCount: { min: 200, max: 500 },
    },
  },
  // --- SCENARIOS ---
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "sourcing-strategy",
    tracks: ["INDIRECT_PROCUREMENT"], bands: [1, 2],
    content: {
      stem: "How would you handle this procurement request? Describe your approach step by step.",
      context: "You are an indirect buyer. The HR department submits an urgent request to purchase a new Learning Management System (LMS). They have already identified their preferred vendor after a product demo and want procurement to 'just process the PO' for EUR 85,000/year. The contract is for 3 years with automatic renewal. No other vendors have been evaluated. The HR Director says the decision is final and asks you to expedite.",
      rubric: {
        criteria: [
          "Acknowledges HR's urgency while explaining the value of a competitive process",
          "Proposes a pragmatic approach (quick market scan, 2-3 alternatives, structured evaluation)",
          "Identifies contract risks in the proposed terms (auto-renewal, lock-in, data ownership)",
          "Demonstrates stakeholder management skills — firmness balanced with collaboration",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "category-management",
    tracks: ["INDIRECT_PROCUREMENT"], bands: [3],
    content: {
      stem: "Develop a category strategy for professional services at this company. Present your analysis, recommended approach, and expected outcomes.",
      context: "You are the category manager for professional services at a financial services company. Annual spend: EUR 28M broken down as management consulting (EUR 12M), IT consulting (EUR 8M), legal (EUR 5M), and audit/tax (EUR 3M). There are 95 active suppliers. Each business unit selects its own consultants with no central oversight. The CFO has raised concerns about value for money and asks you to bring structure to this category. Some business unit heads are former consultants with strong personal relationships with specific firms.",
      rubric: {
        criteria: [
          "Segments the category appropriately (strategic advisory vs. execution, recurring vs. project)",
          "Proposes governance mechanisms (demand challenge, rate cards, preferred panels, outcome-based pricing)",
          "Navigates the political landscape — personal relationships, business unit autonomy",
          "Balances cost reduction with access to quality expertise",
          "Includes measurable outcomes and implementation timeline",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "stakeholder-management",
    tracks: ["INDIRECT_PROCUREMENT"], bands: [3],
    variantGroupId: "indirect-l3-country-scenario",
    content: {
      stem: "As country procurement manager, how would you establish procurement governance in this context? Outline your 100-day plan.",
      context: "You are appointed as the first-ever country procurement manager for a multinational's operations in Brazil. The country has 3 business units, EUR 60M combined indirect spend, and no centralised procurement function. Each BU has its own admin team placing orders. There is no approved supplier list, no standard contracts, and limited spend visibility. The country director supports the initiative but warns that BU managers are protective of their autonomy. Local compliance requirements (especially for tax documentation — nota fiscal) add complexity.",
      rubric: {
        criteria: [
          "Proposes a structured 100-day plan (listen → diagnose → quick wins → roadmap)",
          "Prioritises spend analysis and stakeholder mapping as first steps",
          "Identifies quick wins that demonstrate value without threatening BU autonomy",
          "Addresses local compliance requirements (nota fiscal, tax regulations)",
          "Builds a sustainable governance model that balances central oversight with local needs",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "sourcing-strategy",
    tracks: ["INDIRECT_PROCUREMENT"], bands: [4],
    content: {
      stem: "As indirect procurement manager, design your strategy to address this challenge. Present your analysis, prioritisation, and implementation approach.",
      context: "You manage the indirect procurement team (6 buyers) for a pharma company with EUR 200M indirect spend. A new CEO mandates 10% cost reduction (EUR 20M) over 2 years. Current contract coverage is only 45% — the rest is unmanaged. Top categories: IT (EUR 50M), facilities & real estate (EUR 40M), professional services (EUR 35M), marketing (EUR 30M), travel & fleet (EUR 25M), MRO & lab supplies (EUR 20M). Your team has strong capabilities in IT and facilities but limited experience with marketing and professional services. The marketing CMO is known to resist procurement involvement.",
      rubric: {
        criteria: [
          "Prioritises categories based on savings potential, addressability, and team capability",
          "Proposes different strategies per category (competitive sourcing, demand management, specification change, consolidation)",
          "Builds a realistic savings waterfall that adds up to EUR 20M",
          "Addresses the capability gap for marketing and professional services (training, external support, cross-functional approach)",
          "Plans stakeholder engagement — particularly the CMO",
          "Considers team capacity and sequencing of initiatives",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "sourcing-strategy",
    tracks: ["INDIRECT_PROCUREMENT"], bands: [4],
    variantGroupId: "indirect-l4-regional-scenario",
    content: {
      stem: "As regional procurement manager, how would you approach this cross-country consolidation? Describe your methodology and change management approach.",
      context: "You are the regional procurement manager for EMEA at a technology company. You oversee indirect procurement for 8 countries with combined spend of EUR 180M. Each country has 1-2 buyers. A benchmarking study shows that the company pays 20-35% more than peers for comparable services (cleaning, security, catering, fleet) due to fragmented local contracts. The CEO asks you to deliver EUR 12M savings through regional consolidation within 18 months. Country managers resist, arguing that local suppliers understand local regulations and labour markets better than international providers.",
      rubric: {
        criteria: [
          "Segments categories by consolidation potential (some are truly regional, others require local execution)",
          "Proposes a pragmatic model (regional frame agreements with local call-offs where appropriate)",
          "Addresses country managers' concerns about local compliance and service quality",
          "Designs a structured change management approach (pilots, proof points, phased rollout)",
          "Builds a credible savings case with implementation timeline",
          "Considers cultural and regulatory differences across 8 countries",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "leadership",
    tracks: ["INDIRECT_PROCUREMENT"], bands: [5],
    content: {
      stem: "As CPO, present your vision for transforming indirect procurement into a strategic function. Describe your operating model, digital strategy, and how you would build the business case.",
      context: "You are the CPO of a global services company (EUR 8B revenue, 50,000 employees, 30 countries). Direct spend is minimal — 80% of the EUR 3B procurement spend is indirect. Procurement is seen as a back-office function focused on PO processing. A new CEO with a cost-transformation agenda asks you to reinvent the function. Current state: 120 procurement staff mostly doing transactional work, 8,000+ active suppliers, no e-procurement platform, P2P process takes 15 days on average, contract compliance at 40%, and no category management framework. The CEO wants procurement to become a 'value partner' to the business within 3 years.",
      rubric: {
        criteria: [
          "Presents a compelling vision linking procurement transformation to business strategy",
          "Designs an operating model (category management, shared services, business partnering)",
          "Proposes a digital roadmap (P2P platform, analytics, intake management, supplier portal)",
          "Addresses talent transformation (from transactional to strategic — reskilling, new hires, structure)",
          "Builds a phased business case with quick wins (Year 1) and structural transformation (Years 2-3)",
          "Defines KPIs beyond savings (contract compliance, cycle time, stakeholder satisfaction, innovation)",
          "Considers change management at scale (120 staff, 30 countries)",
        ],
        maxScore: 10,
      },
    },
  },
];

// ─── PUBLIC PROCUREMENT ─────────────────────────────────────────────────────────

const PUBLIC: QDef[] = [
  // --- MCQ Theory ---
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "regulatory-compliance",
    tracks: ["PUBLIC_PROCUREMENT"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "Under most public procurement regulations, the primary principle governing the award of contracts is:",
      options: [
        "Always selecting the lowest price bid",
        "Ensuring transparency, equal treatment, and non-discrimination among bidders",
        "Giving preference to local suppliers to support the economy",
        "Minimising the number of bidders to speed up the process",
      ],
      correctAnswer: 1,
      explanation: "Public procurement is governed by principles of transparency, equal treatment, and non-discrimination. While value for money is important, it must be achieved within these fundamental principles.",
    },
  },
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "public-tendering",
    tracks: ["PUBLIC_PROCUREMENT"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "In a restricted procedure, the purpose of the pre-qualification stage is to:",
      options: [
        "Negotiate prices with all interested suppliers before the tender",
        "Shortlist candidates based on their technical and financial capacity before issuing the full tender documents",
        "Eliminate foreign suppliers from the process",
        "Allow suppliers to modify the specifications before bidding",
      ],
      correctAnswer: 1,
      explanation: "Pre-qualification in a restricted procedure assesses bidders' capacity (financial standing, technical experience, references) to create a shortlist, reducing evaluation burden while ensuring only capable firms receive the full tender.",
    },
  },
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "transparency-integrity",
    tracks: ["PUBLIC_PROCUREMENT"], bands: [2, 3, 4, 5],
    content: {
      stem: "A 'conflict of interest' in public procurement occurs when:",
      options: [
        "Two departments need the same product at the same time",
        "An evaluation committee member has a personal or financial interest that could influence their impartiality",
        "Two suppliers submit identical prices",
        "The procurement timeline conflicts with the budget cycle",
      ],
      correctAnswer: 1,
      explanation: "Conflicts of interest arise when personal, financial, or other interests of individuals involved in the procurement process could compromise their objectivity. They must be declared and managed to maintain the integrity of the process.",
    },
  },
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "contract-management",
    tracks: ["PUBLIC_PROCUREMENT"], bands: [2, 3, 4, 5],
    content: {
      stem: "A framework agreement in public procurement is best described as:",
      options: [
        "A binding contract for a fixed quantity of goods at a fixed price",
        "An agreement establishing terms for future call-off contracts without committing to specific volumes",
        "A verbal understanding between the authority and a preferred supplier",
        "A one-time purchase order for emergency procurements",
      ],
      correctAnswer: 1,
      explanation: "Framework agreements set pre-agreed terms (prices, quality, conditions) with one or more suppliers for a defined period, allowing the authority to place call-off orders as needs arise without repeating the full tender process.",
    },
  },
  // --- MCQ Practice ---
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "public-tendering",
    tracks: ["PUBLIC_PROCUREMENT"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "During a tender evaluation, one bidder submits a price that is 40% below all other offers. The correct approach is to:",
      options: [
        "Award the contract immediately as it offers the best value",
        "Investigate whether the bid is abnormally low by requesting a detailed price justification from the bidder",
        "Disqualify the bidder automatically for unrealistic pricing",
        "Increase the winning threshold to eliminate outliers",
      ],
      correctAnswer: 1,
      explanation: "Abnormally low tenders must be investigated — the authority should request a breakdown and justification. The bid may be valid (innovative methods, strategic pricing) or may indicate risks (underbidding, hidden costs, labour law violations).",
    },
  },
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "supplier-evaluation",
    tracks: ["PUBLIC_PROCUREMENT"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "When evaluating tenders using the 'Most Economically Advantageous Tender' (MEAT) criteria, the evaluation methodology must be:",
      options: [
        "Decided by the evaluation committee after opening the bids",
        "Published in the tender documents before bids are submitted, including weights for each criterion",
        "Kept confidential to prevent gaming by bidders",
        "Based solely on the evaluators' professional judgement without predefined criteria",
      ],
      correctAnswer: 1,
      explanation: "MEAT criteria and their relative weights must be published in advance to ensure transparency and allow bidders to tailor their offers accordingly. Changing criteria after bid opening violates equal treatment principles.",
    },
  },
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "market-engagement",
    tracks: ["PUBLIC_PROCUREMENT"], bands: [2, 3, 4, 5],
    content: {
      stem: "Preliminary market consultation (PMC) before launching a tender should:",
      options: [
        "Be avoided as it gives unfair advantage to consulted suppliers",
        "Be conducted transparently, documented, and open to all interested parties to inform the procurement strategy",
        "Only involve the incumbent supplier",
        "Replace the formal tender process for low-value contracts",
      ],
      correctAnswer: 1,
      explanation: "PMC is encouraged when conducted transparently. It helps define realistic specifications, understand market capacity, and estimate budgets. The key is documentation, equal access, and ensuring no bidder gains unfair advantage.",
    },
  },
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "sustainability",
    tracks: ["PUBLIC_PROCUREMENT"], bands: [2, 3, 4, 5],
    content: {
      stem: "To integrate environmental criteria into a public tender without restricting competition, the best approach is to:",
      options: [
        "Require a specific eco-label as a mandatory requirement",
        "Define performance-based environmental requirements and accept equivalent evidence from any certification body",
        "Award bonus points for suppliers headquartered in countries with strict environmental laws",
        "Add environmental criteria only if the budget allows a price premium",
      ],
      correctAnswer: 1,
      explanation: "Specifying performance outcomes (e.g., energy efficiency level, recycled content percentage) rather than specific labels ensures equal treatment. Any equivalent proof must be accepted to avoid discriminating against bidders with different certifications.",
    },
  },
  // --- OPEN TEXT ---
  {
    questionType: "OPEN_TEXT", dimension: "THEORY", domainTag: "regulatory-compliance",
    tracks: ["PUBLIC_PROCUREMENT"], bands: [2, 3, 4, 5],
    content: {
      stem: "Explain the key differences between open procedure, restricted procedure, and competitive dialogue in public procurement. For each procedure, describe when it is most appropriate and what safeguards ensure fair competition.",
      rubric: {
        criteria: [
          "Accurately describes all three procedures and their defining characteristics",
          "Identifies appropriate use cases for each (standard purchases, complex projects, innovation)",
          "Explains how each procedure maintains fair competition and transparency",
          "Demonstrates understanding of the trade-offs (speed vs. competition vs. flexibility)",
          "References practical considerations (administrative burden, supplier market, complexity)",
        ],
        maxScore: 10,
      },
      guidanceWordCount: { min: 200, max: 500 },
    },
  },
  // --- SCENARIOS ---
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "public-tendering",
    tracks: ["PUBLIC_PROCUREMENT"], bands: [1, 2],
    content: {
      stem: "How would you handle this tender process? Describe your approach and the key documents you would prepare.",
      context: "You are a procurement officer at a municipal authority. The parks department requests procurement of 15 ride-on lawn mowers for public parks maintenance, with an estimated budget of EUR 300,000. The previous contract expired 6 months ago and the department has been renting equipment at high cost. The parks director insists on a specific brand because 'the maintenance team knows how to service them.' You need to run a compliant procurement process.",
      rubric: {
        criteria: [
          "Identifies the need to write performance-based specifications rather than brand-specific ones",
          "Selects the appropriate procurement procedure for the value and complexity",
          "Describes key tender documents (specifications, evaluation criteria, contract terms)",
          "Addresses the brand preference issue diplomatically while maintaining competition",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "public-tendering",
    tracks: ["PUBLIC_PROCUREMENT"], bands: [3],
    content: {
      stem: "How would you structure this complex procurement? Describe your procurement strategy, procedure selection, and risk management approach.",
      context: "You are a senior procurement officer at a regional health authority. You need to procure a new electronic health records (EHR) system for 12 hospitals and 45 clinics. Estimated contract value is EUR 25M over 7 years (including implementation, licensing, maintenance, and training). The current system is 15 years old and vendor support ends in 18 months. Clinical staff are anxious about the transition. Three major vendors dominate the market globally, but two smaller European vendors are emerging. The procurement must comply with public procurement directives and health data regulations.",
      rubric: {
        criteria: [
          "Selects an appropriate procedure for this complexity (competitive dialogue or competitive procedure with negotiation)",
          "Structures the procurement in phases (market engagement, pre-qualification, dialogue/negotiation, final tender)",
          "Addresses data migration and transition risk in the evaluation criteria",
          "Balances technical requirements with user acceptance and change management",
          "Considers data sovereignty, health data regulations, and interoperability standards",
          "Plans stakeholder engagement with clinical staff throughout the process",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "contract-management",
    tracks: ["PUBLIC_PROCUREMENT"], bands: [4],
    content: {
      stem: "As procurement manager, how would you address this contract performance issue while maintaining legal compliance?",
      context: "You are the public procurement manager for a national infrastructure agency. A EUR 45M road construction contract awarded 2 years ago is facing serious issues: the contractor is 8 months behind schedule, has submitted 12 variation orders totalling EUR 7M, and quality inspections have revealed substandard work on 3 sections. The contractor claims that unforeseen ground conditions and design changes justify the delays and additional costs. The opposition press is asking questions about cost overruns. Your legal team advises that terminating the contract would trigger a EUR 5M penalty to the contractor and delay the project by another 18 months for re-procurement.",
      rubric: {
        criteria: [
          "Analyses the situation systematically (which claims are legitimate, which are contractor performance issues)",
          "Proposes a structured remediation plan with the contractor (recovery schedule, quality improvement, cost containment)",
          "Addresses the variation orders through proper contract mechanisms (legitimate scope changes vs. contractor risk)",
          "Manages external stakeholders (political scrutiny, public communication)",
          "Considers the legal and practical implications of different courses of action",
          "Implements enhanced oversight and governance for the remainder of the contract",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "leadership",
    tracks: ["PUBLIC_PROCUREMENT"], bands: [5],
    content: {
      stem: "As head of public procurement, present your modernisation strategy. How would you transform the function while navigating political and institutional constraints?",
      context: "You are appointed Head of Public Procurement for a national government. The function oversees EUR 15B in annual public spending across 40 ministries and agencies. An audit report has identified significant issues: only 55% of contracts are awarded through competitive procedures; average procurement cycle is 9 months; 30% of contracts experience cost overruns above 20%; digital maturity is low (most processes are paper-based); the procurement workforce (250 staff) lacks modern skills; and public trust in procurement integrity is low following a corruption scandal in the transport ministry. The Prime Minister gives you a mandate to modernise public procurement within a 5-year term.",
      rubric: {
        criteria: [
          "Presents a strategic vision for public procurement modernisation aligned with national priorities",
          "Proposes institutional reforms (centralisation vs. devolution, oversight, accountability)",
          "Designs a digitalisation roadmap (e-procurement platform, open data, analytics)",
          "Addresses integrity and anti-corruption measures systematically",
          "Plans workforce capability building (training, professionalisation, career paths)",
          "Considers the political and institutional dynamics of change across 40 ministries",
          "Defines measurable outcomes and a realistic implementation timeline",
        ],
        maxScore: 10,
      },
    },
  },
];

// ─── SUPPLY CHAIN ───────────────────────────────────────────────────────────────

const SUPPLY_CHAIN: QDef[] = [
  // --- MCQ Theory ---
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "supply-chain-planning",
    tracks: ["SUPPLY_CHAIN"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "The 'bullwhip effect' in supply chains refers to:",
      options: [
        "The reduction in lead times as products move closer to the customer",
        "The amplification of demand variability as orders move upstream from retailer to manufacturer to supplier",
        "The increase in product quality through supply chain collaboration",
        "The acceleration of inventory turns through lean manufacturing",
      ],
      correctAnswer: 1,
      explanation: "The bullwhip effect describes how small fluctuations in consumer demand get amplified at each upstream stage of the supply chain, leading to excessive inventory, capacity mismatches, and inefficiency.",
    },
  },
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "inventory-management",
    tracks: ["SUPPLY_CHAIN"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "The Economic Order Quantity (EOQ) model balances which two competing costs?",
      options: [
        "Transportation costs and warehousing costs",
        "Ordering costs (per order) and inventory holding costs (per unit per period)",
        "Unit purchase price and supplier development costs",
        "Insurance costs and obsolescence costs",
      ],
      correctAnswer: 1,
      explanation: "EOQ minimises total inventory cost by finding the order quantity where ordering costs (fixed cost per order × number of orders) and holding costs (per unit carrying cost × average inventory) intersect.",
    },
  },
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "s-and-op",
    tracks: ["SUPPLY_CHAIN"], bands: [2, 3, 4, 5],
    content: {
      stem: "Sales & Operations Planning (S&OP) primarily aims to:",
      options: [
        "Maximise production output regardless of demand",
        "Align demand forecasts, supply capacity, and financial plans on a rolling horizon through cross-functional consensus",
        "Replace the annual budgeting process",
        "Automate production scheduling in the ERP system",
      ],
      correctAnswer: 1,
      explanation: "S&OP is a monthly cross-functional process that balances demand, supply, and financial views to create a single consensus plan. It operates on a rolling 12-24 month horizon and drives executive decision-making.",
    },
  },
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "logistics",
    tracks: ["SUPPLY_CHAIN"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "A cross-docking strategy is most appropriate when:",
      options: [
        "Products require long-term cold storage",
        "Incoming shipments can be directly sorted and transferred to outbound vehicles with minimal storage time",
        "Demand is highly unpredictable and safety stock is needed",
        "The company operates a single warehouse serving one customer",
      ],
      correctAnswer: 1,
      explanation: "Cross-docking works best for high-volume, predictable flows where goods arrive from multiple suppliers and can be rapidly sorted and consolidated for outbound delivery, eliminating storage and reducing handling costs.",
    },
  },
  // --- MCQ Practice ---
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "demand-forecasting",
    tracks: ["SUPPLY_CHAIN"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "Your demand forecast for Product A shows a Mean Absolute Percentage Error (MAPE) of 45%. The most effective action to improve accuracy is to:",
      options: [
        "Switch to a more complex statistical model",
        "Segment demand by customer/channel and investigate drivers of variability, combining statistical methods with commercial intelligence",
        "Increase the forecasting frequency from monthly to weekly",
        "Add more historical data by extending the lookback period to 5 years",
      ],
      correctAnswer: 1,
      explanation: "High MAPE often stems from mixing different demand patterns. Segmenting by customer, channel, or product group reveals distinct patterns. Combining statistical baselines with market intelligence (promotions, tenders, seasonality) improves accuracy far more than model complexity alone.",
    },
  },
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "inventory-management",
    tracks: ["SUPPLY_CHAIN"], bands: [2, 3, 4, 5],
    content: {
      stem: "Your warehouse holds EUR 50M in inventory with 60 days of stock on hand. The CFO demands a 20% reduction. Which approach will sustainably reduce inventory without harming service levels?",
      options: [
        "Write off slow-moving stock to reduce the balance sheet value",
        "Implement ABC-XYZ segmentation and set differentiated safety stock policies — aggressive for predictable items, buffered for volatile ones",
        "Stop all purchase orders until inventory drops to target",
        "Negotiate consignment stock with all suppliers",
      ],
      correctAnswer: 1,
      explanation: "ABC-XYZ segmentation classifies items by value (ABC) and demand variability (XYZ), enabling targeted inventory policies. AX items need lean replenishment; CZ items may need higher safety stock or different supply strategies. This is more sustainable than blunt cuts.",
    },
  },
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "risk-management",
    tracks: ["SUPPLY_CHAIN"], bands: [2, 3, 4, 5],
    content: {
      stem: "A key semiconductor supplier notifies you of a 20-week lead time increase (from 12 to 32 weeks). Your assembly line will run out of chips in 8 weeks. Your priority action is to:",
      options: [
        "Wait for the supplier to resolve their capacity issue",
        "Execute a multi-pronged approach: broker market for spot buys, substitute with pin-compatible alternatives, redesign to reduce chip count, and negotiate allocation priority with the supplier",
        "Switch all production to products that do not require that chip",
        "Place a massive forward order and accept the 32-week lead time",
      ],
      correctAnswer: 1,
      explanation: "A supply crisis requires parallel actions: short-term (broker market, allocation negotiation), medium-term (qualification of alternatives), and long-term (design changes). No single action is sufficient; a coordinated response across supply chain, engineering, and commercial functions is essential.",
    },
  },
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "digital-supply-chain",
    tracks: ["SUPPLY_CHAIN"], bands: [3, 4, 5],
    content: {
      stem: "A supply chain control tower provides the most value by:",
      options: [
        "Replacing the need for human planners with AI",
        "Providing end-to-end visibility across the supply network and enabling proactive exception management through real-time data integration",
        "Automating all procurement decisions",
        "Reducing the number of warehouses in the network",
      ],
      correctAnswer: 1,
      explanation: "A control tower integrates data from ERP, TMS, WMS, and external sources to provide real-time visibility. Its value lies in early detection of exceptions (delays, shortages, quality issues) and coordinated response, not in replacing planners.",
    },
  },
  // --- OPEN TEXT ---
  {
    questionType: "OPEN_TEXT", dimension: "THEORY", domainTag: "s-and-op",
    tracks: ["SUPPLY_CHAIN"], bands: [2, 3, 4, 5],
    content: {
      stem: "Describe the five steps of a mature Sales & Operations Planning (S&OP) process. For each step, explain its purpose, key inputs, outputs, and the cross-functional participants involved. Then discuss how S&OP maturity evolves from a basic supply-demand balancing exercise to a strategic business management process.",
      rubric: {
        criteria: [
          "Identifies all five steps (data gathering, demand review, supply review, pre-S&OP, executive S&OP)",
          "Correctly describes inputs/outputs and participants for each step",
          "Explains how S&OP connects demand, supply, inventory, and financial plans",
          "Articulates the maturity journey (reactive → proactive → integrated business planning)",
          "Demonstrates understanding of the executive decision-making role in S&OP",
        ],
        maxScore: 10,
      },
      guidanceWordCount: { min: 250, max: 500 },
    },
  },
  {
    questionType: "OPEN_TEXT", dimension: "PRACTICE", domainTag: "supply-chain-planning",
    tracks: ["SUPPLY_CHAIN"], bands: [3, 4, 5],
    content: {
      stem: "You are asked to design a supply chain network for a new product line launching across Europe. Describe your approach to network design, including the factors you would consider, the trade-offs you would evaluate, and how you would model different scenarios.",
      rubric: {
        criteria: [
          "Considers key network design factors (demand geography, service requirements, cost structure, risk)",
          "Evaluates centralised vs. decentralised distribution trade-offs",
          "Addresses transportation mode selection and cost modelling",
          "Discusses scenario analysis methodology (best/worst case, sensitivity analysis)",
          "Integrates sustainability considerations into the network design",
        ],
        maxScore: 10,
      },
      guidanceWordCount: { min: 200, max: 500 },
    },
  },
  // --- SCENARIOS ---
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "supply-chain-planning",
    tracks: ["SUPPLY_CHAIN"], bands: [1, 2],
    content: {
      stem: "How would you investigate and resolve this inventory discrepancy? Describe your analysis and corrective actions.",
      context: "You are a supply chain coordinator at a consumer electronics distributor. During the monthly inventory count, you discover a discrepancy: the system shows 2,400 units of a fast-moving tablet model in stock, but the physical count shows only 1,850 units — a variance of 550 units valued at EUR 165,000. The warehouse uses barcode scanning for receiving and picking. The discrepancy has been growing over the past 3 months. Your manager asks you to investigate and fix the root cause.",
      rubric: {
        criteria: [
          "Proposes a systematic investigation approach (transaction analysis, process observation, receiving vs. shipping records)",
          "Identifies potential root causes (scanning errors, returns processing, theft, system timing issues)",
          "Recommends corrective actions addressing the root cause, not just the symptom",
          "Suggests preventive measures (cycle counting, process controls, system improvements)",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "s-and-op",
    tracks: ["SUPPLY_CHAIN"], bands: [3],
    content: {
      stem: "How would you resolve this demand-supply imbalance? Present your analysis and recommended plan to the S&OP meeting.",
      context: "You are a supply chain specialist at a beverage company. The commercial team has just secured a listing with a major supermarket chain starting in 6 weeks, which will increase demand for your top 3 SKUs by 35%. However, your production lines are already running at 90% capacity. Raw material lead times are 4 weeks for key ingredients. The warehouse is at 95% capacity. The CFO does not want to approve overtime or temporary storage without a clear business case. You need to present a plan at the weekly S&OP meeting.",
      rubric: {
        criteria: [
          "Quantifies the demand uplift in units and maps it against available capacity by SKU",
          "Proposes a phased production plan (pre-build, shift optimisation, SKU prioritisation)",
          "Addresses raw material supply — accelerating orders, securing additional allocation",
          "Builds a financial case for overtime/temporary storage showing ROI of the new listing",
          "Identifies risks and contingencies (what if demand exceeds forecast, what if supply fails)",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "supply-chain-planning",
    tracks: ["SUPPLY_CHAIN"], bands: [4],
    content: {
      stem: "As supply chain manager, design your strategy for this warehouse network transformation. Present your analysis, options, and recommendation.",
      context: "You are the supply chain manager for a medical devices company with EUR 400M revenue in Europe. Current distribution: 6 national warehouses (one per major market), each carrying the full product range (8,000 SKUs). Total inventory value: EUR 85M. Service level: 96% OTIF (target: 98%). The CEO wants to improve service levels while reducing total logistics cost by 15%. Competitors are moving to next-day delivery. You have been asked to evaluate consolidating to 2 European distribution centres with direct-to-customer delivery. Regulatory requirements mandate certain products to be stored at specific temperatures. Some products have shelf-life constraints.",
      rubric: {
        criteria: [
          "Analyses the current network cost structure (warehousing, transport, inventory carrying)",
          "Models the consolidated network scenario (location analysis, transportation impact, service level implications)",
          "Addresses regulatory and temperature-controlled storage requirements",
          "Evaluates the inventory pooling benefit of centralisation",
          "Considers the transition risk (customer service during migration, change management)",
          "Presents a balanced recommendation with implementation phasing",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "leadership",
    tracks: ["SUPPLY_CHAIN"], bands: [5],
    content: {
      stem: "As Head of Supply Chain, present your strategy for building a resilient, sustainable, and digitally-enabled supply chain. How would you balance cost, service, sustainability, and resilience?",
      context: "You are the Head of Supply Chain for a global FMCG company (EUR 12B revenue, 50 factories, 200 distribution points, serving 80 countries). Recent disruptions (pandemic, Suez Canal blockage, energy crisis) exposed vulnerabilities: 40% of suppliers are single-source; inventory policy is uniform (no segmentation); carbon emissions from logistics are under investor scrutiny; planning still relies heavily on spreadsheets; and supply chain talent retention is at 70% (industry average: 82%). The board asks you to present a 5-year supply chain strategy at the next board meeting.",
      rubric: {
        criteria: [
          "Presents a cohesive strategic framework balancing the four priorities (cost, service, resilience, sustainability)",
          "Proposes a resilience strategy (dual sourcing, regional hubs, inventory segmentation, risk monitoring)",
          "Designs a sustainability roadmap (logistics decarbonisation, circular supply chain, supplier ESG)",
          "Includes a digital transformation plan (planning systems, control tower, AI/ML applications)",
          "Addresses talent strategy (retention, capability building, automation of routine tasks)",
          "Defines a clear governance model and KPIs for board reporting",
          "Balances ambition with pragmatic phasing and resource constraints",
        ],
        maxScore: 10,
      },
    },
  },
];

// ─── PROCUREMENT EXCELLENCE ─────────────────────────────────────────────────────

const EXCELLENCE: QDef[] = [
  // --- MCQ Theory ---
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "data-analytics",
    tracks: ["PROCUREMENT_EXCELLENCE"], bands: [2, 4],
    content: {
      stem: "In procurement spend analysis, the most important data quality step before analysis is:",
      options: [
        "Sorting data by supplier name alphabetically",
        "Classifying spend into a standard taxonomy (e.g., UNSPSC) and normalising supplier names",
        "Converting all currencies to USD",
        "Removing transactions below EUR 1,000",
      ],
      correctAnswer: 1,
      explanation: "Spend classification into a standard taxonomy enables like-for-like comparison, category analysis, and benchmarking. Supplier name normalisation consolidates fragmented records. Without these steps, spend analysis produces misleading results.",
    },
  },
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "process-improvement",
    tracks: ["PROCUREMENT_EXCELLENCE"], bands: [2, 4],
    content: {
      stem: "The Procure-to-Pay (P2P) cycle time is best reduced by:",
      options: [
        "Hiring more accounts payable clerks",
        "Automating touchless processing for PO-based invoices through three-way matching and eliminating manual approvals for low-risk transactions",
        "Paying all invoices immediately upon receipt",
        "Reducing the number of suppliers to simplify the process",
      ],
      correctAnswer: 1,
      explanation: "Touchless processing — automated three-way matching of PO, goods receipt, and invoice — handles the high-volume, low-risk transactions without human intervention. This dramatically reduces cycle time while maintaining controls where they matter.",
    },
  },
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "performance-measurement",
    tracks: ["PROCUREMENT_EXCELLENCE"], bands: [2, 4],
    content: {
      stem: "Which KPI best measures procurement's contribution to the bottom line?",
      options: [
        "Number of purchase orders processed per month",
        "Realised savings vs. baseline, validated by finance and reflected in the P&L",
        "Number of suppliers in the approved supplier list",
        "Average time to issue a purchase order",
      ],
      correctAnswer: 1,
      explanation: "Realised (P&L-impacting) savings — validated by finance, not just 'procurement-claimed' — are the gold standard for measuring value contribution. Process metrics (PO count, cycle time) measure efficiency but not impact.",
    },
  },
  // --- MCQ Practice ---
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "digital-procurement",
    tracks: ["PROCUREMENT_EXCELLENCE"], bands: [2, 4],
    content: {
      stem: "When implementing a new e-sourcing platform, the biggest risk to user adoption is:",
      options: [
        "The platform not having enough features",
        "Insufficient change management — users reverting to email and spreadsheets because the new tool feels unfamiliar or adds perceived effort",
        "The platform being too modern-looking",
        "Having too many training sessions scheduled",
      ],
      correctAnswer: 1,
      explanation: "Technology adoption fails most often due to poor change management, not technology limitations. Users need to understand the 'why', be trained on the 'how', and see leadership using the tool. Making the new way easier than the old way is critical.",
    },
  },
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "benchmarking",
    tracks: ["PROCUREMENT_EXCELLENCE"], bands: [2, 4],
    content: {
      stem: "When benchmarking procurement performance against peers, the most important consideration is:",
      options: [
        "Ensuring the peer companies are in the same country",
        "Comparing like-for-like by normalising for spend mix, industry, company size, and procurement scope definition",
        "Using the largest sample size possible regardless of comparability",
        "Focusing exclusively on cost savings as the comparison metric",
      ],
      correctAnswer: 1,
      explanation: "Benchmarking is only meaningful when comparing like-for-like. A company with 80% direct spend has fundamentally different metrics than one with 80% indirect. Normalising for scope, industry, and size prevents misleading comparisons.",
    },
  },
  {
    questionType: "MCQ", dimension: "PRACTICE", domainTag: "change-management",
    tracks: ["PROCUREMENT_EXCELLENCE"], bands: [4],
    content: {
      stem: "When rolling out a new category management methodology across the procurement team, the most effective approach is to:",
      options: [
        "Send a detailed methodology document to all buyers and expect compliance",
        "Run pilot categories with volunteer teams, demonstrate results, then scale with coaching and tailored training",
        "Mandate compliance and track adherence through weekly reports",
        "Hire external consultants to do all category strategies for the first year",
      ],
      correctAnswer: 1,
      explanation: "Pilots create proof points and internal champions. Scaling with coaching ensures adaptation to local context. A mandate without demonstrated value creates resistance; outsourcing builds no internal capability.",
    },
  },
  // --- OPEN TEXT ---
  {
    questionType: "OPEN_TEXT", dimension: "THEORY", domainTag: "performance-measurement",
    tracks: ["PROCUREMENT_EXCELLENCE"], bands: [2, 4],
    content: {
      stem: "Design a balanced procurement performance scorecard. Identify the key dimensions to measure, propose specific KPIs for each dimension, and explain how you would ensure the scorecard drives the right behaviours rather than just tracking numbers.",
      rubric: {
        criteria: [
          "Identifies balanced dimensions (financial impact, operational efficiency, risk management, stakeholder satisfaction, sustainability, capability)",
          "Proposes specific, measurable KPIs for each dimension",
          "Explains how KPIs connect to business outcomes, not just procurement activity",
          "Addresses the risk of perverse incentives (gaming metrics)",
          "Describes how the scorecard would be used in practice (reviews, decisions, improvement)",
        ],
        maxScore: 10,
      },
      guidanceWordCount: { min: 250, max: 500 },
    },
  },
  // --- SCENARIOS ---
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "data-analytics",
    tracks: ["PROCUREMENT_EXCELLENCE"], bands: [2],
    content: {
      stem: "How would you approach this spend analysis project? Describe your methodology, the insights you expect to find, and how you would present recommendations to leadership.",
      context: "You are a procurement excellence analyst at a multinational manufacturing company. The CPO asks you to conduct a comprehensive spend analysis for the first time. You have access to 3 years of accounts payable data from 2 different ERP systems (SAP for Europe and Oracle for North America). The data contains 1.2M transactions across 8,500 suppliers and EUR 800M annual spend. You discover that supplier naming is inconsistent (e.g., 'IBM', 'I.B.M.', 'IBM Corp', 'International Business Machines'), commodity codes are only populated for 40% of transactions, and 15% of spend has no purchase order. You have 4 weeks to deliver the analysis.",
      rubric: {
        criteria: [
          "Proposes a structured data cleansing approach (supplier name normalisation, spend classification, gap-filling)",
          "Describes a practical methodology for the 4-week timeline (data extract → cleanse → classify → analyse → present)",
          "Identifies expected analytical outputs (supplier consolidation opportunities, maverick spend, category segmentation)",
          "Plans how to present insights in a compelling, action-oriented way for leadership",
          "Acknowledges data limitations and proposes how to improve data quality going forward",
        ],
        maxScore: 10,
      },
    },
  },
  {
    questionType: "SCENARIO", dimension: "PRACTICE", domainTag: "process-improvement",
    tracks: ["PROCUREMENT_EXCELLENCE"], bands: [4],
    content: {
      stem: "As Procurement Excellence Manager, design and implement a transformation programme for this procure-to-pay process. Present your diagnostic, solution design, and implementation roadmap.",
      context: "You are the Procurement Excellence Manager at a global pharmaceutical company (EUR 6B revenue). The CFO has raised alarm: invoice processing takes an average of 28 days (target: 5 days), early payment discounts worth EUR 4M/year are being lost, 65% of invoices require manual intervention, suppliers are complaining about late payments affecting their cash flow, and the AP team of 45 FTEs is overwhelmed. Investigation reveals: 40% of POs are created after the invoice arrives (retrospective POs), goods receipts are often not entered for services, the approval matrix has 12 levels, there is no supplier portal for self-service, and the P2P system was implemented 8 years ago with minimal configuration since.",
      rubric: {
        criteria: [
          "Diagnoses root causes systematically (retrospective POs, goods receipt gaps, approval complexity)",
          "Proposes a comprehensive solution design (policy changes, process simplification, system configuration, automation)",
          "Quantifies the business case (early payment discounts, FTE productivity, supplier satisfaction, compliance)",
          "Designs an implementation roadmap with quick wins and phased improvements",
          "Addresses change management for both procurement and requisitioner communities",
          "Includes KPIs and governance for sustaining improvements",
        ],
        maxScore: 10,
      },
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-TRACK QUESTIONS (applicable to multiple tracks)
// ═══════════════════════════════════════════════════════════════════════════════

const CROSS_TRACK: QDef[] = [
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "compliance-ethics",
    tracks: ["DIRECT_PROCUREMENT", "INDIRECT_PROCUREMENT", "PUBLIC_PROCUREMENT", "SUPPLY_CHAIN"], bands: [1, 2, 3, 4, 5],
    content: {
      stem: "A supplier offers you a gift worth EUR 200 during a contract negotiation. According to standard procurement ethics codes, you should:",
      options: [
        "Accept it as it is below most gift thresholds",
        "Politely decline and report the offer to your compliance team, as gifts during active negotiations create conflicts of interest regardless of value",
        "Accept it and declare it to your manager after the negotiation",
        "Return it after the contract is signed",
      ],
      correctAnswer: 1,
      explanation: "Gifts during active negotiations are a red line in procurement ethics. Even if below a general gift threshold, the timing creates a perceived or actual conflict of interest. The offer should be declined and reported.",
    },
  },
  {
    questionType: "MCQ", dimension: "THEORY", domainTag: "sustainability",
    tracks: ["DIRECT_PROCUREMENT", "INDIRECT_PROCUREMENT", "PUBLIC_PROCUREMENT", "SUPPLY_CHAIN"], bands: [2, 3, 4, 5],
    content: {
      stem: "The EU Corporate Sustainability Due Diligence Directive (CSDDD) requires companies to:",
      options: [
        "Publish an annual sustainability report only",
        "Identify, prevent, mitigate, and account for human rights and environmental impacts in their own operations and value chains",
        "Carbon-offset all Scope 1 emissions by 2030",
        "Source 100% of materials from EU member states",
      ],
      correctAnswer: 1,
      explanation: "CSDDD mandates due diligence across the entire value chain — not just own operations. Companies must identify risks, take action to prevent/mitigate them, and be accountable. This fundamentally impacts supplier management and procurement practices.",
    },
  },
  {
    questionType: "RANKED_CHOICE", dimension: "PRACTICE", domainTag: "negotiation",
    tracks: ["DIRECT_PROCUREMENT", "INDIRECT_PROCUREMENT"], bands: [2, 3, 4, 5],
    content: {
      stem: "Rank the following negotiation preparation steps in the correct sequence (first to last):",
      options: [
        "Define your BATNA (Best Alternative to Negotiated Agreement)",
        "Analyse the supplier's cost structure and market position",
        "Set your target, walkaway, and opening positions",
        "Identify the interests and priorities of both parties",
      ],
      correctOrder: [1, 3, 0, 2],
      explanation: "Effective negotiation preparation follows: (1) Analyse — understand the supplier and market, (2) Identify interests — what each party truly needs, (3) Define BATNA — know your alternatives, (4) Set positions — targets, walkaway, and opening anchored in analysis.",
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SEED ROUTE
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_QUESTIONS: QDef[] = [...DIRECT, ...INDIRECT, ...PUBLIC, ...SUPPLY_CHAIN, ...EXCELLENCE, ...CROSS_TRACK];

export async function POST() {
  try {
    const session = await getSession();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch all active profiles indexed by track+band → profile ids
    const profiles = await prisma.jobProfile.findMany({
      where: { isActive: true },
      select: { id: true, track: true, band: true },
    });

    // Build lookup: "DIRECT_PROCUREMENT:3" → [profileId, profileId, ...]
    const profileMap = new Map<string, string[]>();
    for (const p of profiles) {
      const key = `${p.track}:${p.band}`;
      const arr = profileMap.get(key) ?? [];
      arr.push(p.id);
      profileMap.set(key, arr);
    }

    let questionsCreated = 0;
    let assignmentsCreated = 0;

    for (const qdef of ALL_QUESTIONS) {
      // Collect all profile IDs that should receive this question
      const assignments: { profileId: string; weight: number; target: string }[] = [];

      for (const track of qdef.tracks) {
        for (const band of qdef.bands) {
          const key = `${track}:${band}`;
          const profileIds = profileMap.get(key) ?? [];
          for (const pid of profileIds) {
            assignments.push({
              profileId: pid,
              weight: WEIGHT[band] ?? 1.5,
              target: TARGET[band] ?? "P",
            });
          }
        }
      }

      if (assignments.length === 0) continue; // No matching profiles, skip

      // Create the question with profile assignments in a transaction
      await prisma.$transaction(async (tx) => {
        const question = await tx.question.create({
          data: {
            language: "en",
            questionType: qdef.questionType,
            dimension: qdef.dimension,
            domainTag: qdef.domainTag,
            difficultyWeight: 1.5,
            content: qdef.content as any,
            variantGroupId: qdef.variantGroupId ?? null,
            isActive: true,
            profiles: {
              create: assignments.map((a) => ({
                profileId: a.profileId,
                difficultyWeight: a.weight,
                proficiencyTarget: a.target,
              })),
            },
          },
        });
        questionsCreated++;
        assignmentsCreated += assignments.length;
      });
    }

    return NextResponse.json({
      success: true,
      questionsCreated,
      assignmentsCreated,
      profilesFound: profiles.length,
    });
  } catch (error: any) {
    console.error("Question seed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
