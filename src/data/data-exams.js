/* Exam blueprints — Anthropic Claude Certification Program.
 *
 * Source: the official Anthropic exam guides, downloaded from the Partner Academy
 * certifications page and read directly:
 *   anthropic-partners.skilljar.com/page/partner-certifications
 * All four verified line-by-line against their official Exam Guide v1.0
 * (July 2026) on 2026-10-27: blueprint, weights, item counts, fees, domain
 * numbering and task objectives.
 *
 * No exam has prerequisites. Each guide states: "There are no mandatory
 * prerequisites or courses required to sit this exam." Eligibility is
 * organizational — you must work at a Claude Partner Network member.
 *
 * Listed in EXAM_ORDER; the app treats all four equally. Notes and flashcards
 * currently cover CCAR-F and CCDV-F because those were built out first.
 *
 * All four exams: 120 minutes, scaled 100-1000, 720 to pass, 12-month validity.
 *
 * NOTE: Pearson VUE states exams update 2026-12-07, with refreshed guides due
 * 2026-11-17. Re-verify before sitting an exam after that date.
 */
const EXAMS = {
  "CCAR-F": {
    code: "CCAR-F",
    level: 2,
    levelName: "Practitioner",
    experience: "6+ months Claude across API, Agent SDK, Code, MCP",
    name: "Claude Certified Architect",
    tier: "Foundations",
    track: "architect",
    questions: 60,
    minutes: 120,
    pass: 720,
    fee: "$125 USD",
    blurb: "Architectural judgment for engineers designing Claude-powered agentic systems.",
    audience: "~6 months hands-on Claude experience recommended.",
    structure: "4 scenarios drawn from a bank of 6",
    /* How the Exam Simulation builds a paper. "scenario" draws `blocks`
       scenarios and asks `perBlock` questions on each, as the real CCAR-F
       sitting does. sim.js falls back to exactly these values for an exam
       with no sim block, so they are also the default. */
    sim: { mode: "scenario", blocks: 4, perBlock: 15, minutes: 120, multi: false },
    domains: [
      { id: "d1", num: 1, name: "Agentic Architecture & Orchestration", weight: 27 },
      { id: "d2", num: 2, name: "Tool Design & MCP Integration",        weight: 18 },
      { id: "d3", num: 3, name: "Claude Code Configuration & Workflows", weight: 20 },
      { id: "d4", num: 4, name: "Prompt Engineering & Structured Output", weight: 20 },
      { id: "d5", num: 5, name: "Context Management & Reliability",      weight: 15 }
    ],
    // The six scenarios the exam draws from, named in the official guide.
    // id is used to tag questions that genuinely belong to a scenario; the
    // guide names the scenarios but does not map questions to them, so the
    // tagging is ours and a question without one shows no heading.
    // `ctx` is the scenario briefing shown at the head of a simulation block,
    // in the second person the real exam uses. The Structured Data Extraction
    // briefing arrived with the handoff data and is carried on those
    // questions; the other five are written here from what their questions
    // actually test, so every block opens with the same framing.
    scenarios: [
      { id:"support", t: "Customer Support Resolution Agent", d: ["d1","d2","d5"],
        ctx: "You are building a customer support agent on Claude. It resolves "
           + "billing, account and order issues end to end, calling internal "
           + "tools for customer records, refunds and order status, and escalates "
           + "to a human when it should. Conversations run long, so it must hold "
           + "exact case details across many turns, recover from tool failures "
           + "without losing the thread, and never present a failure as a result." },
      { id:"codegen", t: "Code Generation with Claude Code",  d: ["d3","d5"],
        ctx: "You are rolling out Claude Code for feature work across a large "
           + "codebase. Engineers use it to explore unfamiliar services, generate "
           + "code and tests, and carry out multi-file refactors. The team needs "
           + "its conventions followed without restating them every session, "
           + "risky changes gated rather than trusted, and exploration that stays "
           + "within a context budget." },
      { id:"research", t: "Multi-Agent Research System",      d: ["d1","d2","d5"],
        ctx: "You are building a multi-agent research system on Claude. A "
           + "coordinator decomposes a question into subtasks, dispatches "
           + "subagents to gather and analyse sources in parallel, and "
           + "synthesises what they return into one report. It must delegate with "
           + "complete handoffs, keep each subagent inside its role, preserve "
           + "source-level uncertainty, and survive an interrupted run." },
      { id:"devprod", t: "Developer Productivity with Claude", d: ["d2","d3","d1"],
        ctx: "You are improving how a development team works with Claude day to "
           + "day. The work covers shared configuration everyone gets on clone, "
           + "MCP servers exposing internal systems, skills and commands for "
           + "repeatable tasks, and credentials that stay out of the repository. "
           + "Setups must not drift between developers." },
      { id:"ci", t: "Claude Code for Continuous Integration", d: ["d3","d4"],
        ctx: "You are running Claude Code inside a CI/CD pipeline. It reviews "
           + "pull requests, generates tests and produces output other jobs "
           + "parse. No human is present to answer a prompt or catch an overreach, "
           + "so runs must finish on their own, stay inside a cost and turn "
           + "budget, hold to the permissions the job was given, and emit output "
           + "a script can rely on." },
      { id:"extract", t: "Structured Data Extraction",        d: ["d4","d5"],
        ctx: "You are building a structured data extraction system using Claude. "
           + "It extracts information from unstructured business documents such "
           + "as invoices, contracts, receipts, shipping paperwork and claim "
           + "forms, validates the output against JSON schemas, and feeds "
           + "downstream systems including an ERP and accounts payable. It must "
           + "maintain high accuracy, handle edge cases gracefully and integrate "
           + "cleanly with downstream systems." }
    ]
  },
  "CCDV-F": {
    code: "CCDV-F",
    level: 2,
    levelName: "Practitioner",
    experience: "1-5 yrs software engineering · 6+ months Claude",
    name: "Claude Certified Developer",
    tier: "Foundations",
    track: "developer",
    questions: 53,
    minutes: 120,
    pass: 720,
    fee: "$125 USD",
    blurb: "Build production-grade applications and make real-world engineering decisions.",
    audience: "AI engineers / software developers, 1-5 yrs experience, 6+ months with Claude.",
    /* CCDV-F names no scenarios, so a paper is drawn by domain quota: each
       domain's weight times `items`, rounded by largest remainder. */
    sim: { mode: "domain", items: 53, minutes: 120, multi: true,
           // Guide v1.0 says 53. A prep site reports 70 items (60 scored) from
           // 2026-12-07. Change this one number if the official guide confirms it.
           itemsNote: "Guide v1.0 (July 2026): 53 items" },
    // Numbered to match the official guide's domain order, which is not by weight.
    // The id strings are internal keys and intentionally stable — v1 has always
    // meant Applications and Integration in the question bank.
    domains: [
      { id: "v3", num: 1, name: "Agents and Workflows",            weight: 14.7 },
      { id: "v1", num: 2, name: "Applications and Integration",    weight: 33.1 },
      { id: "v7", num: 3, name: "Claude Code",                     weight: 3.1 },
      { id: "v8", num: 4, name: "Eval, Testing, and Debugging",    weight: 2.6 },
      { id: "v2", num: 5, name: "Model Selection and Optimization", weight: 16.8 },
      { id: "v4", num: 6, name: "Prompt and Context Engineering",  weight: 11.0 },
      { id: "v6", num: 7, name: "Security and Safety",             weight: 8.1 },
      { id: "v5", num: 8, name: "Tools and MCPs",                  weight: 10.6 }
    ]
  },
  "CCAR-P": {
    code: "CCAR-P",
    level: 3,
    levelName: "Senior",
    experience: "3+ yrs systems architecture · Claude in production",
    name: "Claude Certified Architect",
    tier: "Professional",
    track: "architect",
    questions: 63,
    minutes: 120,
    pass: 720,
    fee: "$175 USD",
    blurb: "Design and govern production-grade Claude systems end-to-end.",
    audience: "Solution architects and senior engineers. 3+ yrs systems architecture, 6+ months with Claude in production. No prerequisite certification.",
    domains: [
      { id: "p2", num: 1, name: "Solution Design & Architecture",                weight: 17 },
      { id: "p6", num: 2, name: "Claude Models, Prompting & Context Engineering", weight: 13 },
      { id: "p1", num: 3, name: "Integration",                                    weight: 19 },
      { id: "p3", num: 4, name: "Evaluation, Testing & Optimization",             weight: 16 },
      { id: "p4", num: 5, name: "Governance, Safety & Risk Management",           weight: 14 },
      { id: "p5", num: 6, name: "Stakeholder Communication & Lifecycle Management", weight: 14 },
      { id: "p7", num: 7, name: "Developer Productivity & Operational Enablement", weight: 7 }
    ]
  },
  "CCAO-F": {
    code: "CCAO-F",
    level: 1,
    levelName: "Entry",
    experience: "No experience required",
    name: "Claude Certified Associate",
    tier: "Foundations",
    track: "associate",
    questions: 60,
    minutes: 120,
    pass: 720,
    fee: "$99 USD",
    blurb: "Operate Claude professionally; turn business problems into dependable workflows.",
    audience: "Practitioners using Claude as a daily productivity tool. No prerequisites.",
    domains: [
      { id: "a4", num: 1, name: "Prompting and Task Execution",            weight: 14 },
      { id: "a1", num: 2, name: "Output Evaluation and Validation",        weight: 21 },
      { id: "a5", num: 3, name: "Product and Model Selection",             weight: 12 },
      { id: "a2", num: 4, name: "Workflow Integration and Solution Design", weight: 16 },
      { id: "a6", num: 5, name: "Configuration and Knowledge Management",  weight: 12 },
      { id: "a3", num: 6, name: "Governance, Risk, and Responsible Use",   weight: 15 },
      { id: "a7", num: 7, name: "Troubleshooting and Optimization",        weight: 10 }
    ]
  }
};

/* Ordered by the experience each guide recommends — Associate needs none,
 * Professional asks for 3+ years of systems architecture. This is a readiness
 * progression, NOT a prerequisite chain: every guide states there are no
 * mandatory prerequisites and any exam can be taken in any order. */
const EXAM_ORDER = ["CCAO-F", "CCDV-F", "CCAR-F", "CCAR-P"];
