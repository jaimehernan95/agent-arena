export interface MissionQuestion {
  id: string;
  text: string;
  targetRubric: string;
}

export interface MissionTrack {
  id: string;
  title: string;
  shortTitle: string;
  subtitle: string;
  iconName: "Cpu" | "Briefcase" | "ShieldAlert" | "Rocket" | "Sparkles";
  accentColor: "cyan" | "indigo" | "emerald" | "amber" | "rose";
  rubricHint: string;
  questions: MissionQuestion[];
}

export const MISSION_TRACKS: MissionTrack[] = [
  {
    id: "eng-ai",
    title: "Engineering & AI Architect",
    shortTitle: "AI & Engineering",
    subtitle: "High-scale systems, latency, resiliency & tradeoffs",
    iconName: "Cpu",
    accentColor: "cyan",
    rubricHint: "TARGET: STAR FORMAT | LATENCY & INCIDENT METRICS",
    questions: [
      {
        id: "eng-1",
        text: "Describe how you diagnosed and resolved a high-severity production outage.",
        targetRubric: "TARGET: STAR FORMAT | LATENCY & INCIDENT METRICS",
      },
      {
        id: "eng-2",
        text: "How did you design a resilient architecture balancing sub-second latency against cloud cost?",
        targetRubric: "TARGET: ARCHITECTURE TRADEOFFS | COST-LATENCY EQUILIBRIUM",
      },
      {
        id: "eng-3",
        text: "Explain a complex distributed systems tradeoff to a non-technical stakeholder.",
        targetRubric: "TARGET: STAKEHOLDER CLARITY | BUSINESS VALUE & CONSTRAINTS",
      },
    ],
  },
  {
    id: "pm-ops",
    title: "Product & Operations Manager",
    shortTitle: "Product & Ops",
    subtitle: "Cross-functional roadmap, sprint steering & metrics",
    iconName: "Briefcase",
    accentColor: "indigo",
    rubricHint: "TARGET: STAKEHOLDER ALIGNMENT | ROADMAP IMPACT",
    questions: [
      {
        id: "pm-1",
        text: "Tell me about a time a key feature missed its deadline and how you steered the team to delivery.",
        targetRubric: "TARGET: DEADLINE STEERING | SCOPE CONTROL & REALIGNMENT",
      },
      {
        id: "pm-2",
        text: "How do you resolve conflicting roadmap priorities between Sales, Engineering, and Compliance?",
        targetRubric: "TARGET: PRIORITY WEIGHTING | CROSS-FUNCTIONAL CONSENSUS",
      },
      {
        id: "pm-3",
        text: "Describe an initiative where data analytics changed your product strategy.",
        targetRubric: "TARGET: DATA-DRIVEN INFLECTION | MEASURABLE OUTCOMES",
      },
    ],
  },
  {
    id: "risk-fin",
    title: "Insurance & Financial Analyst (P&C / Risk Management)",
    shortTitle: "Insurance & Finance",
    subtitle: "Underwriting, financial recalculations & compliance",
    iconName: "ShieldAlert",
    accentColor: "emerald",
    rubricHint: "TARGET: RISK MITIGATION | FINANCIAL & REGULATORY AUDIT",
    questions: [
      {
        id: "fin-1",
        text: "How do you evaluate risk exposure when underwriting or reviewing policy changes under uncertainty?",
        targetRubric: "TARGET: RISK EXPOSURE | ACTUARIAL CERTAINTY & LOSS RATIOS",
      },
      {
        id: "fin-2",
        text: "Describe a scenario where preventing customer portal modification errors protected backend financial recalculations.",
        targetRubric: "TARGET: RECALCULATION INTEGRITY | LEDGER ACCURACY & AUDITING",
      },
      {
        id: "fin-3",
        text: "Walk me through how you communicate regulatory compliance adjustments to customer service teams.",
        targetRubric: "TARGET: REGULATORY ACCURACY | SERVICE PLAYBOOK COMPLIANCE",
      },
    ],
  },
  {
    id: "exec-pitch",
    title: "Executive & Public Speaking Pitch",
    shortTitle: "Executive Pitch",
    subtitle: "VC pitching, competitive moats & storytelling",
    iconName: "Rocket",
    accentColor: "amber",
    rubricHint: "TARGET: VALUE PROPOSITION | MARKET MOAT & CONVICTION",
    questions: [
      {
        id: "exec-1",
        text: "Deliver your 60-second elevator pitch for a venture capital or stakeholder board.",
        targetRubric: "TARGET: VALUE PROPOSITION | UNIT ECONOMICS & CONVICTION",
      },
      {
        id: "exec-2",
        text: "Explain why your multi-agent architecture provides a durable competitive advantage.",
        targetRubric: "TARGET: ARCHITECTURAL MOAT | DEFENSIVE NETWORK EFFECTS",
      },
    ],
  },
  {
    id: "custom",
    title: "Custom Mission",
    shortTitle: "Custom Simulation",
    subtitle: "Define custom role and tailored interview question",
    iconName: "Sparkles",
    accentColor: "rose",
    rubricHint: "TARGET: CUSTOM EVALUATION | DOMAIN RELEVANCE",
    questions: [
      {
        id: "custom-default",
        text: "Explain why your approach uniquely solves the organization's core challenge.",
        targetRubric: "TARGET: CUSTOM EVALUATION | DOMAIN RELEVANCE",
      },
    ],
  },
];
